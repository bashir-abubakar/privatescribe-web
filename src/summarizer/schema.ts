type Summary = {
  title: string;
  key_points: string[];
  decisions: string[];
  action_items: { owner: string; task: string; due: string }[];
  timestamps: { t: string; note: string }[];
};
export function parseSummary(text: string): Summary | null {
  const json = extractJson(text);
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.title !== 'string') return null;
    if (!Array.isArray(obj.key_points)) return null;
    if (!Array.isArray(obj.decisions)) return null;
    if (!Array.isArray(obj.action_items)) return null;
    if (!Array.isArray(obj.timestamps)) return null;
    return obj as Summary;
  } catch { return null; }
}
function extractJson(s: string) {
  const m = s.match(/\{[\s\S]*\}$/); return m ? m[0] : s;
}
