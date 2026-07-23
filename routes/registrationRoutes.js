// // routes/registrationRoutes.js

// const express = require('express');
// const router = express.Router();
// const multer = require('multer');

// const {
//   showRegisterForm,
//   registerStudent,
// } = require('../controllers/registrationController');

// const {
//   validateFile,
//   verifyDocumentField,
// } = require('../controllers/fileVerificationController');

// const { handleUpload } = require('../middleware/uploadMiddleware');
// const validateFileSignatures = require('../middleware/validateFileSignatures');

// router.get('/register', showRegisterForm);

// // Pipeline: Upload Middleware (Multer) -> Signature Validator -> Controller
// router.post('/register', handleUpload, validateFileSignatures, registerStudent);

// // ---------- Pre-submit AJAX verification (new) ----------
// // Single-file, memory-only upload — never touches disk. Same 5MB ceiling
// // as the real submission pipeline (uploadMiddleware.js).
// const singleFileUpload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 5 * 1024 * 1024 },
// }).single('file');

// function handleSingleUpload(req, res, next) {
//   singleFileUpload(req, res, (err) => {
//     if (err) {
//       const message =
//         err.code === 'LIMIT_FILE_SIZE'
//           ? 'File exceeds the maximum allowed size of 5MB.'
//           : err.message || 'Upload failed.';
//       return res.status(400).json({ valid: false, verified: false, reason: message });
//     }
//     next();
//   });
// }

// // Fast signature-only check — fires immediately on file selection.
// router.post('/register/validate-file', handleSingleUpload, validateFile);

// // OCR + semantic (name / Aadhaar / passport / percentage) check — fires
// // only after the signature check above has already passed.
// router.post('/register/verify-document', handleSingleUpload, verifyDocumentField);

// module.exports = router;






// routes/registrationRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  showRegisterForm,
  registerStudent,
} = require('../controllers/registrationController');

const {
  validateFile,
  verifyDocumentField,
} = require('../controllers/fileVerificationController');

const { handleUpload, MAX_FILE_SIZE_BYTES } = require('../middleware/uploadMiddleware');
const validateFileSignatures = require('../middleware/validateFileSignatures');
const {
  fileValidateLimiter,
  documentVerifyLimiter,
  registerSubmitLimiter,
} = require('../middleware/rateLimiter');

// Whitelist of field names the client is allowed to ask about on the
// AJAX endpoints — mirrors uploadMiddleware.js's UPLOAD_FIELDS. Prevents
// a crafted request from probing PDF_ONLY_FIELDS logic or OCR with an
// arbitrary/unexpected fieldName string.
const KNOWN_FIELD_NAMES = new Set([
  'education[tenth][marksheet]',
  'education[twelfth][marksheet]',
  'education[diploma][marksheet]',
  'documents[aadhaarProof]',
  'documents[abcIdProof]',
  'documents[casteProof]',
  'documents[pwdProof]',
  'documents[leavingCertificate]',
  'documents[aoLevelCertificate]',
  'documents[puAdmissionLetter]',
  'documents[passportUpload]',
]);

function requireKnownFieldName(req, res, next) {
  const fieldName = req.body?.fieldName;
  if (!fieldName || !KNOWN_FIELD_NAMES.has(fieldName)) {
    return res.status(400).json({ valid: false, verified: false, reason: 'Unknown or missing fieldName.' });
  }
  next();
}

router.get('/register', showRegisterForm);

// Pipeline: Upload Middleware (Multer) -> Signature Validator -> Controller
// (registerStudent itself re-runs OCR/AI verification server-side before
// ever writing files to disk or saving the student — see
// controllers/registrationController.js.)
router.post('/register', registerSubmitLimiter, handleUpload, validateFileSignatures, registerStudent);

// ---------- Pre-submit AJAX verification (UX-only — never trusted alone) ----------
// Single-file, memory-only upload — never touches disk. Same size ceiling
// as the real submission pipeline (uploadMiddleware.js).
const singleFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('file');

function handleSingleUpload(req, res, next) {
  singleFileUpload(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the maximum allowed size of 4MB.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ valid: false, verified: false, reason: message });
    }
    next();
  });
}

// Fast signature-only check — fires immediately on file selection.
router.post(
  '/register/validate-file',
  fileValidateLimiter,
  handleSingleUpload,
  requireKnownFieldName,
  validateFile
);

// OCR + semantic (name / Aadhaar / passport / percentage) check — fires
// only after the signature check above has already passed. This is a
// convenience/UX pass only: the authoritative check happens again,
// server-side, inside registerStudent at final submit.
router.post(
  '/register/verify-document',
  documentVerifyLimiter,
  handleSingleUpload,
  requireKnownFieldName,
  verifyDocumentField
);

module.exports = router;