// Simple linear resampler to 16kHz (good enough for Whisper tiny/base)
export function to16k(pcm: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return pcm;
  const ratio = 16000 / fromRate;
  const outLen = Math.floor(pcm.length * ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i / ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, pcm.length - 1);
    const t = src - i0;
    out[i] = pcm[i0] * (1 - t) + pcm[i1] * t;
  }
  return out;
}
