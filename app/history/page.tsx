'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listSessions, deleteSession, type Session } from '@/src/store/db';

export default function HistoryPage() {
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    setRows(await listSessions());
    setLoading(false);
  })(); }, []);

  async function onDelete(id: string) {
    await deleteSession(id);
    setRows(await listSessions());
  }

  return (
    <main>
      <h1 className="govuk-heading-l">History</h1>
      <p className="govuk-body">Saved sessions on this device.</p>
      {loading && <p className="govuk-hint">Loading…</p>}
      {!loading && rows.length === 0 && <p className="govuk-hint">No sessions yet. Record and save one on the home page.</p>}

      {rows.length > 0 && (
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">Title</th>
              <th scope="col" className="govuk-table__header">Duration</th>
              <th scope="col" className="govuk-table__header">Date & time</th>
              <th scope="col" className="govuk-table__header">Actions</th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {rows.map(r => (
              <tr className="govuk-table__row" key={r.id}>
                <td className="govuk-table__cell"><Link className="govuk-link" href={`/history/${r.id}`}>{r.title || 'Session'}</Link></td>
                <td className="govuk-table__cell">{fmtDuration(r.durationSec)}</td>
                <td className="govuk-table__cell">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="govuk-table__cell">
                  <div className="govuk-button-group">
                    <Link href={`/history/${r.id}`} className="govuk-button govuk-button--secondary" data-module="govuk-button">Open</Link>
                    <button onClick={()=>onDelete(r.id)} className="govuk-button govuk-button--warning" data-module="govuk-button">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
