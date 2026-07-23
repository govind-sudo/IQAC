// middleware/validateFileSignatures.js
//
// Step 3 of the upload pipeline: Signature Validator (wired as middleware).
// Runs after handleUpload (Multer) has populated req.files.
// For every uploaded file, checks the real bytes via
// utils/fileSignatureValidator.js — empty file / magic number / corrupted.
//
// On failure: re-renders the register form with a friendly error,
// same pattern as the rest of registrationController.js, so nothing
// reaches business-rule validation or storageService with a bad file.
//
// NOTE: files still only live in memory (req.files[field][0].buffer).
// Nothing is written to disk yet — that's storageService.js, which is
// intentionally not built as part of this step.

const { validateFileSignature } = require('../utils/fileSignatureValidator');

function validateFileSignatures(req, res, next) {
  const files = req.files || {};

  const errors = [];

  for (const fieldName of Object.keys(files)) {
    const fileArray = files[fieldName] || [];

    for (const file of fileArray) {
      const result = validateFileSignature(file.buffer, fieldName, {
  mimetype: file.mimetype,
  originalname: file.originalname,
});

      if (!result.valid) {
        errors.push(`"${file.originalname}" (${fieldName}): ${result.reason}`);
      }
    }
  }

  if (errors.length) {
    return res.status(400).render('students/register', {
      error: `Upload rejected — ${errors.join(' ')}`,
    });
  }

  next();
}

module.exports = validateFileSignatures;
