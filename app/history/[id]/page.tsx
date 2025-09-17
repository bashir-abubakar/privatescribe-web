'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, type Session } from '@/src/store/db';
import { buildMarkdown, downloadText, printSummary } from '@/src/utils/export';

type Tab = 'transcript' | 'summary' | 'actions';

export default function SessionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id as string;
  const [sess, setSess] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>('summary');

  useEffect(() => { (async () => {
    if (id) {
      const s = await getSession(id);
      setSess(s || null);
    }
  })(); }, [id]);

  const transcriptText = useMemo(() => {
    if (!sess) return '';
    return sess.segments.map(s => `${fmtTime(s.t0)}–${fmtTime(s.t1)} ${s.text}`).join('\n');
  }, [sess]);

  function exportMD() {
    if (!sess) return;
    const md = buildMarkdown(sess.summary?.title || sess.title, transcriptText, sess.summary);
    downloadText((sess.summary?.title || sess.title || 'session') + '.md', md);
  }
  function exportPDF() {
    if (!sess) return;
    printSummary(sess.summary?.title || sess.title, transcriptText, sess.summary);
  }

  if (!sess) return <p className="govuk-hint">Loading…</p>;

  const actions = (sess.summary?.action_items ?? []) as Array<any>;

  return (
    <main>
      <nav className="govuk-!-margin-bottom-4">
        <Link href="/history" className="govuk-link">← Back to History</Link>
      </nav>

      <h1 className="govuk-heading-l govuk-!-margin-bottom-1">{sess.summary?.title || sess.title}</h1>
      <p className="govuk-hint">{fmtDuration(sess.durationSec)} • {new Date(sess.createdAt).toLocaleString()} • On device</p>

      <div className="govuk-button-group">
        <button onClick={exportMD} className="govuk-button govuk-button--secondary" data-module="govuk-button">Export Markdown</button>
        <button onClick={exportPDF} className="govuk-button govuk-button--secondary" data-module="govuk-button">Export PDF</button>
      </div>

      <div role="tablist" className="govuk-!-margin-top-3 govuk-!-margin-bottom-2">
        <button className={"govuk-button " + (tab==='transcript'?'':'govuk-button--secondary')} onClick={()=>setTab('transcript')}>Transcript</button>
        <button className={"govuk-button " + (tab==='summary'?'':'govuk-button--secondary')} onClick={()=>setTab('summary')}>Summary</button>
        <button className={"govuk-button " + (tab==='actions'?'':'govuk-button--secondary')} onClick={()=>setTab('actions')}>Action items</button>
      </div>

      {tab === 'transcript' && (
        <section className="app-card">
          <h2 className="govuk-heading-m">Transcript</h2>
          {sess.segments.length === 0 && <p className="govuk-hint">No transcript stored.</p>}
          {sess.segments.map((s,i)=> (
            <p key={i} className="govuk-body"><span className="govuk-hint">{fmtTime(s.t0)}–{fmtTime(s.t1)} </span>{s.text}</p>
          ))}
        </section>
      )}

      {tab === 'summary' && (
        <section className="app-card">
          <h2 className="govuk-heading-m">Summary</h2>
          {!sess.summary && <p className="govuk-hint">No summary available.</p>}
          {sess.summary && (
            <div className="govuk-body">
              <h3 className="govuk-heading-s govuk-!-margin-bottom-1">{sess.summary.title}</h3>
              <h4 className="govuk-heading-s govuk-!-margin-bottom-1">Key points</h4>
              <ul className="govuk-list govuk-list--bullet">
                {sess.summary.key_points?.map((k:string, i:number)=><li key={i}>{k}</li>)}
              </ul>
              {sess.summary.decisions?.length>0 && (<>
                <h4 className="govuk-heading-s govuk-!-margin-bottom-1">Decisions</h4>
                <ul className="govuk-list govuk-list--bullet">
                  {sess.summary.decisions.map((d:string,i:number)=><li key={i}>{d}</li>)}
                </ul>
              </>)}
            </div>
          )}
        </section>
      )}

      {tab === 'actions' && (
        <section className="app-card">
          <h2 className="govuk-heading-m">Action items</h2>
          <ul className="govuk-list govuk-list--bullet">
            {actions.length === 0 && <li>None</li>}
            {actions.map((a,i)=>(
              <li key={i}><code className="app-mono">{a.owner || 'Someone'}</code>: {a.task || ''} {a.due ? `— due ${a.due}` : ''}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function fmtTime(sec: number) {
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60).toString();
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
