class VADProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.lastVoice = -1; }
  process(inputs) {
    const ch = inputs?.[0]?.[0]; if (!ch) return true;
    let e = 0; for (let i=0;i<ch.length;i++) e += ch[i]*ch[i];
    const isVoice = e/ch.length > 1e-5;
    this.buf.push(...ch);
    if (isVoice) this.lastVoice = currentTime;
    const tooLong = this.buf.length > 16000*15;
    const endSil = this.lastVoice>0 && (currentTime - this.lastVoice) > 0.6 && this.buf.length>16000*3;
    if (tooLong || endSil) {
      this.port.postMessage({ type: 'frames', frames: new Float32Array(this.buf) });
      this.buf = []; this.lastVoice = -1;
    }
    return true;
  }
}
registerProcessor('vad-processor', VADProcessor);
