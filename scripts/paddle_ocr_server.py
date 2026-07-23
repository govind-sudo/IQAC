#!/usr/bin/env python3
"""
scripts/paddle_ocr_server.py

Persistent OCR service. Loads PaddleOCR's English + Hindi models ONCE
per worker process and keeps them resident in memory.

PERFORMANCE REWRITE (this version):
  1. Uses PP-OCRv5 MOBILE models instead of the heavier server-grade
     models — dramatically faster/lighter, small accuracy tradeoff on
     clean printed ID documents.
  2. Only runs the Hindi engine if the English pass came back with low
     confidence or very little text — most documents are English-only,
     so this roughly halves OCR work per document in the common case.
  3. Only rasterizes and OCRs the FIRST page of a PDF — ID documents,
     marksheets, and certificates are always single-page.

Endpoints:
  POST /ocr    multipart file upload -> JSON (success, fullText,
               englishName, hindiName, aadhaar, dob, gender,
               confidence, error)
  GET  /health -> {"status": "ok", "workers": N}

Run (dev):
    python scripts/paddle_ocr_server.py
"""

import os
import re
import json
import tempfile
import multiprocessing as mp

from flask import Flask, request, jsonify

try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    load_dotenv(_env_path)
    print(f"[paddle_ocr_server] loaded env from {_env_path}", flush=True)
except ImportError:
    print("[paddle_ocr_server] WARNING: python-dotenv not installed — "
          "run: pip install python-dotenv", flush=True)

PADDLE_WORKERS = int(os.environ.get("PADDLE_WORKERS", "4"))

ENGLISH_ONLY_CONFIDENCE_THRESHOLD = float(os.environ.get("ENGLISH_ONLY_CONFIDENCE_THRESHOLD", "0.75"))
ENGLISH_ONLY_MIN_LINES = int(os.environ.get("ENGLISH_ONLY_MIN_LINES", "4"))
PDF_RENDER_DPI = int(os.environ.get("PDF_RENDER_DPI", "200"))

# Page limits are per document type, not a blanket single-page rule.
# Aadhaar cards and marksheets are always exactly one page — capping
# those keeps the fast path fast. Caste certificates, leaving
# certificates, PU admission letters, and passports can legitimately
# span multiple pages (stamps/attestations on a second page, passport
# bio + address pages, etc.), so they get a higher cap. The upper bound
# still exists everywhere so an accidental huge PDF upload can't hang
# a worker indefinitely.
SINGLE_PAGE_FIELDS = {
    "documents[aadhaarProof]",
    "education[tenth][marksheet]",
    "education[twelfth][marksheet]",
    "education[diploma][marksheet]",
}
DEFAULT_MAX_PDF_PAGES = int(os.environ.get("MAX_PDF_PAGES", "5"))


def _max_pages_for(field_name):
    if field_name in SINGLE_PAGE_FIELDS:
        return 1
    return DEFAULT_MAX_PDF_PAGES
_ENGINE_CACHE = {}


def _build_engine(lang):
    from paddleocr import PaddleOCR

    mobile_kwargs = dict(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name=(
            "PP-OCRv5_mobile_rec" if lang == "en" else "devanagari_PP-OCRv5_mobile_rec"
        ),
    )

    def build(**extra_kwargs):
        return PaddleOCR(
            lang=lang,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            enable_mkldnn=False,
            **extra_kwargs,
        )

    try:
        return build(**mobile_kwargs)
    except TypeError:
        try:
            return build()
        except TypeError:
            from paddleocr import PaddleOCR as _PaddleOCR
            return _PaddleOCR(lang=lang, use_textline_orientation=False)


def _init_worker():
    global _ENGINE_CACHE
    _ENGINE_CACHE["en"] = _build_engine("en")
    print(f"[paddle_ocr_server] worker {os.getpid()} English model loaded (mobile tier).", flush=True)


def _get_hindi_engine():
    if "hi" not in _ENGINE_CACHE:
        _ENGINE_CACHE["hi"] = _build_engine("hi")
        print(f"[paddle_ocr_server] worker {os.getpid()} Hindi model loaded on demand (mobile tier).", flush=True)
    return _ENGINE_CACHE["hi"]


def _load_images(file_path, field_name=None, dpi=None):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        from pdf2image import convert_from_path
        poppler_path = os.environ.get("POPPLER_PATH") or None
        max_pages = _max_pages_for(field_name)
        return convert_from_path(
            file_path,
            dpi=dpi or FAST_DPI,
            poppler_path=poppler_path,
            first_page=1,
            last_page=max_pages,
        )
    from PIL import Image
    return [Image.open(file_path)]

def _run_engine(engine, images):
    import numpy as np
    lines = []
    for img in images:
        arr = np.array(img.convert("RGB"))
        results = engine.predict(arr)
        if not results:
            continue
        for res in results:
            texts = res.get("rec_texts") or res.get("rec_text") or []
            scores = res.get("rec_scores") or res.get("rec_score") or []
            for i, text in enumerate(texts):
                if not text or not str(text).strip():
                    continue
                score = scores[i] if i < len(scores) else None
                lines.append((str(text).strip(), score))
    return lines


