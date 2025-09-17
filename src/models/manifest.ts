export type ModelEntry = {
  id: string;
  label: string;
  kind: 'asr' | 'webllm';
  hfModelId?: string;      // for Transformers.js ASR
  webllmModelId?: string;  // for WebLLM
};

export const MODELS: ModelEntry[] = [
  {
    id: 'asr-whisper-base-en',
    label: 'Whisper base.en (ASR)',            // ← bigger, more accurate
    kind: 'asr',
    hfModelId: 'Xenova/whisper-base.en'
    // If you want even more accuracy (heavier), use:
    // hfModelId: 'Xenova/whisper-small.en'
  },
  {
    id: 'webllm-llama-3.2-1b',
    label: 'Llama 3.2 1B Instruct (WebLLM)',
    kind: 'webllm',
    webllmModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
  }
];
