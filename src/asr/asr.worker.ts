import { pipeline } from '@xenova/transformers';
let asr: any = null;
self.onmessage = async (e: MessageEvent) => {
  const { type } = (e.data || {});
  if (type === 'init') {
    asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    (self as any).postMessage({ type: 'ready' });
  } else if (type === 'transcribe') {
    if (!asr) { (self as any).postMessage({ type: 'error', error: 'ASR not ready' }); return; }
    const { pcm, t0 } = e.data;
    try {
      const result = await asr(pcm, { chunk_length_s: 15, stride_length_s: 1, return_timestamps: false, sampling_rate: 16000 });
      const text = result?.text || '';
      const duration = pcm.length / 16000;
      (self as any).postMessage({ type:'segment', segment: { t0, t1: t0 + duration, text, conf: 1.0 } });
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: String(err?.message || err) });
    }
  }
};
export {};
