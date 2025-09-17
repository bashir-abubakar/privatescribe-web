export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function buildMarkdown(title: string, transcript: string, summary: any) {
  const kp = (summary?.key_points || []).map((s:string)=>`- ${s}`).join('\n');
  const dec = (summary?.decisions || []).map((s:string)=>`- ${s}`).join('\n');
  const act = (summary?.action_items || []).map((a:any)=>`- ${a.owner||'Someone'}: ${a.task||''}${a.due?` (due ${a.due})`:''}`).join('\n');
  return `# ${summary?.title || title}

## Key points
${kp || '_None_'}

## Decisions
${dec || '_None_'}

## Action items
${act || '_None_'}

---
## Transcript
${transcript}`.trim();
}

export function printSummary(title: string, transcript: string, summary: any) {
  const win = window.open('', '_blank');
  if (!win) return;
  const styles = `
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; }
      h1,h2 { margin: 0 0 8px 0; }
      h2 { margin-top: 20px; }
      ul { margin: 8px 0 16px 18px; }
      .muted { color: #666; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 24px 0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    </style>`;
  const kp = (summary?.key_points || []).map((s:string)=>`<li>${escapeHtml(s)}</li>`).join('');
  const dec = (summary?.decisions || []).map((s:string)=>`<li>${escapeHtml(s)}</li>`).join('');
  const act = (summary?.action_items || []).map((a:any)=>`<li><code>${escapeHtml(a.owner||'Someone')}</code>: ${escapeHtml(a.task||'')}${a.due?` — due ${escapeHtml(a.due)}`:''}</li>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head>
  <body>
  <h1>${escapeHtml(summary?.title || title || 'Summary')}</h1>
  <h2>Key points</h2><ul>${kp || '<li><em>None</em></li>'}</ul>
  <h2>Decisions</h2><ul>${dec || '<li><em>None</em></li>'}</ul>
  <h2>Action items</h2><ul>${act || '<li><em>None</em></li>'}</ul>
  <hr/>
  <h2>Transcript</h2>
  <p>${escapeHtml(transcript).replace(/\n/g,'<br/>')}</p>
  <script>window.addEventListener('load', ()=> setTimeout(()=>window.print(), 250));</script>
  </body></html>`;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as any)[m]);
}
