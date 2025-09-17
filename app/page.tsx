'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { startMic } from '@/src/audio/mic';
import { initASR, transcribeChunk, transcribePCM16k } from '@/src/asr/asr-loader';
import {
  hasWebGPU, initWebLLM, summarizeJson, initFallbackLLM, summarizeJsonFallback,
  formatTextOnDevice, formatTextFallback
} from '@/src/llm/webllm';
import { PROMPT_TEMPLATE } from '@/src/summarizer/prompt';
import { parseSummary } from '@/src/summarizer/schema';
import { buildMarkdown, downloadText, printSummary } from '@/src/utils/export';
import { saveSession } from '@/src/store/db';
import { fileToPCM } from '@/src/audio/file';
import { to16k } from '@/src/utils/resample';

type Seg = { t0: number; t1: number; text: string; conf?: number };

export default function Page() {
  const [ready, setReady] = useState(false);
  const [gpu, setGpu] = useState(false);
  const [listening, setListening] = useState(false);
  const [segments, setSegments] = useState<Seg[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [formatIn, setFormatIn] = useState('');
  const [formatOut, setFormatOut] = useState('');
  const [busy, setBusy] = useState(false);

  const stopFn = useRef<null | (() => void)>(null);
  const lastT = useRef(0);
  const segRef = useRef<Seg[]>([]);

  // 🔽 transcript auto-scroll refs
  const transcriptRef = useRef<HTMLDivElement>(null);
  const stickBottomRef = useRef(true);
  const onTranscriptScroll = () => {
    const el = transcriptRef.current;
    if (!el) return;
    // keep auto-scrolling only if user is near bottom
    stickBottomRef.current = (el.scrollTop + el.clientHeight >= el.scrollHeight - 40);
  };
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && stickBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [segments.length]);

  useEffect(() => {
    (async () => {
      setGpu(hasWebGPU());
      await initASR();
      try { await initWebLLM(); } catch { await initFallbackLLM(); }
      setReady(true);
    })();
  }, []);

  async function onStart() {
    setListening(true);
    segRef.current = [];
    setSegments([]);
    setSummary(null);
    setSavedId(null);
    lastT.current = 0;

    stopFn.current = await startMic(async (frames) => {
      const t0 = lastT.current;
      const seg = await transcribeChunk(frames, t0);
      lastT.current = seg.t1;

      segRef.current = [...segRef.current, seg];
      setSegments(prev => [...prev, seg]);

      const recent = segRef.current.slice(-60).map(s => s.text).join(' ');
      const prompt = PROMPT_TEMPLATE.replace('{{TRANSCRIPT}}', recent);
      try {
        const out = gpu ? await summarizeJson(prompt) : await summarizeJsonFallback(prompt);
        const j = parseSummary(out); if (j) setSummary(j);
      } catch {}
    });
  }
  function onStop() { stopFn.current?.(); stopFn.current = null; setListening(false); }

  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      segRef.current = [];
      setSegments([]);
      setSummary(null);
      setSavedId(null);
      lastT.current = 0;

      const { pcm, sampleRate } = await fileToPCM(f);
      const pcm16 = to16k(pcm, sampleRate);

      await transcribePCM16k(pcm16, async (seg) => {
        segRef.current = [...segRef.current, seg];
        setSegments(prev => [...prev, seg]);

        const recent = segRef.current.slice(-60).map(s => s.text).join(' ');
        const prompt = PROMPT_TEMPLATE.replace('{{TRANSCRIPT}}', recent);
        try {
          const out = gpu ? await summarizeJson(prompt) : await summarizeJsonFallback(prompt);
          const j = parseSummary(out); if (j) setSummary(j);
        } catch {}
      });
    } finally {
      setBusy(false);
    }
  }

  function onExportMD() {
    const transcript = segRef.current.map(s => `${formatTime(s.t0)}–${formatTime(s.t1)} ${s.text}`).join('\n');
    const md = buildMarkdown(summary?.title || 'PrivateScribe session', transcript, summary);
    downloadText((summary?.title || 'PrivateScribe session') + '.md', md);
  }
  function onExportPDF() {
    const transcript = segRef.current.map(s => `${formatTime(s.t0)}–${formatTime(s.t1)} ${s.text}`).join('\n');
    printSummary(summary?.title || 'PrivateScribe session', transcript, summary);
  }

  async function onSave() {
    const title = summary?.title || 'PrivateScribe session';
    const id = 's-' + Date.now().toString(36);
    await saveSession({
      id, title,
      createdAt: Date.now(),
      durationSec: Math.floor(lastT.current),
      segments: segRef.current,
      summary
    });
    setSavedId(id);
  }

  async function onFormat() {
    setBusy(true);
    try {
      const out = gpu ? await formatTextOnDevice(formatIn) : formatTextFallback(formatIn);
      setFormatOut(out || '');
    } finally {
      setBusy(false);
    }
  }

  const actions = (summary?.action_items ?? []) as Array<any>;
  const canSave = !listening && segRef.current.length > 0;

  return (
    <>
      <nav className="govuk-!-margin-bottom-4">
        <Link href="/history" className="govuk-link">History</Link> &nbsp;•&nbsp;
        <Link href="/models" className="govuk-link">Models</Link>
      </nav>

      <div className="govuk-notification-banner govuk-!-margin-bottom-4" role="region" aria-labelledby="govuk-notification-banner-title">
        <div className="govuk-notification-banner__header">
          <h2 className="govuk-notification-banner__title" id="govuk-notification-banner-title">Private mode</h2>
        </div>
        <div className="govuk-notification-banner__content">
          <p className="govuk-body">Your audio and summaries never leave this device.</p>
          <p className="govuk-hint">Tip: Pre-download models on the <Link href="/models" className="govuk-link">Models page</Link> for quicker startup.</p>
        </div>
      </div>

      <div className="govuk-button-group">
        <button disabled={!ready || listening || busy} onClick={onStart} className="govuk-button" data-module="govuk-button">
          Start recording
        </button>
        <button disabled={!listening} onClick={onStop} className="govuk-button govuk-button--secondary" data-module="govuk-button">
          Stop
        </button>
        <button disabled={!canSave} onClick={onSave} className="govuk-button govuk-button--warning" data-module="govuk-button">
          Save session
        </button>
        <strong className="govuk-hint govuk-!-margin-left-2">
          {ready ? (gpu ? 'WebGPU' : 'WASM') + ' • Models ready' : 'Loading models…'} {busy ? ' • Working…' : ''}
        </strong>
      </div>

      <div className="govuk-!-margin-bottom-4">
        <label className="govuk-label govuk-!-margin-bottom-1" htmlFor="file">Upload recording (mp3/wav/m4a/ogg/webm)</label>
        <input id="file" className="govuk-file-upload" type="file" accept="audio/*" onChange={onPickFile} disabled={!ready || listening || busy} />
        <p className="govuk-hint">Processed locally; nothing is uploaded.</p>
      </div>

      <div className="app-grid-2">
        <section className="app-card">
          <h2 className="govuk-heading-m">Transcript</h2>
          <div
            ref={transcriptRef}
            onScroll={onTranscriptScroll}
            className="govuk-body app-scroll"
          >
            {segments.length === 0 && <p className="govuk-hint">Speak or upload a file to see captions here.</p>}
            {segments.map((s, i) => (
              <p key={i} className="govuk-body">
                <span className="govuk-hint">{formatTime(s.t0)}–{formatTime(s.t1)} </span>{s.text}
              </p>
            ))}
          </div>
        </section>

        <section className="app-card">
          <h2 className="govuk-heading-m">Summary</h2>
          {!summary && <p className="govuk-hint">Key points, decisions, and actions will appear here.</p>}
          {summary && (
            <div className="govuk-body">
              <h3 className="govuk-heading-s govuk-!-margin-bottom-1">{summary.title}</h3>
              <h4 className="govuk-heading-s govuk-!-margin-bottom-1">Key points</h4>
              <ul className="govuk-list govuk-list--bullet">
                {summary.key_points?.map((k: string, i: number) => <li key={i}>{k}</li>)}
              </ul>
              {summary.decisions?.length > 0 && <>
                <h4 className="govuk-heading-s govuk-!-margin-bottom-1">Decisions</h4>
                <ul className="govuk-list govuk-list--bullet">
                  {summary.decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}
                </ul>
              </>}
              <h4 className="govuk-heading-s govuk-!-margin-bottom-1">Action items</h4>
              <ul className="govuk-list govuk-list--bullet">
                {(actions.length === 0) && <li>None yet</li>}
                {actions.map((a, i) => (
                  <li key={i}><code className="app-mono">{a.owner || 'Someone'}</code>: {a.task || ''} {a.due ? `— due ${a.due}` : ''}</li>
                ))}
              </ul>
              <div className="govuk-button-group govuk-!-margin-top-3">
                <button onClick={onExportMD} className="govuk-button govuk-button--secondary" data-module="govuk-button">Export Markdown</button>
                <button onClick={onExportPDF} className="govuk-button govuk-button--secondary" data-module="govuk-button">Export PDF</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="app-card govuk-!-margin-top-4">
        <h2 className="govuk-heading-m">Fix unformatted text</h2>
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor="format-in">Paste raw text</label>
          <textarea id="format-in" className="govuk-textarea" rows={6} value={formatIn} onChange={e => setFormatIn(e.target.value)} />
        </div>
        <div className="govuk-button-group">
          <button className="govuk-button" onClick={onFormat} disabled={!ready || busy || !formatIn.trim()}>Fix formatting</button>
        </div>
        {formatOut && (
          <div className="govuk-inset-text">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{formatOut}</pre>
          </div>
        )}
      </section>
    </>
  );
}

function formatTime(sec: number) {
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
