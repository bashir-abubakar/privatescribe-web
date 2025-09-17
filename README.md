# PrivateScribe
Private, **on-device** transcription + summarisation with a clean GOV.UK-style UI.

- 🎙️ Live mic capture or **upload a recording** (mp3/wav/m4a/ogg/webm)
- 🔤 **Whisper** (Transformers.js) for ASR — runs in your browser
- 🧠 **WebLLM** for extractive summaries & text cleanup — runs with WebGPU/WASM
- 🗂️ **Session history**, export **Markdown** / **print to PDF**
- 🧱 GOV.UK Design System styling (no gov branding; private project)

> **Privacy:** Audio and text **never leave your device**. No servers required.

---

## Requirements
- **Node.js** 18+ (tested on Node **22.19.0**)
- **Windows 10/11** or macOS, Linux
- **Chrome / Edge** (WebGPU preferred)  
  _Check WebGPU: chrome://gpu → “WebGPU” should be enabled._

---

## Quick start (Windows PowerShell)
```powershell
# If PowerShell blocks npm.ps1, either:
# 1) use npm.cmd, OR 2) allow scripts in this session only:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Install deps
npm.cmd install

# Copy GOV.UK dist (CSS/JS/assets) into /public/govuk
npm.cmd run copy:govuk

# Start dev server
npm.cmd run dev
# → open http://localhost:3000
