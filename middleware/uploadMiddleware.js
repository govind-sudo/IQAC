// // middleware/uploadMiddleware.js
// //
// // Step 2 of the upload pipeline: Upload Middleware (Multer).
// // Handles: file size limit, extension whitelist, MIME type whitelist.
// //
// // Uses memoryStorage on purpose — files are NOT written to disk here.
// // The buffer stays in memory just long enough for the next step
// // (Signature Validator) to inspect the real bytes. Writing to disk with
// // UUID names happens later in storageService.js (not built yet).

// const multer = require('multer');
// const path = require('path');

// const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file

// const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
// const ALLOWED_MIME_TYPES = new Set([
//   'application/pdf',
//   'image/jpeg',
//   'image/png',
// ]);

// // All file fields that can appear on the registration form.
// // Covers both the "twelfth" and "diploma" name swap done client-side
// // in studentRegistration.js, so whichever one posts, Multer knows it.
// const UPLOAD_FIELDS = [
//   { name: 'education[tenth][marksheet]', maxCount: 1 },
//   { name: 'education[twelfth][marksheet]', maxCount: 1 },
//   { name: 'education[diploma][marksheet]', maxCount: 1 },

//   { name: 'documents[aadhaarProof]', maxCount: 1 },
//   { name: 'documents[abcIdProof]', maxCount: 1 },
//   { name: 'documents[casteProof]', maxCount: 1 },
//   { name: 'documents[pwdProof]', maxCount: 1 },
//   { name: 'documents[leavingCertificate]', maxCount: 1 },
//   { name: 'documents[aoLevelCertificate]', maxCount: 1 },
//   { name: 'documents[puAdmissionLetter]', maxCount: 1 },
//   { name: 'documents[passportUpload]', maxCount: 1 },
// ];

// const storage = multer.memoryStorage();

// function fileFilter(req, file, cb) {
//   const ext = path.extname(file.originalname || '').toLowerCase();

//   if (!ALLOWED_EXTENSIONS.has(ext)) {
//     return cb(
//       new multer.MulterError(
//         'LIMIT_UNEXPECTED_FILE',
//         `Unsupported file extension "${ext}" for "${file.fieldname}". Allowed: .pdf, .jpg, .jpeg, .png`
//       )
//     );
//   }

//   if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
//     return cb(
//       new multer.MulterError(
//         'LIMIT_UNEXPECTED_FILE',
//         `Unsupported file type "${file.mimetype}" for "${file.fieldname}". Allowed: PDF, JPG, PNG`
//       )
//     );
//   }

//   cb(null, true);
// }

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: MAX_FILE_SIZE_BYTES,
//     files: UPLOAD_FIELDS.length, // sane ceiling, avoids field-flood abuse
//   },
//   fileFilter,
// });

// // Middleware that also turns Multer's thrown errors into the same
// // error-render pattern the rest of registrationController.js uses,
// // instead of leaking a raw stack trace to the student.
// function handleUpload(req, res, next) {
//   upload.fields(UPLOAD_FIELDS)(req, res, (err) => {
//     if (err) {
//       let message = 'There was a problem with one of your uploaded files.';

//       if (err instanceof multer.MulterError) {
//         if (err.code === 'LIMIT_FILE_SIZE') {
//           message = `File "${err.field}" exceeds the maximum allowed size of 5MB.`;
//         } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
//           message = err.message;
//         } else {
//           message = err.message;
//         }
//       }

//       return res.status(400).render('students/register', { error: message });
//     }
//     next();
//   });
// }

// module.exports = {
//   handleUpload,
//   MAX_FILE_SIZE_BYTES,
//   ALLOWED_EXTENSIONS,
//   ALLOWED_MIME_TYPES,
//   UPLOAD_FIELDS,
// };




// middleware/uploadMiddleware.js
//
// Step 2 of the upload pipeline: Upload Middleware (Multer).
// Handles: file size limit, extension whitelist, MIME type whitelist.
//
// Uses memoryStorage on purpose — files are NOT written to disk here.
// The buffer stays in memory just long enough for the next step
// (Signature Validator) to inspect the real bytes. Writing to disk with
// UUID names happens later in storageService.js.

const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB per file

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
// All file fields that can appear on the registration form.
// Covers both the "twelfth" and "diploma" name swap done client-side
// in studentRegistration.js, so whichever one posts, Multer knows it.
const UPLOAD_FIELDS = [
  { name: 'education[tenth][marksheet]', maxCount: 1 },
  { name: 'education[twelfth][marksheet]', maxCount: 1 },
  { name: 'education[diploma][marksheet]', maxCount: 1 },

  { name: 'documents[aadhaarProof]', maxCount: 1 },
  { name: 'documents[abcIdProof]', maxCount: 1 },
  { name: 'documents[casteProof]', maxCount: 1 },
  { name: 'documents[pwdProof]', maxCount: 1 },
  { name: 'documents[leavingCertificate]', maxCount: 1 },
  { name: 'documents[aoLevelCertificate]', maxCount: 1 },
  { name: 'documents[puAdmissionLetter]', maxCount: 1 },
  { name: 'documents[passportUpload]', maxCount: 1 },
];

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Unsupported file extension "${ext}" for "${file.fieldname}". Allowed: .pdf, .jpg, .jpeg, .png`
      )
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Unsupported file type "${file.mimetype}" for "${file.fieldname}". Allowed: PDF, JPG, PNG`
      )
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: UPLOAD_FIELDS.length, // sane ceiling, avoids field-flood abuse
  },
  fileFilter,
});

// Middleware that also turns Multer's thrown errors into the same
// error-render pattern the rest of registrationController.js uses,
// instead of leaking a raw stack trace to the student.
function handleUpload(req, res, next) {
  upload.fields(UPLOAD_FIELDS)(req, res, (err) => {
    if (err) {
      let message = 'There was a problem with one of your uploaded files.';

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          message = `File "${err.field}" exceeds the maximum allowed size of 4MB.`;
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          message = err.message;
        } else {
          message = err.message;
        }
      }

      return res.status(400).render('students/register', { error: message });
    }
    next();
  });
}

module.exports = {
  handleUpload,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  UPLOAD_FIELDS,
};