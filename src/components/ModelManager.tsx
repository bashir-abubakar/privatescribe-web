'use client';

import { useState } from 'react';
import { MODELS } from '@/src/models/manifest';
import { prefetchWebLLM, disposeWebLLM, WebLLMProgress } from '@/src/llm/prefetch';

export default function ModelManager() {
  const [status, setStatus] = useState<Record<string,string>>({});
  const [progress, setProgress] = useState<Record<string,number>>({});
  const [installed, setInstalled] = useState<Record<string,boolean>>({});

  async function prefetchASR(modelId: string, hfModelId: string) {
    setStatus(s => ({ ...s, [modelId]: 'Downloading ASR weights…' }));
    setProgress(p => ({ ...p, [modelId]: 0.1 }));
    try {
      const { pipeline } = await import('@xenova/transformers');
      const asr = await pipeline('automatic-speech-recognition', hfModelId);
      // warm up tiny buffer
      await asr(new Float32Array(16000), { sampling_rate: 16000 });
      setProgress(p => ({ ...p, [modelId]: 1 }));
      setStatus(s => ({ ...s, [modelId]: 'Ready' }));
      setInstalled(x => ({ ...x, [modelId]: true }));
    } catch (e:any) {
      setStatus(s => ({ ...s, [modelId]: 'Error: ' + (e?.message || String(e)) }));
    }
  }

  async function prefetchLLM(modelId: string, webllmModelId: string) {
    setStatus(s => ({ ...s, [modelId]: 'Starting download…' }));
    setProgress(p => ({ ...p, [modelId]: 0 }));
    const onProg = (r: WebLLMProgress) => {
      setStatus(s => ({ ...s, [modelId]: `${r.stage}${r.text ? ': ' + r.text : ''}` }));
      setProgress(p => ({ ...p, [modelId]: Math.min(0.99, r.progress ?? 0) }));
    };
    try {
      await prefetchWebLLM(webllmModelId, onProg);
      setProgress(p => ({ ...p, [modelId]: 1 }));
      setStatus(s => ({ ...s, [modelId]: 'Ready' }));
      setInstalled(x => ({ ...x, [modelId]: true }));
    } catch (e:any) {
      setStatus(s => ({ ...s, [modelId]: 'Error: ' + (e?.message || String(e)) }));
    } finally {
      disposeWebLLM();
    }
  }

  return (
    <div className="govuk-!-margin-top-2">
      {MODELS.map(m => (
        <section key={m.id} className="govuk-!-margin-bottom-5 app-card">
          <h3 className="govuk-heading-m govuk-!-margin-bottom-2">{m.label}</h3>
          <p className="govuk-hint govuk-!-margin-bottom-2">
            {m.kind === 'asr' ? 'On-device speech-to-text (Whisper via Transformers.js).' : 'Local summariser running with WebGPU via WebLLM.'}
          </p>
          <div className="govuk-button-group">
            {m.kind === 'asr' && m.hfModelId && (
              <button className="govuk-button" onClick={()=>prefetchASR(m.id, m.hfModelId)} data-module="govuk-button">
                Download / Warm up
              </button>
            )}
            {m.kind === 'webllm' && m.webllmModelId && (
              <button className="govuk-button" onClick={()=>prefetchLLM(m.id, m.webllmModelId)} data-module="govuk-button">
                Download / Warm up
              </button>
            )}
            <span className="govuk-hint">{installed[m.id] ? 'Installed' : 'Not installed'}</span>
          </div>
          <Progress value={progress[m.id] ?? 0} />
          <p className="govuk-hint">{status[m.id] ?? ''}</p>
        </section>
      ))}
    </div>
  );
}

function Progress({ value=0 }: { value?: number }) {
  return (
    <div className="govuk-!-margin-top-2" aria-hidden="true">
      <div style={{ height:8, background:'#f3f2f1', borderRadius:999, overflow:'hidden' }}>
        <div style={{ width: `${Math.floor(value*100)}%`, height:'100%', background:'#1d70b8' }} />
      </div>
    </div>
  );
}
