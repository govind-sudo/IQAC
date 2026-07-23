// utils/documentVerifier.js
//
// Step 7 of the upload pipeline: Document Verifier.

const AIService = require('../services/AIService');

const LOW_CONFIDENCE_THRESHOLD = 0.6;

// Fields that skip OCR/AI verification entirely — only the file
// signature/format check applies.
const NO_VERIFICATION_FIELDS = new Set([
  'documents[casteProof]',
]);

function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function namesLikelyMatch(ocrName, fullName) {
  if (!ocrName || !fullName) return false;
  const a = normalize(ocrName);
  const b = normalize(fullName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a) || a === b;
}

function nameLikelyPresentInText(text, fullName) {
  const normText = normalize(text);
  const parts = String(fullName || '').split(/\s+/).filter((p) => p.length > 1);
  if (!parts.length || !normText) return true;

  const hits = parts.filter((p) => normText.includes(normalize(p)));

  const requiredHits = parts.length <= 2 ? parts.length : parts.length - 1;
  return hits.length >= requiredHits;
}

function extractPassportFromText(text) {
  const m = String(text || '').match(/\b[A-PR-WYa-pr-wy][0-9]{7}\b/);
  return m ? m[0].toUpperCase() : null;
}

// ABC/APAAR IDs are 12-digit numeric identifiers, same shape as
// Aadhaar. Documents sometimes print them in grouped format
// (e.g. "1234 5678 9012") — strip whitespace before comparing, same
// approach as the Aadhaar check.
function extractAbcIdFromText(text) {
  const m = String(text || '').match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
  return m ? m[1].replace(/\s/g, '') : null;
}

/**
 * @param {Object} params
 * @param {string} params.fieldName
 * @param {Object} params.ocrResult
 * @param {Object} params.formSnapshot  { fullName, aadhaarNumber?, passportNumber?, abcId? }
 * @returns {Promise<{ verified: boolean, mismatches: Array<{type:string, message:string}> }>}
 */
async function verifyDocument({ fieldName, ocrResult, formSnapshot }) {
  if (NO_VERIFICATION_FIELDS.has(fieldName)) {
    return { verified: true, mismatches: [] };
  }

  const mismatches = [];
  const fullName = formSnapshot.fullName;

  if (!ocrResult || !ocrResult.success || !ocrResult.fullText) {
    mismatches.push({
      type: 'unreadable',
      message:
        (ocrResult && ocrResult.error) ||
        'Could not read any text from this document — please upload a clearer scan/photo.',
    });
    return { verified: false, mismatches };
  }

  // ---------- Name check ----------
  // Applies to every non-skipped document.
  const ocrName = ocrResult.englishName || ocrResult.hindiName;
  let nameOk = ocrName
    ? namesLikelyMatch(ocrName, fullName)
    : nameLikelyPresentInText(ocrResult.fullText, fullName);

  if (!nameOk) {
    nameOk = nameLikelyPresentInText(ocrResult.fullText, fullName);
  }

  const lowConfidence = (ocrResult.confidence ?? 1) < LOW_CONFIDENCE_THRESHOLD;

  if (!nameOk && lowConfidence) {
    const aiResult = await AIService.verifyName(ocrResult.fullText, fullName);
    if (aiResult) {
      nameOk = aiResult.nameMatch;
      if (!nameOk && aiResult.notes) {
        mismatches.push({ type: 'name', message: `Name "${fullName}" not clearly found on the document. (${aiResult.notes})` });
      }
    }
  }

  if (!nameOk && !mismatches.some((m) => m.type === 'name')) {
    mismatches.push({ type: 'name', message: `Name "${fullName}" was not clearly found on the document.` });

    console.log('[documentVerifier] name mismatch debug:', {
      fieldName,
      expectedName: fullName,
      ocrEnglishName: ocrResult.englishName,
      ocrHindiName: ocrResult.hindiName,
      ocrConfidence: ocrResult.confidence,
      ocrFullTextPreview: (ocrResult.fullText || '').slice(0, 300),
    });
  }

  // ---------- Aadhaar check ----------
  // documents[aadhaarProof] ONLY.
  if (fieldName === 'documents[aadhaarProof]' && formSnapshot.aadhaarNumber) {
    const found = ocrResult.aadhaar;
    const expected = String(formSnapshot.aadhaarNumber).replace(/\s/g, '');
    if (!found || found !== expected) {
      mismatches.push({
        type: 'aadhaar',
        message: `Aadhaar number on document (${found || 'not found'}) does not match the number entered on the form.`,
      });
    }
  }

  // ---------- Passport check ----------
  // documents[passportUpload] ONLY.
  if (fieldName === 'documents[passportUpload]' && formSnapshot.passportNumber) {
    const found = extractPassportFromText(ocrResult.fullText);
    const expected = String(formSnapshot.passportNumber).toUpperCase().replace(/\s/g, '');
    if (!found || found !== expected) {
      mismatches.push({
        type: 'passport',
        message: `Passport number on document (${found || 'not found'}) does not match the number entered on the form.`,
      });
    }
  }

  // ---------- ABC/APAAR ID check ----------
  // documents[abcIdProof] ONLY. abcId on the form is optional (12-digit
  // ID, if the student has one) — only checked if they actually
  // provided a value AND uploaded this proof.
  if (fieldName === 'documents[abcIdProof]' && formSnapshot.abcId) {
    const found = extractAbcIdFromText(ocrResult.fullText);
    const expected = String(formSnapshot.abcId).replace(/\s/g, '');
    if (!found || found !== expected) {
      mismatches.push({
        type: 'abcId',
        message: `ABC/APAAR ID on document (${found || 'not found'}) does not match the ID entered on the form.`,
      });
    }
  }

  return { verified: mismatches.length === 0, mismatches };
}

module.exports = { verifyDocument, NO_VERIFICATION_FIELDS };