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

// ---------------------------------------------------------------
// UPLOAD SIZE LIMIT - change this in ONE place.
//
// Set MAX_FILE_SIZE_MB below, or override it without touching code by
// putting MAX_UPLOAD_MB in your .env file, e.g.:
//
//     MAX_UPLOAD_MB=2
//
// Fractional values work too (0.5 = 512KB). Everything else - the
// Multer limit, the AJAX pre-check endpoints, and every error message
// shown to the student - derives from this single number, so there is
// nothing else to keep in sync.
// ---------------------------------------------------------------
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_MB) || 1;

const MAX_FILE_SIZE_BYTES = Math.round(MAX_FILE_SIZE_MB * 1024 * 1024);

// Pretty label for error messages: "1MB", "512KB", "2.5MB".
const MAX_FILE_SIZE_LABEL =
  MAX_FILE_SIZE_MB < 1
    ? `${Math.round(MAX_FILE_SIZE_MB * 1024)}KB`
    : `${Number(MAX_FILE_SIZE_MB.toFixed(2))}MB`;

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

// Turns Multer's thrown errors into a friendly message instead of
// leaking a raw stack trace, then hands that message to a per-flow
// handler.
//
// The message is identical everywhere; only the *response* differs,
// because the student registration flow and the admin edit flow need to
// land the user back on completely different pages. Previously both
// re-rendered 'students/register', which meant an admin who uploaded an
// oversized file while editing a student was bounced onto a broken
// student registration form.
function describeUploadError(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return `File "${err.field}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_LABEL}.`;
    }
    return err.message;
  }
  return err.message || 'There was a problem with one of your uploaded files.';
}

function createUploadHandler(onError) {
  return function uploadHandler(req, res, next) {
    upload.fields(UPLOAD_FIELDS)(req, res, (err) => {
      if (err) return onError(describeUploadError(err), req, res, next);
      next();
    });
  };
}

// ---------- Student registration flow ----------
// The register page is a self-contained form, so re-rendering it with
// an error banner is the right response.
const handleUpload = createUploadHandler((message, req, res) =>
  res.status(400).render('students/register', { error: message })
);

// ---------- Admin edit flow ----------
// The edit form needs the student it was editing, so re-fetch and
// re-render 'admin/editStudent' with exactly the locals that
// adminController.renderEditStudentForm supplies. Falls back to the
// central error handler if that render itself would fail, so a
// rejected upload can never turn into an unexplained 500.
const handleAdminUpload = createUploadHandler(async (message, req, res, next) => {
  try {
    const Student = require('../models/Student');
    const student = await Student.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).render('errors/404', { message: 'Student not found' });
    }

    return res.status(400).render('admin/editStudent', {
      currentPage: 'students',
      admin: req.admin,
      student,
      errorMessage: message,
    });
  } catch (renderErr) {
    console.error('Admin upload error handling failed:', renderErr);
    return next(renderErr);
  }
});

module.exports = {
  handleUpload,
  handleAdminUpload,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_LABEL,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  UPLOAD_FIELDS,
};