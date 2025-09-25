'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mic, MicOff, Play, Download } from 'lucide-react';
import { apiService } from '@/services/apiService';

export default function QiniuASRTestPage() {
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('zh');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrlFromRecording, setAudioUrlFromRecording] = useState<string | null>(null);

  const testASR = async () => {
    if (!audioUrl.trim()) {
      setError('请输入音频URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.testQiniuASR(audioUrl, language);
      setResult(response);
    } catch (err: any) {
      setError(err.message || '测试失败');
    } finally {
      setLoading(false);
    }
  };

  const testASRWithFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.qiniuASRTranscribe(file, language);
      setResult(response);
    } catch (err: any) {
      setError(err.message || '文件测试失败');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedAudio(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrlFromRecording(url);
        setAudioUrl(url);
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (audioUrlFromRecording) {
      const audio = new Audio(audioUrlFromRecording);
      audio.play();
    }
  };

  const downloadRecordedAudio = () => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recorded-audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">七牛云ASR测试</h1>
          <p className="text-gray-600">测试七牛云语音识别服务的功能</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 测试配置 */}
          <Card>
            <CardHeader>
              <CardTitle>ASR测试配置</CardTitle>
              <CardDescription>配置音频URL和语言设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="audioUrl">音频URL</Label>
                <Input
                  id="audioUrl"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                />
                <p className="text-sm text-gray-500">
                  支持mp3、wav、ogg等格式的音频文件URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audioFile">或上传音频文件</Label>
                <Input
                  id="audioFile"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      testASRWithFile(file);
                    }
                  }}
                />
                <p className="text-sm text-gray-500">
                  支持mp3、wav、ogg、m4a等格式的音频文件
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">语言</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="ja">日文</option>
                  <option value="ko">韩文</option>
                </select>
              </div>

              <Button 
                onClick={testASR} 
                disabled={loading || !audioUrl.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  '开始ASR测试'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 录音功能 */}
          <Card>
            <CardHeader>
              <CardTitle>录音测试</CardTitle>
              <CardDescription>录制音频并测试ASR功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="w-full"
                    variant="outline"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    开始录音
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="w-full"
                    variant="destructive"
                  >
                    <MicOff className="w-4 h-4 mr-2" />
                    停止录音
                  </Button>
                )}

                {audioUrlFromRecording && (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-gray-600">录音完成！</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={playRecordedAudio}
                        variant="outline"
                        size="sm"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        播放
                      </Button>
                      <Button
                        onClick={downloadRecordedAudio}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                      <Button
                        onClick={() => recordedAudio && testASRWithFile(new File([recordedAudio], 'recorded.wav', { type: 'audio/wav' }))}
                        variant="default"
                        size="sm"
                      >
                        测试ASR
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 错误显示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 结果显示 */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>ASR测试结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">测试状态</Label>
                  <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅ 成功' : '❌ 失败'}
                  </p>
                </div>

                {result.success && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">识别文本</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm">{result.transcribed_text || '无识别结果'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">语言</Label>
                      <p className="text-sm">{result.language}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">音频URL</Label>
                      <p className="text-sm break-all">{result.audio_url}</p>
                    </div>
                  </>
                )}

                {!result.success && (
                  <div>
                    <Label className="text-sm font-medium">错误信息</Label>
                    <p className="text-sm text-red-600">{result.error || result.message}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">消息</Label>
                  <p className="text-sm">{result.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>1. <strong>配置七牛云API密钥：</strong>在服务器环境变量中设置 <code>QINIU_AI_API_KEY</code></p>
              <p>2. <strong>音频URL测试：</strong>输入可公开访问的音频文件URL进行测试</p>
              <p>3. <strong>文件上传测试：</strong>直接上传音频文件，系统会自动上传到七牛云存储并调用ASR</p>
              <p>4. <strong>录音测试：</strong>使用浏览器录音功能录制音频并测试ASR</p>
              <p>5. <strong>支持格式：</strong>mp3、wav、ogg、m4a等常见音频格式</p>
              <p>6. <strong>语言支持：</strong>中文、英文、日文、韩文等多种语言</p>
              <p>7. <strong>工作流程：</strong>文件上传 → 七牛云存储 → 七牛云ASR → 返回结果</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
