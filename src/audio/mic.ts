export async function startMic(onChunk: (f32: Float32Array)=>void) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true }
  });
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  await ctx.audioWorklet.addModule('/worklets/vad.worklet.js');
  const node = new AudioWorkletNode(ctx, 'vad-processor', { numberOfInputs: 1, numberOfOutputs: 1 });
  node.port.onmessage = (e) => { if (e.data?.type === 'frames') onChunk(e.data.frames as Float32Array); };
  src.connect(node).connect(ctx.destination);
  return () => { node.disconnect(); src.disconnect(); stream.getTracks().forEach(t=>t.stop()); ctx.close(); };
}
