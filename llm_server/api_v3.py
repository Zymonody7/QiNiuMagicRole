#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
api2.py 基础上增加 /tts 接口：
POST {"role":"宁采臣","content":"要说的文本"} -> audio/wav
角色配置放在 roles.json
"""
import argparse
import json
import os
import re
import signal
import sys
import time
import traceback
from io import BytesIO
from typing import Dict

import librosa
import numpy as np
import soundfile as sf
import torch
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# ========== 以下全部复用 api2.py 的原始逻辑 ==========
root_dir = os.getcwd()
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, "GPT_SoVITS"))

from GPT_SoVITS.AR.models.t2s_lightning_module import Text2SemanticLightningModule
from GPT_SoVITS.feature_extractor import cnhubert
from GPT_SoVITS.module.mel_processing import spectrogram_torch
from GPT_SoVITS.module.models import SynthesizerTrn
from GPT_SoVITS.text import cleaned_text_to_sequence
from GPT_SoVITS.text.cleaner import clean_text
from tools.my_utils import load_audio
from transformers import AutoModelForMaskedLM, AutoTokenizer
from time import time as ttime

# ---------- 命令行参数 ----------
parser = argparse.ArgumentParser(description="GPT-SoVITS role api")
parser.add_argument("-a", "--bind_addr", type=str, default="127.0.0.1")
parser.add_argument("-p", "--port", type=int, default=9880)
parser.add_argument("-s", "--sovits_path", type=str,
                    default="GPT_SoVITS/pretrained_models/s2G488k.pth")
parser.add_argument("-g", "--gpt_path", type=str,
                    default="GPT_SoVITS/pretrained_models/s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt")
parser.add_argument("-d", "--device", type=str, default="cuda")
parser.add_argument("-c", "--cut", type=int, default=5)
parser.add_argument("-hb", "--hubert_path", type=str,
                    default='GPT_SoVITS/pretrained_models/chinese-hubert-base')
parser.add_argument("-b", "--bert_path", type=str,
                    default='GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large')
parser.add_argument("-r", "--role_db", type=str, default="roles.json",
                    help="角色数据库 json 路径")
args = parser.parse_args()

# ---------- 全局变量 ----------
device = args.device
is_half = False  # 与 api2.py 保持一致，可手动改
cut_method = args.cut
splits = {"，", "。", "？", "！", ",", ".", "?", "!", "~", ":", "：", "—", "…"}

# 加载角色数据库
ROLE_DB: Dict[str, dict] = {}
def load_role_db():
    global ROLE_DB
    if not os.path.exists(args.role_db):
        print(f"[WARN] {args.role_db} 不存在，请先创建！")
        ROLE_DB = {}
        return
    with open(args.role_db, "r", encoding="utf-8") as f:
        ROLE_DB = json.load(f)
    print(f"[INFO] 成功加载角色数据库，共 {len(ROLE_DB)} 个角色")

load_role_db()

# ---------- 模型初始化（完全复用 api2.py） ----------
tokenizer = AutoTokenizer.from_pretrained(args.bert_path)
bert_model = AutoModelForMaskedLM.from_pretrained(args.bert_path)
bert_model = bert_model.to(device)
if is_half:
    bert_model = bert_model.half()

ssl_model = cnhubert.get_model()
ssl_model = ssl_model.to(device)
if is_half:
    ssl_model = ssl_model.half()

# 加载 SoVITS
dict_s2 = torch.load(args.sovits_path, map_location="cpu")
hps = dict_s2["config"]
hps = DictToAttrRecursive(hps)
hps.model.semantic_frame_rate = "25hz"
vq_model = SynthesizerTrn(
    hps.data.filter_length // 2 + 1,
    hps.train.segment_size // hps.data.hop_length,
    n_speakers=hps.data.n_speakers,
    **hps.model
)
if "pretrained" not in args.sovits_path:
    del vq_model.enc_q
vq_model = vq_model.to(device)
if is_half:
    vq_model = vq_model.half()
vq_model.eval()
vq_model.load_state_dict(dict_s2["weight"], strict=False)

# 加载 GPT
hz = 50
dict_s1 = torch.load(args.gpt_path, map_location="cpu")
config = dict_s1["config"]
max_sec = config["data"]["max_sec"]
t2s_model = Text2SemanticLightningModule(config, "****", is_train=False)
t2s_model.load_state_dict(dict_s1["weight"])
t2s_model = t2s_model.to(device)
if is_half:
    t2s_model = t2s_model.half()
t2s_model.eval()

# ---------- 工具函数（全部来自 api2.py，仅复制必要部分） ----------
class DictToAttrRecursive(dict):
    def __init__(self, input_dict):
        super().__init__(input_dict)
        for key, value in input_dict.items():
            if isinstance(value, dict):
                value = DictToAttrRecursive(value)
            self[key] = value
            setattr(self, key, value)

def get_bert_feature(text, word2ph):
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt")
        for i in inputs:
            inputs[i] = inputs[i].to(device)
        res = bert_model(**inputs, output_hidden_states=True)
        res = torch.cat(res["hidden_states"][-3:-2], -1)[0].cpu()[1:-1]
    assert len(word2ph) == len(text)
    phone_level_feature = []
    for i in range(len(word2ph)):
        repeat_feature = res[i].repeat(word2ph[i], 1)
        phone_level_feature.append(repeat_feature)
    phone_level_feature = torch.cat(phone_level_feature, dim=0)
    return phone_level_feature.T

def get_spepc(hps, filename):
    audio = load_audio(filename, int(hps.data.sampling_rate))
    audio = torch.FloatTensor(audio)
    audio_norm = audio
    audio_norm = audio_norm.unsqueeze(0)
    spec = spectrogram_torch(
        audio_norm,
        hps.data.filter_length,
        hps.data.sampling_rate,
        hps.data.hop_length,
        hps.data.win_length,
        center=False,
    )
    return spec

def clean_text_inf(text, language):
    formattext = ""
    for tmp in LangSegment.getTexts(text):
        if tmp["lang"] == language:
            formattext += tmp["text"] + " "
    while "  " in formattext:
        formattext = formattext.replace("  ", " ")
    phones, word2ph, norm_text = clean_text(formattext, language)
    phones = cleaned_text_to_sequence(phones)
    return phones, word2ph, norm_text

def get_bert_final(phones, word2ph, text, language):
    if language == "zh":
        bert = get_bert_feature(text, word2ph).to(device)
    else:
        bert = torch.zeros((1024, len(phones))).to(device)
    return bert

def merge_short_text_in_array(texts, threshold):
    if len(texts) < 2:
        return texts
    result = []
    text = ""
    for ele in texts:
        text += ele
        if len(text) >= threshold:
            result.append(text)
            text = ""
    if text:
        if not result:
            result.append(text)
        else:
            result[-1] += text
    return result

# ---------- 核心推理函数（几乎与 api2.py 相同） ----------
def get_tts_wav(ref_wav_path, prompt_text, prompt_language, text, text_language):
    text += '.'
    if prompt_text is None or len(prompt_text) == 0:
        ref_free = True
    else:
        ref_free = False
    t0 = ttime()
    if not ref_free:
        prompt_text = prompt_text.strip("\n")
        if prompt_text[-1] not in splits:
            prompt_text += "。" if prompt_language != "en" else "."
    text = text.strip("\n")
    for t in splits:
        text = text if not re.search(fr'\{t}', text) else re.sub(fr'\{t}+', t, text)
    if text[0] not in splits and len(re.split("[" + "".join(re.escape(s) for s in splits) + "]", text)[0]) < 4:
        text = "。" + text if text_language != "en" else "." + text
    if len(text) < 4:
        raise ValueError("有效文字数太少，至少输入4个字符")
    zero_wav = np.zeros(int(hps.data.sampling_rate * 0.3), dtype=np.float16 if is_half else np.float32)
    with torch.no_grad():
        wav16k, sr = librosa.load(ref_wav_path, sr=16000)
        if wav16k.shape[0] < 48000 or wav16k.shape[0] > 160000:
            raise OSError("参考音频需在 3~10 秒范围内")
        wav16k = torch.from_numpy(wav16k)
        zero_wav_torch = torch.from_numpy(zero_wav)
        if is_half:
            wav16k = wav16k.half().to(device)
            zero_wav_torch = zero_wav_torch.half().to(device)
        else:
            wav16k = wav16k.to(device)
            zero_wav_torch = zero_wav_torch.to(device)
        wav16k = torch.cat([wav16k, zero_wav_torch])
        ssl_content = ssl_model.model(wav16k.unsqueeze(0))["last_hidden_state"].transpose(1, 2)
        codes = vq_model.extract_latent(ssl_content)
        prompt_semantic = codes[0, 0]
    t1 = ttime()

    # 切句
    def cut5(inp):
        inp = inp.strip("\n")
        punds = r'[,.;?!、，。？！;：]'
        items = re.split(f'({punds})', inp)
        items = ["".join(group) for group in zip(items[::2], items[1::2])]
        return "\n".join(items)

    if cut_method == 5:
        text = cut5(text)
    texts = text.split("\n")
    texts = merge_short_text_in_array(texts, 5)
    audio_opt = []
    if not ref_free:
        phones1, word2ph1, norm_text1 = clean_text_inf(prompt_text, prompt_language)
        bert1 = get_bert_final(phones1, word2ph1, norm_text1, prompt_language).to(torch.float16 if is_half else torch.float32)
    for text in texts:
        if len(text.strip()) == 0:
            continue
        if text[-1] not in splits:
            text += "。" if text_language != "en" else "."
        phones2, word2ph2, norm_text2 = clean_text_inf(text, text_language)
        bert2 = get_bert_final(phones2, word2ph2, norm_text2, text_language).to(torch.float16 if is_half else torch.float32)
        if not ref_free:
            bert = torch.cat([bert1, bert2], 1)
            all_phoneme_ids = torch.LongTensor(phones1 + phones2).to(device).unsqueeze(0)
        else:
            bert = bert2
            all_phoneme_ids = torch.LongTensor(phones2).to(device).unsqueeze(0)
        bert = bert.to(device).unsqueeze(0)
        all_phoneme_len = torch.tensor([all_phoneme_ids.shape[-1]]).to(device)
        prompt = prompt_semantic.unsqueeze(0).to(device)
        t2 = ttime()
        with torch.no_grad():
            pred_semantic, idx = t2s_model.model.infer_panel(
                all_phoneme_ids,
                all_phoneme_len,
                None if ref_free else prompt,
                bert,
                top_k=5,
                top_p=1,
                temperature=1,
                early_stop_num=hz * max_sec,
            )
        t3 = ttime()
        pred_semantic = pred_semantic[:, -idx:].unsqueeze(0)
        refer = get_spepc(hps, ref_wav_path)
        if is_half:
            refer = refer.half().to(device)
        else:
            refer = refer.to(device)
        audio = vq_model.decode(pred_semantic, torch.LongTensor(phones2).to(device).unsqueeze(0), refer).detach().cpu().numpy()[0, 0]
        max_audio = np.abs(audio).max()
        if max_audio > 1:
            audio /= max_audio
        audio_opt.append(audio)
        audio_opt.append(zero_wav)
        t4 = ttime()
    print("推理时间：%.3f %.3f %.3f %.3f" % (t1 - t0, t2 - t1, t3 - t2, t4 - t3))
    yield hps.data.sampling_rate, (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)

# ---------- FastAPI 部分 ----------
app = FastAPI()

class TTSReq(BaseModel):
    role: str
    content: str

@app.post("/tts")
async def tts_role(req: TTSReq):
    role_info = ROLE_DB.get(req.role)
    if not role_info:
        return JSONResponse(status_code=400, content={"message": f"角色 '{req.role}' 不存在"})
    ref_wav_path = role_info["wav"]
    prompt_text = role_info["prompt"]
    prompt_language = role_info["lang"]
    text = req.content
    text_language = prompt_language  # 用角色语言作为合成语言，可改成参数

    if not os.path.exists(ref_wav_path):
        return JSONResponse(status_code=400, content={"message": f"参考音频不存在：{ref_wav_path}"})

    try:
        gen = get_tts_wav(ref_wav_path, prompt_text, prompt_language, text, text_language)
        sr, audio = next(gen)
        wav_buf = BytesIO()
        sf.write(wav_buf, audio, sr, format="wav")
        wav_buf.seek(0)
        return StreamingResponse(wav_buf, media_type="audio/wav")
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"message": str(e)})

# ---------- 启动 ----------
if __name__ == "__main__":
    uvicorn.run(app, host=args.bind_addr, port=args.port, workers=1)