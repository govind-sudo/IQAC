#!/usr/bin/env bash
# setup.sh — one-shot environment setup for Linux/macOS.
# Installs Node dependencies, creates a Python venv, installs PaddleOCR's
# Python dependencies into it, and installs poppler-utils (needed by
# pdf2image to rasterize PDF pages before OCR).
set -euo pipefail

echo "==> Installing Node.js dependencies..."
npm install

echo "==> Removing OCR/AI packages no longer used (tesseract.js, Anthropic SDK)..."
npm uninstall tesseract.js @anthropic-ai/sdk --save 2>/dev/null || true

echo "==> Creating Python virtual environment (.venv)..."
python3 -m venv .venv
source .venv/bin/activate

echo "==> Installing Python dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Installing poppler-utils (required by pdf2image)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y poppler-utils
elif command -v brew >/dev/null 2>&1; then
  brew install poppler
else
  echo "WARNING: could not detect apt or brew. Please install poppler-utils manually:"
  echo "  Debian/Ubuntu: sudo apt-get install -y poppler-utils"
  echo "  macOS:         brew install poppler"
fi

echo "==> Setting up .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — remember to fill in GEMINI_API_KEY."
else
  echo ".env already exists, leaving it untouched."
fi

echo ""
echo "Setup complete."
echo "Set PADDLE_OCR_PYTHON_BIN in .env to: $(pwd)/.venv/bin/python3"
echo "Then run your Node app as usual (e.g. npm start)."
