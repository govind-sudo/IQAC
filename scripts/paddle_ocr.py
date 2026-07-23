#!/usr/bin/env python3
"""
scripts/paddle_ocr.py

Step 6 of the upload pipeline. Invoked as a subprocess by
utils/ocrTextExtractor.js — receives a file path as argv[1], prints ONE
line of JSON to stdout, and exits 0. Node side (ocrTextExtractor.js) is
unchanged — this file owns the entire OCR-engine-version contract.

Updated for PaddleOCR >= 3.x API:
  - `use_angle_cls` (deprecated)             -> `use_textline_orientation`
  - `engine.ocr(arr, cls=True)` (deprecated) -> `engine.predict(arr)`
  - Result shape changed from nested [ [ [box, (text, score)], ... ] ]
    lists to a list of OCRResult objects exposing dict-style keys:
    `rec_texts` (list[str]) and `rec_scores` (list[float]).

Usage:
    python paddle_ocr.py /tmp/upload_abc123.pdf
    python paddle_ocr.py /tmp/upload_abc123.jpg

Output (always valid JSON, always exit code 0 — errors are reported
IN the JSON so the Node side never has to parse stderr):
{
  "success": true,
  "fullText": "...",
  "englishName": "RAHUL SHARMA" | null,
  "hindiName": "राहुल शर्मा" | null,
  "aadhaar": "123412341234" | null,
  "dob": "01/01/2005" | null,
  "gender": "MALE" | "FEMALE" | null,
  "confidence": 0.0-1.0,
  "error": null | "message"
}

Install:
    pip install paddleocr paddlepaddle pdf2image
    # pdf2image also needs poppler-utils installed at the OS level
    #   Debian/Ubuntu: apt-get install -y poppler-utils
    #   Windows: see README.md — set POPPLER_PATH in .env
"""

import sys
import json
import re
import os

# All heavy imports are done lazily / defensively so a missing dependency
# still produces a clean JSON error instead of a Python traceback that
# Node would have to fish an error message out of.
def _fail(message):
    print(json.dumps({
        "success": False,
        "fullText": "",
        "englishName": None,
        "hindiName": None,
        "aadhaar": None,
        "dob": None,
        "gender": None,
        "confidence": 0.0,
        "error": message,
    }))
    sys.exit(0)


