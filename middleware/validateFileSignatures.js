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
