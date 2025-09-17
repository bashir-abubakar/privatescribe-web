````markdown
# PrivateScribe

**Private, on-device transcription & summarisation** with a clean GOV.UK-style interface.  
No servers. No cloud. Your audio and text stay on your machine.

- 🎙️ Live **microphone** capture **or upload recordings** (mp3 / wav / m4a / ogg / webm)
- 🔤 **Whisper** (Transformers.js, WASM) for speech-to-text — runs entirely in the browser
- 🧠 **WebLLM** summariser & text-formatter — runs with **WebGPU** (WASM fallback)
- 📝 **Extractive** summaries (no invention) + action-items scaffold
- 🗂️ Local **History**, **Markdown** export, **Print to PDF**
- 🧱 **GOV.UK Design System** look & feel (no government branding)

> **Privacy:** All processing happens **on your device**. Nothing is uploaded.

---

## Table of contents

- [Demo & features](#demo--features)
- [Requirements](#requirements)
- [Quick start (Windows / macOS / Linux)](#quick-start-windows--macos--linux)
- [Run](#run)
- [Usage](#usage)
- [Model selection & performance tips](#model-selection--performance-tips)
- [Folder structure (high level)](#folder-structure-high-level)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Browser support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [Security & privacy](#security--privacy)
- [Branding & licenses](#branding--licenses)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Repository setup](#repository-setup)
- [Scripts](#scripts)
- [Credits](#credits)

---

## Demo & features

- **Home**  
  Start/Stop recording → live transcript (fixed-height scroller), live **extractive** summary.  
  Or **Upload** an audio file instead of the mic.
- **Models**  
  Choose your **Whisper** checkpoint (tiny / base / small) and **WebLLM** model; warm each once.
- **Formatter**  
  Paste messy text (no punctuation/casing) → get clean, properly formatted text.
- **History**  
  Save sessions locally and re-open later.
- **Export**  
  Markdown (.md) and **Print to PDF**.

---

## Requirements

- **Node.js** 18+ (tested with Node **22.19.0**)
- OS: Windows 10/11, macOS, or Linux
- Browser: **Chrome** / **Edge** (WebGPU preferred)
  - Check WebGPU: open `chrome://gpu` and verify **WebGPU** is enabled.

---

## Quick start (Windows / macOS / Linux)

```bash
# 1) Clone your repo
git clone https://github.com/<your-username>/privatescribe-web.git
cd privatescribe-web

# 2) Install dependencies
npm install

# 3) Copy GOV.UK dist (CSS/JS/assets) into /public/govuk
npm run copy:govuk

# 4) Start dev server
npm run dev
# → open http://localhost:3000
````

**Windows PowerShell note (if npm is blocked):**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## Run

**Development**

```bash
npm run dev          # Next dev server: http://localhost:3000
```

**Production**

```bash
npm run build        # Build production bundle
npm run copy:govuk   # Ensure govuk dist is present in /public/govuk
npm run start        # Start prod server (set PORT=xxxx to change)
```

**Clear Next.js cache (if needed)**

```bash
# macOS/Linux
rm -rf .next

# Windows PowerShell
Remove-Item -Recurse -Force .next
```

---

## Usage

1. **Warm models (first run)**

   * Go to **/models**
   * Pick **Whisper**: `Xenova/whisper-base.en` (recommended) or `Xenova/whisper-small.en` (best, heavier)
   * Pick **WebLLM**: e.g. `Llama-3.2-1B-Instruct-q4f16_1-MLC` or `Phi-3-mini-4k-instruct-q4f16_1-MLC`
   * Click **Download / Warm up** for each until status shows **Ready**
     (Choices persist in `localStorage`.)

2. **Record or upload**

   * **Start recording** → allow mic → watch live transcript & summary
   * Or **Upload recording** (mp3/wav/m4a/ogg/webm) → decoded locally, transcribed in \~15s chunks

3. **Save & export**

   * **Save session** to store locally (open via **History**)
   * **Export Markdown** or **Export PDF** (Print)

4. **Fix unformatted text**

   * Paste raw text → **Fix formatting** (on-device via WebLLM/WASM)

---

## Model selection & performance tips

### Whisper (ASR)

* **Recommended:** `Xenova/whisper-base.en`
* **Best accuracy (heavier):** `Xenova/whisper-small.en`
* **Fastest (least accurate):** `Xenova/whisper-tiny.en`

**ASR decoding (pre-tuned in worker):**

* `temperature: 0` (deterministic)
* `num_beams: 5` (beam search helps names/rare words)
* `stride_length_s: 2` (overlap improves word boundaries)
* `language: 'en'` (prevents language drift)
* Cleans `[BLANK_AUDIO]` / `[MUS_AUDIO]` artifacts

**Audio tips**

* Use a decent mic; keep close; reduce noise
* Uploads are resampled to **16 kHz** automatically
* Long silences are skipped; keep recordings tidy

### WebLLM (summariser & formatter)

* **Good default:** `Llama-3.2-1B-Instruct-q4f16_1-MLC`
* **Very fast on modest machines:** `Phi-3-mini-4k-instruct-q4f16_1-MLC`
* Temperature **0.0** & an **extractive prompt** prevent invention
* WebGPU is much faster than WASM; Chrome/Edge recommended

---

## Folder structure (high level)

```
app/
  layout.tsx            # GOV.UK shell (header/footer) + SW handling in dev/prod
  page.tsx              # Home: record/upload → transcript → extractive summary
  models/page.tsx       # Model selectors + "Download / Warm up"

public/
  govuk/                # govuk-frontend.min.(css|js) + assets (copied via script)
  # other static assets…

scripts/
  copy-govuk-assets.mjs # Copies node_modules/govuk-frontend/dist/govuk → public/govuk

src/
  asr/
    asr-loader.ts       # Worker bootstrap, chunk transcribe, 16kHz pipeline, warm/dispose
    asr.worker.ts       # Whisper via @xenova/transformers (beam search, stride, etc.)
  audio/
    mic.ts              # Mic capture → PCM frames
    file.ts             # File decode (AudioContext) → mono PCM
  llm/
    webllm.ts           # WebLLM init (old signature), warm, summarize, formatter, fallback
  summarizer/
    prompt.ts           # Strict extractive JSON prompt template
    schema.ts           # Parse/validate tolerant JSON from LLM
  store/
    db.ts               # Session save/load (local browser storage)
    settings.ts         # Persist chosen model IDs (localStorage)
  styles/
    globals.css         # GOV.UK tweaks + transcript scroller (.app-scroll)
  utils/
    export.ts           # Markdown/print helpers
    resample.ts         # Linear resample → 16 kHz
```

---

## Architecture

**Recording flow**
Mic (WebAudio) → 16k PCM frames → **ASR worker** (Whisper) → transcript segments → **summariser** (WebLLM with extractive prompt) → UI

**Upload flow**
File → decode (AudioContext) → resample to 16k → chunked ASR → same summarisation flow

**Why extractive?**
Prompt + temperature 0 ensure the model **does not invent** names/decisions/dates. Unknowns are omitted.

---

## Configuration

* **Model IDs** stored in `localStorage`:

  * `asrModelId` → `Xenova/whisper-*.en`
  * `webllmModelId` → one from WebLLM `prebuiltAppConfig.model_list`
* **Service Worker**

  * **Dev:** unregistered to avoid stale Next.js chunks
  * **Prod:** you may register one (avoid caching `/_next/*` bundles)
* **Styling**

  * `public/govuk/govuk-frontend.min.css` + `.js` linked in `app/layout.tsx`
  * Header shows **PrivateScribe** (no crown/wordmark)
  * Fonts: **system-ui** stack (Transport webfont is restricted)

---

## Browser support

* **Chrome 121+ / Edge 121+** — WebGPU recommended
* **Firefox** — WASM path works; WebGPU varies by platform
* **Safari** — WASM path works; WebGPU support varies by OS

If WebGPU isn’t available, WebLLM falls back to WASM (slower but functional).

---

## Troubleshooting

**PowerShell:** `npm.ps1 cannot be loaded`
→ Use `npm.cmd` or run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Dev chunk error:** “Loading chunk … failed”
→ Due to stale SW caching. We unregister SW in dev. If stuck:

* Hard refresh **Ctrl+F5**
* DevTools → Application → Service Workers → **Unregister**
* DevTools → Application → Storage → **Clear site data**

**GOV.UK styles not applied**

* Ensure:

  * `public/govuk/govuk-frontend.min.css`
  * `public/govuk/govuk-frontend.min.js`
* In `app/layout.tsx`:

  ```html
  <link rel="stylesheet" href="/govuk/govuk-frontend.min.css" />
  <script src="/govuk/govuk-frontend.min.js" defer></script>
  ```
* Run `npm run copy:govuk` if missing

**WebLLM error:** `Cannot find model record in appConfig for [object Object]`

* Use old signature:

  ```ts
  CreateMLCEngine(modelId, { appConfig })
  ```
* Pick a model from **/models** (IDs must match exactly)

**ASR accuracy is poor**

* Use **whisper-base.en** or **whisper-small.en**
* Reduce background noise / speak closer
* Ensure uploaded audio is clean; (re)warm model once

**Clear Next.js cache**

```bash
rm -rf .next            # macOS/Linux
Remove-Item -Recurse -Force .next   # Windows PowerShell
```

---

## Security & privacy

* ASR (Transformers.js WASM) and LLM (WebGPU/WASM) run entirely **in browser**
* Audio/text never leave your device
* Sessions saved to **local browser storage**
* No analytics/telemetry by default

---

## Branding & licenses

* App name: **PrivateScribe** (non-government)
* Uses **GOV.UK Design System** styles (MIT), **without** protected government branding
* Fonts: **system-ui** stack (Transport is restricted)

**License:** MIT © 2025 Bashir Abubakar (see `LICENSE`)

**Third-party notices**

* `govuk-frontend` — MIT
* `@xenova/transformers` — MIT
* `@mlc-ai/web-llm` — Apache-2.0

---

## Contributing

1. Fork & branch: `feat/<short-name>`
2. `npm i`, `npm run dev`
3. Keep PRs focused; attach before/after notes or screenshots
4. Ensure no cloud calls; app must remain fully local by default

---

## Roadmap

* iOS app (native) using Apple **Speech** on-device + same extractive summariser
* Speaker diarisation (labels), improved timestamps
* PII redaction mode
* Model cards with size & speed guidance on **/models**
* Session export as **JSON** and **SRT**

---

## Repository setup

**Suggested repo name:** `privatescribe` or `privatescribe-web`
**Description:** `Private, on-device transcription and summarisation. GOV.UK-style UI.`

### First push

```bash
git init
git add .
git commit -m "feat: PrivateScribe on-device transcription + GOV.UK UI"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## Scripts

```bash
npm run dev        # Start Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run copy:govuk # Copy govuk-frontend dist → public/govuk
```

---

## Credits

**PrivateScribe** — developed by **Bashir Abubakar**.
UI built with the GOV.UK Design System. Not an official government service.

```
::contentReference[oaicite:0]{index=0}
```
