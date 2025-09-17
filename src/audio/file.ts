// Decode any browser-supported audio file to mono PCM
export async function fileToPCM(file: File): Promise<{ pcm: Float32Array; sampleRate: number; duration: number }> {
  const arrayBuf = await file.arrayBuffer();

  // Safari needs a fresh copy (no shared ArrayBuffer)
  const bufCopy = arrayBuf.slice(0);

  // Create (or reuse) an AudioContext
  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(bufCopy);

  // Mix down to mono
  const len = audio.length;
  const mono = new Float32Array(len);
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const data = audio.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += data[i] / audio.numberOfChannels;
  }
  return { pcm: mono, sampleRate: audio.sampleRate, duration: audio.duration };
}
