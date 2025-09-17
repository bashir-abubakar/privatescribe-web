import { CreateMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";

let engine: any | null = null;
export type WebLLMProgress = { stage: string; progress: number; text?: string };

export async function prefetchWebLLM(
  modelId: string,
  onProgress: (p: WebLLMProgress) => void
) {
  const cfg = structuredClone(prebuiltAppConfig);
  const found = cfg.model_list.find((m: any) => m.model_id === modelId);
  if (!found) {
    const available = cfg.model_list.map((m: any) => m.model_id).join(", ");
    throw new Error(`Model '${modelId}' not found. Available: ${available}`);
  }
  cfg.model_list = [found];

  // OLD versions expect: CreateMLCEngine(modelId, { appConfig, initProgressCallback })
  engine = await CreateMLCEngine(modelId, {
    appConfig: cfg,
    initProgressCallback: (r: any) =>
      onProgress({
        stage: r?.stage ?? "download",
        progress: r?.progress ?? 0,
        text: r?.text,
      }),
  });

  // Warm once so kernels compile
  await engine.chat.completions.create({
    messages: [{ role: "user", content: "OK" }],
    max_tokens: 1,
  });
}

export function disposeWebLLM() {
  engine = null;
}
