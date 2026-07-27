const multer = require('multer');
const path = require('path');

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


const handleUpload = createUploadHandler((message, req, res) =>
  res.status(400).render('students/register', { error: message })
);

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