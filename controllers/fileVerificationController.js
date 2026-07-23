// controllers/fileVerificationController.js
//
// Backs two new AJAX-only endpoints used *before* form submission:
//
//   POST /register/validate-file    -> fast signature check (⏳ -> ✅/❌)
//   POST /register/verify-document  -> OCR + semantic compare against
//                                       the form fields the student has
//                                       typed so far
//
// Fields listed in documentVerifier.NO_VERIFICATION_FIELDS (currently
// just caste certificate) skip the OCR call entirely — no text
// extraction, no AI, just the signature/format check that already
// happened. This saves real OCR work for documents where automated
// name-matching isn't reliable anyway.

const { validateFileSignature } = require('../utils/fileSignatureValidator');
const { extractText } = require('../utils/ocrTextExtractor');
const { verifyDocument, NO_VERIFICATION_FIELDS } = require('../utils/documentVerifier');

// ---------- POST /register/validate-file ----------
exports.validateFile = (req, res) => {
  const file = req.file;
  const fieldName = req.body.fieldName;

  if (!fieldName) {
    return res.status(400).json({ valid: false, reason: 'Missing fieldName.' });
  }
  if (!file) {
    return res.status(400).json({ valid: false, reason: 'No file received.' });
  }

  const result = validateFileSignature(file.buffer, fieldName, {
    mimetype: file.mimetype,
    originalname: file.originalname,
  });
  return res.json({
    valid: result.valid,
    reason: result.valid ? undefined : result.reason,
    detectedKind: result.detectedKind,
  });
};

// ---------- POST /register/verify-document ----------
exports.verifyDocumentField = async (req, res) => {
  try {
    const file = req.file;
    const fieldName = req.body.fieldName;

    if (!fieldName) {
      return res.status(400).json({ verified: false, mismatches: [{ type: 'field', message: 'Missing fieldName.' }] });
    }
    if (!file) {
      return res.status(400).json({ verified: false, mismatches: [{ type: 'file', message: 'No file received.' }] });
    }

    const sig = validateFileSignature(file.buffer, fieldName, {
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    if (!sig.valid) {
      return res.json({ verified: false, mismatches: [{ type: 'file', message: sig.reason }] });
    }

    // Skip OCR/AI entirely for fields that don't need it — e.g. caste
    // certificate. Saves real compute, not just a formality.
    if (NO_VERIFICATION_FIELDS.has(fieldName)) {
      return res.json({ verified: true, mismatches: [] });
    }

    let formSnapshot = {};
    try {
      formSnapshot = JSON.parse(req.body.formSnapshot || '{}');
    } catch (_) {
      // malformed snapshot — proceed with an empty one rather than 500ing
    }

    const ocrResult = await extractText(file.buffer, sig.detectedKind, fieldName);
    const result = await verifyDocument({ fieldName, ocrResult, formSnapshot });

    return res.json(result);
  } catch (err) {
    console.error('verifyDocumentField error:', err);
    return res.status(500).json({
      verified: false,
      mismatches: [{ type: 'server', message: 'Verification failed — please retry.' }],
    });
  }
};