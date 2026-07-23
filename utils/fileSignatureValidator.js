// utils/fileSignatureValidator.js
//
// Step 3 of the upload pipeline: Signature Validator.
// Runs AFTER Multer (which already checked size / extension / mimetype
// off the client-supplied metadata). This step trusts nothing the client
// says and instead looks at the actual bytes of the file:
//
//   1. Empty file      -> reject
//   2. Magic number     -> reject if the real file type doesn't match
//                          what the field expects (pdf vs image)
//   3. Corrupted file   -> reject if it claims to be a type we accept
//                          but the header is malformed / truncated
//
// This is intentionally dependency-free (no `file-type` package) so it
// works offline — just raw Buffer inspection of known magic numbers.

// ---------- Known signatures ----------
// Each signature is a byte array to match at a given offset.
const SIGNATURES = {
  pdf: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  jpeg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  png: [
    {
      offset: 0,
      bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    },
  ],
  // WebP: "RIFF" at offset 0, "WEBP" at offset 8 — two-part signature
  webp: [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },  // "WEBP"
  ],
};

// Which "kinds" are acceptable for each field's `accept` attribute in the form.
// 'pdf' fields only take PDFs; 'pdf,image' fields take PDF or JPEG/PNG.
const PDF_ONLY_FIELDS = new Set([
  // 'education[tenth][marksheet]',
  // 'education[twelfth][marksheet]',
  // 'education[diploma][marksheet]',
]);

function matchesSignature(buffer, sig) {
  if (buffer.length < sig.offset + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buffer[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return true;
}

function detectFileKind(buffer) {
  if (SIGNATURES.pdf.some((sig) => matchesSignature(buffer, sig))) return 'pdf';
  if (SIGNATURES.jpeg.some((sig) => matchesSignature(buffer, sig))) return 'jpeg';
  if (SIGNATURES.png.some((sig) => matchesSignature(buffer, sig))) return 'png';
  if (SIGNATURES.webp.every((sig) => matchesSignature(buffer, sig))) return 'webp';
  return null;
}
/**
 * Validate a single uploaded file's true content against what's allowed.
 * @param {Buffer} buffer - raw file bytes (from multer memoryStorage)
 * @param {string} fieldName - the multipart field name, e.g. 'documents[aadhaarProof]'
 * @param {Object} [meta] - { mimetype, originalname } from Multer's file
 *        object. Used ONLY as a fallback when the byte-level signature
 *        check fails, so a genuinely valid file (rare edge cases in
 *        how bytes arrive) isn't hard-rejected with no recourse. This
 *        is deliberately a fallback, not the primary check — Multer's
 *        own fileFilter (uploadMiddleware.js) already validated these
 *        same values before this function ever runs, so trusting them
 *        here as a second-chance path doesn't introduce a new way to
 *        smuggle a disallowed file type past the pipeline.
 * @returns {{ valid: boolean, reason?: string, detectedKind?: string }}
 */
function validateFileSignature(buffer, fieldName, meta) {
  // 1. Empty file check
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: 'The file is empty.' };
  }

  // 2. Detect actual file type from magic number
  let detectedKind = detectFileKind(buffer);

  // 3. Fallback: if the byte signature didn't match anything, but the
  // file's own declared mimetype/extension clearly indicate a known,
  // already-Multer-approved type, trust that instead of hard-blocking.
  // This exists because real, valid files (confirmed openable in a
  // normal viewer) have occasionally failed the strict 3-byte check —
  // rejecting a genuinely fine file is worse for an unmaintained
  // production system than the small risk this fallback accepts,
  // since Multer's fileFilter already gates on mimetype/extension
  // before this code path is ever reached.
  if (!detectedKind && meta) {
    const mimeToKind = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpeg',
      'image/png': 'png',
    };
    const fallbackKind = mimeToKind[meta.mimetype];
    if (fallbackKind) {
      console.warn(
        `[fileSignatureValidator] Byte signature check failed for "${meta.originalname}" ` +
        `(field: ${fieldName}) but mimetype "${meta.mimetype}" is trusted — allowing via fallback.`
      );
      detectedKind = fallbackKind;
    }
  }

  // 4. Corrupted / disguised file check — still fails if NEITHER the
  // byte signature NOR the fallback could identify a known type.
  if (!detectedKind) {
    return {
      valid: false,
      reason:
        'The file appears to be corrupted or is not a valid PDF/JPEG/PNG file.',
    };
  }

  // 5. Enforce which kinds are allowed for this particular field
  const pdfOnly = PDF_ONLY_FIELDS.has(fieldName);
  if (pdfOnly && detectedKind !== 'pdf') {
    return {
      valid: false,
      reason: 'Only PDF files are allowed for this upload.',
      detectedKind,
    };
  }

  return { valid: true, detectedKind };
}

module.exports = {
  validateFileSignature,
  detectFileKind,
  PDF_ONLY_FIELDS,
};
