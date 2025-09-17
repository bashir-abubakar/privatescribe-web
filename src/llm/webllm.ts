import { CreateMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
let engine: any = null;
let fallbackPipe: any = null;

export const hasWebGPU = () =>
  typeof (globalThis as any).navigator !== "undefined" && "gpu" in navigator;

export async function initWebLLM() {
  if (!hasWebGPU()) throw new Error("No WebGPU");

  // Use one ID from YOUR printed list; keep this in sync with manifest.ts
  const modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  // or a smaller one:
  // const modelId = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

  const cfg = structuredClone(prebuiltAppConfig);
  const found = cfg.model_list.find((m: any) => m.model_id === modelId);
  if (!found) {
    const available = cfg.model_list.map((m: any) => m.model_id).join(", ");
    throw new Error(`Model '${modelId}' not found. Available: ${available}`);
  }
  cfg.model_list = [found];

  // OLD signature: model id first, config in options
  engine = await CreateMLCEngine(modelId, { appConfig: cfg });
}

// keep summarizeJson / fallback as you have them



export async function summarizeJson(prompt: string): Promise<string> {
  if (!engine) throw new Error('webllm not ready');
  const resp = await engine.chat.completions.create({
    messages: [
      { role: "system", content: "Respond with STRICT JSON only. Omit unknowns; do not invent." },
      { role: "user", content: prompt }
    ],
    temperature: 0.0,           // ← was 0.3
    max_tokens: 256
  });
  return resp.choices[0].message.content;
}


export async function initFallbackLLM() {
  const { pipeline } = await import('@xenova/transformers');
  fallbackPipe = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M');
}

export async function summarizeJsonFallback(prompt: string) {
  if (!fallbackPipe) throw new Error('fallback not ready');
  const out = await fallbackPipe(`Summarize into STRICT JSON with keys: title,key_points,decisions,action_items,timestamps.\n${prompt}`, { max_new_tokens: 256 });
  return out[0].generated_text;
}
export async function formatTextOnDevice(raw: string): Promise<string> {
  if (!engine) throw new Error('webllm not ready');
  const sys = "You are a *faithful* text formatter. Do not add or remove information.";
  const rules = [
    "Fix punctuation and casing.",
    "Split into sentences and short paragraphs.",
    "Keep names and wording; no summaries, no bullet lists.",
    "Output plain formatted text only."
  ].join(" ");

  const resp = await engine.chat.completions.create({
    messages: [
      { role: "system", content: `${sys} ${rules}` },
      { role: "user", content: raw }
    ],
    temperature: 0.0,
    max_tokens: 800
  });
  return resp.choices[0].message.content;
}

// Super-light fallback if WebLLM isn't available
export function formatTextFallback(raw: string): string {
  const txt = raw.replace(/\s+/g, ' ').trim();
  if (!txt) return '';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // naive split on .?! then rebuild
  const parts = txt.split(/([.?!])\s*/).reduce<string[]>((acc, cur, i, arr) => {
    if (/[.?!]/.test(cur)) acc[acc.length - 1] += cur;
    else if (cur) acc.push(cur);
    return acc;
  }, []);
  return parts.map(s => cap(s)).join(' ');
}