def load_images(file_path):
    """Return a list of PIL-compatible image objects for OCR, one per page."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        from pdf2image import convert_from_path
        # On Windows, poppler isn't usually on PATH — POPPLER_PATH should
        # point at the folder containing pdftoppm.exe / pdfinfo.exe (the
        # \Library\bin or \poppler-xx\bin folder from the release zip).
        # On Linux, poppler-utils installs onto PATH already, so
        # POPPLER_PATH is left unset and pdf2image finds the binaries itself.
        poppler_path = os.environ.get("POPPLER_PATH") or None
        pages = convert_from_path(file_path, dpi=300, poppler_path=poppler_path)
        return pages  # list of PIL Images
    else:
        from PIL import Image
        return [Image.open(file_path)]


_ENGINE_CACHE = {}


def get_engine(lang):
    """
    Lazily build (and cache) a PaddleOCR engine per language. Building
    these is expensive (model load), so re-using across pages of the
    same document within a single script run matters even though Node
    spawns a fresh process per document.
    """
    if lang not in _ENGINE_CACHE:
        from paddleocr import PaddleOCR

        def build(**extra_kwargs):
            # PaddleOCR >= 3.x renamed `use_angle_cls` to
            # `use_textline_orientation`. `show_log` was also dropped from
            # the public constructor in 3.x.
            #
            # `use_doc_orientation_classify` / `use_doc_unwarping` /
            # `use_textline_orientation` are new 3.x preprocessing stages
            # (PP-LCNet_x1_0_doc_ori, UVDoc, PP-LCNet_x1_0_textline_ori)
            # that run before detection/recognition. On Windows CPU builds
            # these can hit a PaddlePaddle oneDNN/PIR-executor bug:
            #   "(Unimplemented) ConvertPirAttribute2RuntimeAttribute
            #    not support [pir::ArrayAttribute<pir::DoubleAttribute>]"
            # Since uploaded ID photos are typically upright and flat, we
            # disable these preprocessing stages by default — this both
            # avoids the crash and is faster (fewer models loaded/run).
            # `enable_mkldnn=False` is a second safety net in case the
            # same oneDNN path gets hit elsewhere on this machine.
            return PaddleOCR(
                lang=lang,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                enable_mkldnn=False,
                **extra_kwargs,
            )

        try:
            _ENGINE_CACHE[lang] = build()
        except TypeError:
            # Older/newer PaddleOCR point release that doesn't recognize
            # one of the flags above — fall back to the minimal safe set
            # rather than hard-failing every OCR call.
            _ENGINE_CACHE[lang] = PaddleOCR(lang=lang, use_textline_orientation=False)
    return _ENGINE_CACHE[lang]


def run_ocr(images):
    """Run PaddleOCR (English + Hindi) over every page, return combined (text, score) lines."""
    import numpy as np

    ocr_en = get_engine("en")
    ocr_hi = get_engine("hi")

    all_lines = []
    for img in images:
        arr = np.array(img.convert("RGB"))

        for engine in (ocr_en, ocr_hi):
            # PaddleOCR 3.x: `.ocr(arr, cls=True)` is deprecated in favor
            # of `.predict(arr)`, which returns a list of OCRResult
            # objects (one per input image) exposing `rec_texts` /
            # `rec_scores` rather than the old nested box/text/score lists.
            results = engine.predict(arr)
            if not results:
                continue

            for res in results:
                # OCRResult supports dict-style access; different 3.x
                # point releases have used both `rec_texts`/`rec_scores`
                # (plural, list) — guard with .get() and both key spellings
                # so a minor version bump doesn't silently produce empty text.
                texts = res.get("rec_texts") or res.get("rec_text") or []
                scores = res.get("rec_scores") or res.get("rec_score") or []

                for i, text in enumerate(texts):
                    if not text or not str(text).strip():
                        continue
                    score = scores[i] if i < len(scores) else None
                    all_lines.append((str(text).strip(), score))

    return all_lines


def extract_fields(lines):
    """Regex/heuristic extraction of structured fields from raw OCR lines."""
    full_text = "\n".join(t for t, _ in lines)

    # ---------- Aadhaar number: 4-4-4 digit groups ----------
    aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text)
    aadhaar = aadhaar_match.group(1).replace(" ", "") if aadhaar_match else None

    # ---------- DOB: common Indian document formats ----------
    dob_match = re.search(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", full_text)
    dob = dob_match.group(1) if dob_match else None

    # ---------- Gender ----------
    gender = None
    lowered = full_text.lower()
    if re.search(r"\bmale\b", lowered) and "female" not in lowered:
        gender = "MALE"
    elif re.search(r"\bfemale\b", lowered):
        gender = "FEMALE"

    # ---------- Names ----------
    # Devanagari Unicode block: \u0900-\u097F
    hindi_name = None
    english_name = None
    devanagari_re = re.compile(r"[\u0900-\u097F][\u0900-\u097F\s]{2,}")
    latin_name_re = re.compile(r"^[A-Za-z][A-Za-z\s\.]{2,40}$")

    for text, score in lines:
        if hindi_name is None and devanagari_re.search(text):
            hindi_name = text.strip()
        elif english_name is None and latin_name_re.match(text.strip()):
            # Skip obvious non-name boilerplate frequently printed on IDs
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


def main():
    if len(sys.argv) < 2:
        _fail("No file path provided.")

    file_path = sys.argv[1]
    if not os.path.isfile(file_path):
        _fail(f"File not found: {file_path}")

    try:
        images = load_images(file_path)
    except Exception as e:
        _fail(f"Failed to load file for OCR: {e}")

    try:
        lines = run_ocr(images)
    except Exception as e:
        _fail(f"PaddleOCR failed: {e}")

    if not lines:
        _fail("No text detected in document.")

    fields = extract_fields(lines)
    print(json.dumps({
        "success": True,
        "error": None,
        **fields,
    }))


if __name__ == "__main__":
    main()
