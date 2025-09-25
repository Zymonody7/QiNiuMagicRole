# api_with_role.py
# 在 api_v2.py 基础上增加“角色”概念
# 用法：python api_with_role.py -a 0.0.0.0 -p 9880

import os
import sys
import traceback
import sqlite3
import shutil
import uuid
from typing import Generator
from pathlib import Path

now_dir = os.getcwd()
sys.path.append(now_dir)
sys.path.append(os.path.join(now_dir, "GPT_SoVITS"))

import argparse
import asyncio
import aiofiles
from fastapi import FastAPI, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn
from io import BytesIO
import numpy as np
import soundfile as sf
import subprocess
import wave
import signal

from tools.i18n.i18n import I18nAuto
from GPT_SoVITS.TTS_infer_pack.TTS import TTS, TTS_Config
from GPT_SoVITS.TTS_infer_pack.text_segmentation_method import get_method_names as get_cut_method_names
from pydantic import BaseModel
i18n = I18nAuto()
cut_method_names = get_cut_method_names()

# -------------------- 命令行参数 --------------------
parser = argparse.ArgumentParser(description="GPT-SoVITS api with role")
parser.add_argument("-c", "--tts_config", type=str, default="GPT_SoVITS/configs/tts_infer.yaml")
parser.add_argument("-a", "--bind_addr", type=str, default="127.0.0.1")
parser.add_argument("-p", "--port", type=int, default=9880)
args = parser.parse_args()
config_path = args.tts_config
host = args.bind_addr
port = args.port

# -------------------- TTS 初始化 --------------------
tts_config = TTS_Config(config_path)
tts_pipeline = TTS(tts_config)

# -------------------- 数据库初始化 --------------------
DB_FILE = "role.db"

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