def _run_ocr(images):
    ocr_en = _ENGINE_CACHE["en"]
    en_lines = _run_engine(ocr_en, images)

    en_confidences = [s for _, s in en_lines if isinstance(s, (int, float))]
    en_avg_conf = sum(en_confidences) / len(en_confidences) if en_confidences else 0.0

    needs_hindi = (en_avg_conf < ENGLISH_ONLY_CONFIDENCE_THRESHOLD) or (len(en_lines) < ENGLISH_ONLY_MIN_LINES)

    if not needs_hindi:
        return en_lines

    ocr_hi = _get_hindi_engine()
    hi_lines = _run_engine(ocr_hi, images)
    return en_lines + hi_lines


def _extract_fields(lines):
    full_text = "\n".join(t for t, _ in lines)

    aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text)
    aadhaar = aadhaar_match.group(1).replace(" ", "") if aadhaar_match else None

    dob_match = re.search(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", full_text)
    dob = dob_match.group(1) if dob_match else None

    gender = None
    lowered = full_text.lower()
    if re.search(r"\bmale\b", lowered) and "female" not in lowered:
        gender = "MALE"
    elif re.search(r"\bfemale\b", lowered):
        gender = "FEMALE"

    hindi_name = None
    english_name = None
    devanagari_re = re.compile(r"[\u0900-\u097F][\u0900-\u097F\s]{2,}")
    latin_name_re = re.compile(r"^[A-Za-z][A-Za-z\s\.]{2,40}$")

    for text, score in lines:
        if hindi_name is None and devanagari_re.search(text):
            hindi_name = text.strip()
        elif english_name is None and latin_name_re.match(text.strip()):
            if not re.search(r"government|india|aadhaar|male|female|dob|year|birth", text, re.I):
                english_name = text.strip()
        if hindi_name and english_name:
            break

    confidences = [s for _, s in lines if isinstance(s, (int, float))]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return {
        "fullText": full_text,
        "englishName": english_name,
        "hindiName": hindi_name,
        "aadhaar": aadhaar,
        "dob": dob,
        "gender": gender,
        "confidence": round(avg_conf, 3),
    }

FAST_DPI = int(os.environ.get("PDF_RENDER_DPI", "200"))
HIGH_QUALITY_DPI = int(os.environ.get("PDF_RENDER_DPI_HIGH", "300"))
RETRY_CONFIDENCE_THRESHOLD = float(os.environ.get("PDF_RETRY_CONFIDENCE_THRESHOLD", "0.55"))


def _process_file(file_path, field_name=None):
    ext = os.path.splitext(file_path)[1].lower()
    is_pdf = ext == ".pdf"

    try:
        images = _load_images(file_path, field_name, dpi=FAST_DPI if is_pdf else None)
    except Exception as e:
        return {"success": False, "error": f"Failed to load file for OCR: {e}",
                "fullText": "", "englishName": None, "hindiName": None,
                "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}

    try:
        lines = _run_ocr(images)
    except Exception as e:
        return {"success": False, "error": f"PaddleOCR failed: {e}",
                "fullText": "", "englishName": None, "hindiName": None,
                "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}

    confidences = [s for _, s in lines if isinstance(s, (int, float))]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    # If this was a fast-DPI PDF pass and confidence came back low
    # (likely a scanned photo saved as PDF, not a clean digital PDF),
    # retry once at higher DPI before giving up. Images never hit this
    # path — their quality is fixed at capture time regardless of any
    # DPI setting here.
    if is_pdf and avg_conf < RETRY_CONFIDENCE_THRESHOLD and avg_conf > 0:
        print(f"[paddle_ocr_server] low confidence ({avg_conf:.2f}) at {FAST_DPI} DPI, "
              f"retrying at {HIGH_QUALITY_DPI} DPI...", flush=True)
        try:
            hq_images = _load_images(file_path, field_name, dpi=HIGH_QUALITY_DPI)
            hq_lines = _run_ocr(hq_images)
            hq_confidences = [s for _, s in hq_lines if isinstance(s, (int, float))]
            hq_avg_conf = sum(hq_confidences) / len(hq_confidences) if hq_confidences else 0.0
            if hq_avg_conf > avg_conf:
                lines = hq_lines
        except Exception:
            pass  # keep the original fast-pass result rather than failing entirely

    if not lines:
        return {"success": False, "error": "No text detected in document.",
                "fullText": "", "englishName": None, "hindiName": None,
                "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}

    fields = _extract_fields(lines)
    return {"success": True, "error": None, **fields}

app = Flask(__name__)
_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = mp.Pool(processes=PADDLE_WORKERS, initializer=_init_worker)
    return _pool


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "workers": PADDLE_WORKERS})


@app.route("/ocr", methods=["POST"])
def ocr():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file provided.",
                         "fullText": "", "englishName": None, "hindiName": None,
                         "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}), 400

    f = request.files["file"]
    field_name = request.form.get("fieldName")
    suffix = os.path.splitext(f.filename or "")[1].lower() or ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = get_pool().apply_async(_process_file, (tmp_path, field_name)).get(timeout=180)
        return jsonify(result)
    except mp.TimeoutError:
        return jsonify({"success": False, "error": "OCR timed out.",
                         "fullText": "", "englishName": None, "hindiName": None,
                         "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}), 504
    except Exception as e:
        return jsonify({"success": False, "error": f"OCR service error: {e}",
                         "fullText": "", "englishName": None, "hindiName": None,
                         "aadhaar": None, "dob": None, "gender": None, "confidence": 0.0}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    get_pool()
    app.run(host="0.0.0.0", port=int(os.environ.get("PADDLE_OCR_PORT", "8000")), threaded=True)