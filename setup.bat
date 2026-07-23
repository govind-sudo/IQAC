@echo off
REM setup.bat — one-shot environment setup for Windows.
REM Installs Node dependencies, creates a Python venv, installs
REM PaddleOCR's Python dependencies into it. Poppler must be installed
REM manually on Windows (no standard package manager for it) — see
REM README.md for the download link and POPPLER_PATH setup.

echo ==> Installing Node.js dependencies...
call npm install
if errorlevel 1 goto :error

echo ==> Removing OCR/AI packages no longer used (tesseract.js, Anthropic SDK)...
call npm uninstall tesseract.js @anthropic-ai/sdk --save

echo ==> Creating Python virtual environment (.venv)...
py -m venv .venv
if errorlevel 1 goto :error

call .venv\Scripts\activate.bat

echo ==> Installing Python dependencies from requirements.txt...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo ==> Setting up .env...
if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example — remember to fill in GEMINI_API_KEY.
) else (
    echo .env already exists, leaving it untouched.
)

echo.
echo Setup complete.
echo IMPORTANT: Poppler is NOT installed automatically on Windows.
echo   1. Download it from: https://github.com/oschwartz10612/poppler-windows/releases
echo   2. Extract it anywhere, e.g. C:\poppler-24.08.0
echo   3. In .env, set POPPLER_PATH=C:\poppler-24.08.0\Library\bin
echo   4. In .env, set PADDLE_OCR_PYTHON_BIN=%cd%\.venv\Scripts\python.exe
echo Then run your Node app as usual (e.g. npm start).
goto :eof

:error
echo Setup failed — see the error above.
exit /b 1
