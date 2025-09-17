export const PROMPT_TEMPLATE = `
You are an EXTRACTIVE summarizer. Use ONLY text that appears in the transcript.
If a field is not explicitly supported by the transcript, return an empty array.
NEVER invent times, owners, tasks, or decisions.

Return STRICT JSON with keys:
- "title": short string (derive from content; else "Untitled session")
- "key_points": array of strings taken from the transcript (≤7). Each must quote or closely paraphrase a phrase present in the transcript.
- "decisions": array of strings present in the transcript. If none, [].
- "action_items": array of objects { "owner": string, "task": string, "due": string }.
    Only include if all parts are explicitly in the transcript; else return [].
- "timestamps": array of { "t": "mm:ss", "note": string } using times mentioned in transcript lines.
    If no clear moments, return [].

Rules:
- If the transcript does not mention a budget, do NOT mention one.
- Do NOT make up times (e.g., "10am") unless it appears in the transcript.
- Prefer names exactly as they appear (e.g., "Bashir Abubakar", "Holly Wilcock", "Jake Bala").
- If unsure, omit.

Transcript:
{{TRANSCRIPT}}

Return ONLY the JSON. No prose.
`.trim();
