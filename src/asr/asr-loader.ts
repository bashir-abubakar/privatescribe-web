// src/asr/asr-loader.ts

let worker: Worker | null = null;
let ready = false;

export async function initASR() {
  if (ready && worker) return; // allow idempotent init
  worker = new Worker(new URL('./asr.worker.ts', import.meta.url), { type: 'module' });
  await new Promise<void>((resolve) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'ready') {
        worker?.removeEventListener('message', onMsg);
        resolve();
      }
    };
    worker!.addEventListener('message', onMsg);
    worker!.postMessage({ type: 'init' });
  });
  ready = true;
}

export function isASRReady() { return ready; }

export async function transcribeChunk(frames: Float32Array, t0: number) {
  if (!ready || !worker) throw new Error('ASR not ready');
  return await new Promise<any>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'segment') {
        worker?.removeEventListener('message', onMsg);
        resolve(e.data.segment);
      } else if (e.data?.type === 'error') {
        worker?.removeEventListener('message', onMsg);
        reject(new Error(e.data.error));
      }
    };
    worker!.addEventListener('message', onMsg);
    // Transfer the underlying buffer for speed
    worker!.postMessage({ type: 'transcribe', pcm: frames, t0 }, [frames.buffer]);
  });
}

/** Transcribe a full 16 kHz mono PCM buffer by slicing into ~15s chunks.
 *  IMPORTANT: we copy each subarray (view.slice()) before sending, because
 *  postMessage() transfers the ArrayBuffer; if we sent views of the same buffer,
 *  the first transfer would detach the whole thing and later chunks would fail.
 */
export async function transcribePCM16k(
  pcm16k: Float32Array,
  onSegment?: (seg: { t0: number; t1: number; text: string; conf?: number }) => void
) {
  if (!ready || !worker) throw new Error('ASR not ready');
  const CHUNK_S = 15;               // ~15s windows work well with Whisper
  const CHUNK = 16000 * CHUNK_S;    // 16k samples/sec
  let t = 0;
  for (let i = 0; i < pcm16k.length; i += CHUNK) {
    const view = pcm16k.subarray(i, Math.min(i + CHUNK, pcm16k.length));
    const owned = view.slice();     // <-- make a copy with its own buffer
    const seg = await transcribeChunk(owned, t);
    t = seg.t1;
    onSegment?.(seg);
  }
}

export function disposeASR() {
  worker?.terminate();
  worker = null;
  ready = false;
}