with get_db() as conn:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS role (
            name TEXT PRIMARY KEY,
            ref_audio_path TEXT NOT NULL,
            prompt_text TEXT NOT NULL,
            prompt_lang TEXT NOT NULL
        )
    """)
    conn.commit()

# -------------------- 工具：音频保存 --------------------
UPLOAD_DIR = Path("uploaded_ref_audios")
UPLOAD_DIR.mkdir(exist_ok=True)

async def save_upload_file(upload_file: UploadFile) -> str:
    suffix = Path(upload_file.filename).suffix
    save_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    async with aiofiles.open(save_path, "wb") as f:
        await f.write(await upload_file.read())
    return str(save_path)

def scan_and_register_roles():
    ref_dir = Path("GPT_SoVITS/pretrained_models/ref_audios")
    if not ref_dir.exists():
        return
    with get_db() as conn:
        for wav in ref_dir.glob("*.wav"):
            role_name = wav.stem
            exist = conn.execute("SELECT 1 FROM role WHERE name=?", (role_name,)).fetchone()
            if exist:
                continue
            conn.execute(
                "INSERT INTO role(name, ref_audio_path, prompt_text, prompt_lang) VALUES (?,?,?,?)",
                (role_name, str(wav), "", "zh")
            )
        conn.commit()

scan_and_register_roles()

# -------------------- FastAPI --------------------
APP = FastAPI()

# -------------------- 打包音频函数 --------------------
def pack_ogg(io_buffer: BytesIO, data: np.ndarray, rate: int):
    with sf.SoundFile(io_buffer, mode="w", samplerate=rate, channels=1, format="ogg") as f:
        f.write(data)
    return io_buffer

def pack_raw(io_buffer: BytesIO, data: np.ndarray, rate: int):
    io_buffer.write(data.tobytes())
    return io_buffer

def pack_wav(io_buffer: BytesIO, data: np.ndarray, rate: int):
    sf.write(io_buffer, data, rate, format="wav")
    return io_buffer

def pack_aac(io_buffer: BytesIO, data: np.ndarray, rate: int):
    proc = subprocess.Popen([
        "ffmpeg", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
        "-c:a", "aac", "-b:a", "192k", "-vn", "-f", "adts", "pipe:1"
    ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, _ = proc.communicate(input=data.tobytes())
    io_buffer.write(out)
    return io_buffer

def pack_audio(io_buffer: BytesIO, data: np.ndarray, rate: int, media_type: str):
    if media_type == "ogg":
        io_buffer = pack_ogg(io_buffer, data, rate)
    elif media_type == "aac":
        io_buffer = pack_aac(io_buffer, data, rate)
    elif media_type == "wav":
        io_buffer = pack_wav(io_buffer, data, rate)
    else:
        io_buffer = pack_raw(io_buffer, data, rate)
    io_buffer.seek(0)
    return io_buffer

def wave_header_chunk(frame_input=b"", channels=1, sample_width=2, sample_rate=32000):
    wav_buf = BytesIO()
    with wave.open(wav_buf, "wb") as vfout:
        vfout.setnchannels(channels)
        vfout.setsampwidth(sample_width)
        vfout.setframerate(sample_rate)
        vfout.writeframes(frame_input)
    wav_buf.seek(0)
    return wav_buf.read()

# -------------------- 角色 TTS 统一 handler --------------------
async def tts_role_handle(role: str, content: str, text_lang: str = "zh", **extra_kwargs):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM role WHERE name=?", (role,)).fetchone()
    if not row:
        return JSONResponse(status_code=400, content={"message": f"role '{role}' not found"})

    req = {
        "text": content,
        "text_lang": text_lang.lower(),
        "ref_audio_path": row["ref_audio_path"],
        "prompt_text": row["prompt_text"],
        "prompt_lang": row["prompt_lang"].lower(),
        **extra_kwargs
    }
    # 其余参数用默认值，允许调用方通过 query/post 再传
    return await tts_handle(req)

# -------------------- 原 /tts 逻辑，保持不变 --------------------
class TTS_Request(BaseModel):
    text: str = None
    text_lang: str = None
    ref_audio_path: str = None
    aux_ref_audio_paths: list = None
    prompt_lang: str = None
    prompt_text: str = ""
    top_k: int = 5
    top_p: float = 1
    temperature: float = 1
    text_split_method: str = "cut5"
    batch_size: int = 1
    batch_threshold: float = 0.75
    split_bucket: bool = True
    speed_factor: float = 1.0
    fragment_interval: float = 0.3
    seed: int = -1
    media_type: str = "wav"
    streaming_mode: bool = False
    parallel_infer: bool = True
    repetition_penalty: float = 1.35
    sample_steps: int = 32
    super_sampling: bool = False

def check_params(req: dict):
    text: str = req.get("text", "")
    text_lang: str = req.get("text_lang", "")
    ref_audio_path: str = req.get("ref_audio_path", "")
    streaming_mode: bool = req.get("streaming_mode", False)
    media_type: str = req.get("media_type", "wav")
    prompt_lang: str = req.get("prompt_lang", "")
    text_split_method: str = req.get("text_split_method", "cut5")

    if not ref_audio_path:
        return JSONResponse(status_code=400, content={"message": "ref_audio_path is required"})
    if not text:
        return JSONResponse(status_code=400, content={"message": "text is required"})
    if not text_lang:
        return JSONResponse(status_code=400, content={"message": "text_lang is required"})
    if text_lang.lower() not in tts_config.languages:
        return JSONResponse(status_code=400, content={"message": f"text_lang {text_lang} not supported"})
    if not prompt_lang:
        return JSONResponse(status_code=400, content={"message": "prompt_lang is required"})
    if prompt_lang.lower() not in tts_config.languages:
        return JSONResponse(status_code=400, content={"message": f"prompt_lang {prompt_lang} not supported"})
    if media_type not in ["wav", "raw", "ogg", "aac"]:
        return JSONResponse(status_code=400, content={"message": f"media_type {media_type} not supported"})
    if media_type == "ogg" and not streaming_mode:
        return JSONResponse(status_code=400, content={"message": "ogg only supported in streaming mode"})
    if text_split_method not in cut_method_names:
        return JSONResponse(status_code=400, content={"message": f"text_split_method {text_split_method} not supported"})
    return None

async def tts_handle(req: dict):
    streaming_mode = req.get("streaming_mode", False)
    media_type = req.get("media_type", "wav")

    check_res = check_params(req)
    if check_res:
        return check_res

    try:
        tts_generator = tts_pipeline.run(req)
        if streaming_mode:
            def streaming_generator(tts_generator: Generator, media_type: str):
                first = True
                for sr, chunk in tts_generator:
                    if first and media_type == "wav":
                        yield wave_header_chunk(sample_rate=sr)
                        media_type = "raw"
                        first = False
                    yield pack_audio(BytesIO(), chunk, sr, media_type).getvalue()
            return StreamingResponse(streaming_generator(tts_generator, media_type),
                                     media_type=f"audio/{media_type}")
        else:
            sr, audio_data = next(tts_generator)
            audio_data = pack_audio(BytesIO(), audio_data, sr, media_type).getvalue()
            return Response(audio_data, media_type=f"audio/{media_type}")
    except Exception as e:
        print(str(e))
        return JSONResponse(status_code=400, content={"message": "tts failed", "Exception": str(e)})

# -------------------- 路由：原 /tts --------------------
@APP.get("/tts")
async def tts_get_endpoint(
    text: str = None, text_lang: str = None, ref_audio_path: str = None,
    aux_ref_audio_paths: list = None, prompt_lang: str = None, prompt_text: str = "",
    top_k: int = 5, top_p: float = 1, temperature: float = 1,
    text_split_method: str = "cut0", batch_size: int = 1,
    batch_threshold: float = 0.75, split_bucket: bool = True,
    speed_factor: float = 1.0, fragment_interval: float = 0.3,
    seed: int = -1, media_type: str = "wav", streaming_mode: bool = False,
    parallel_infer: bool = True, repetition_penalty: float = 1.35,
    sample_steps: int = 32, super_sampling: bool = False,
):
    req = {k: v for k, v in locals().items() if v is not None}
    req["text_lang"] = req["text_lang"].lower() if req.get("text_lang") else None
    req["prompt_lang"] = req["prompt_lang"].lower() if req.get("prompt_lang") else None
    return await tts_handle(req)

@APP.post("/tts")
async def tts_post_endpoint(request: TTS_Request):
    req = request.dict()
    return await tts_handle(req)

# -------------------- 路由：角色相关 --------------------
@APP.post("/upload_role")
async def upload_role(
    role: str = Form(...),
    ref_audio: UploadFile = File(...),
    prompt_text: str = Form(""),
    prompt_lang: str = Form("zh"),
):
    path = await save_upload_file(ref_audio)
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO role(name, ref_audio_path, prompt_text, prompt_lang) VALUES (?,?,?,?)",
            (role, path, prompt_text, prompt_lang.lower())
        )
        conn.commit()
    return JSONResponse(status_code=200, content={"message": "success"})

@APP.get("/tts_role")
async def tts_role_get(
    role: str, content: str, text_lang: str = "zh", **kw
):
    return await tts_role_handle(role, content, text_lang, **kw)

# @APP.post("/tts_role")
# async def tts_role_post(json: dict):
#     role = json.get("role")
#     content = json.get("content")
#     text_lang = json.get("text_lang", "zh")
#     if not role or not content:
#         return JSONResponse(status_code=400, content={"message": "role and content required"})
#     # 其余参数直接透传
#     return await tts_role_handle(role, content, text_lang, **json)
@APP.post("/tts_role")
async def tts_role_post(json: dict):
    role = json.pop("role", None)
    content = json.pop("content", None)
    text_lang = json.pop("text_lang", "zh")
    if not role or not content:
        return JSONResponse(status_code=400, content={"message": "role and content required"})
    # 其余参数通过 **json 透传
    return await tts_role_handle(role, content, text_lang, **json)
# -------------------- 控制接口 --------------------
@APP.get("/control")
async def control(command: str = None):
    if command == "restart":
        os.execl(sys.executable, sys.executable, *sys.argv)
    elif command == "exit":
        os.kill(os.getpid(), signal.SIGTERM)
    return JSONResponse(status_code=400, content={"message": "command required"})

if __name__ == "__main__":
    try:
        if host == "None":
            host = None
        uvicorn.run(app=APP, host=host, port=port, workers=1)
    except Exception:
        traceback.print_exc()
        os.kill(os.getpid(), signal.SIGTERM)