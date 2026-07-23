# Document Verification Pipeline — Setup

This project verifies uploaded student documents in two stages:

1. **File signature check** (`utils/fileSignatureValidator.js`) — confirms the file is really a PDF/JPEG/PNG.
2. **OCR + semantic check** — **PaddleOCR** (English + Hindi) extracts structured fields (`utils/ocrTextExtractor.js` → `scripts/paddle_ocr.py`), and `utils/documentVerifier.js` compares them against the form. If PaddleOCR's confidence is low, **Gemini** (`services/AIService.js` → `providers/GeminiProvider.js`) is consulted as a fallback name check only.

No Tesseract.js or Anthropic SDK is used anywhere in this pipeline.

---

## Prerequisites

- Node.js 18+
- Python 3.9–3.11 (PaddleOCR does not yet support every latest Python version — check PaddleOCR's release notes if `pip install` fails)
- Poppler (so `pdf2image` can rasterize PDF pages before OCR)

---

## Quick setup

### Linux / macOS

```bash
chmod +x setup.sh
./setup.sh
```

This installs Node packages, removes the old `tesseract.js`/`@anthropic-ai/sdk` packages, creates a `.venv`, installs `requirements.txt` into it, and installs `poppler-utils` via `apt-get` or `brew` if available.

### Windows

```bat
setup.bat
```

This installs Node packages, removes the old `tesseract.js`/`@anthropic-ai/sdk` packages, creates a `.venv`, and installs `requirements.txt` into it. **Poppler must be installed manually** (see below) — there's no standard Windows package manager for it.

---

## Manual setup (either OS)

### 1. Node dependencies

```bash
npm install
npm uninstall tesseract.js @anthropic-ai/sdk
```

### 2. Python environment

```bash
# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows
py -m venv .venv
.venv\Scripts\activate.bat
```

```bash
pip install -r requirements.txt
```

### 3. Poppler (required by `pdf2image` for PDF uploads)

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

**macOS:**
```bash
brew install poppler
```

**Windows:**
1. Download a build from [oschwartz10612/poppler-windows releases](https://github.com/oschwartz10612/poppler-windows/releases).
2. Extract it anywhere, e.g. `C:\poppler-24.08.0`.
3. Note the `Library\bin` subfolder inside it — that's what `POPPLER_PATH` points to.

### 4. Environment variables

```bash
cp .env.example .env      # Linux/macOS
copy .env.example .env    # Windows
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `gemini` (default; extensible — see `services/AIService.js`) |
| `GEMINI_API_KEY` | Your Gemini API key (free developer tier) |
| `GEMINI_MODEL` | Defaults to `gemini-1.5-flash` if unset |
| `PADDLE_OCR_PYTHON_BIN` | Full path to the Python interpreter **inside your `.venv`** (e.g. `.venv/bin/python3` on Linux, `.venv\Scripts\python.exe` on Windows) |
| `POPPLER_PATH` | Windows only — the `Library\bin` folder from step 3. Leave blank on Linux/macOS. |

---

## Running

```bash
npm start
```

File uploads are validated instantly on selection (signature check), then OCR'd and semantically compared in the background — see `public/js/fileVerification.js` for the client-side flow, and `routes/registrationRoutes.js` for the two AJAX endpoints (`/register/validate-file`, `/register/verify-document`).

---

## Adding another AI provider later

`services/AIService.js` picks a provider purely off `AI_PROVIDER` in `.env` and expects each provider module (in `providers/`) to export `isConfigured()` and `verifyName(text, fullName)`. To add e.g. OpenAI:

1. Create `providers/OpenAIProvider.js` exporting the same two functions.
2. Register it in the `PROVIDERS` map in `services/AIService.js`.
3. Set `AI_PROVIDER=openai` in `.env`.

`documentVerifier.js` never needs to change.
