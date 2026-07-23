// services/storageService.js
//
// Step 5 of the upload pipeline: Storage Service.
//
// REWRITTEN: files are now stored in a PER-STUDENT folder instead of a
// flat directory with UUID names. Folder naming: {ugNumber}_{firstName}{lastName}
// (sanitized for filesystem safety). Files inside are named by their
// document type (e.g. "aadhaarProof.pdf", "tenthMarksheet.jpg") since
// they're already uniquely scoped within that student's own folder —
// no UUID needed at the file level anymore.
//
// This requires ugNumber + firstName/lastName to already be known and
// confirmed unique BEFORE calling storeUploadedFiles — see the updated
// call order in registrationController.js (duplicate check now runs
// before file storage, not after).

const fs = require('fs/promises');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const DB_PATH_PREFIX = 'uploads';

async function ensureUploadDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// Filesystem-safe folder name: strip anything that isn't a letter,
// digit, or underscore, so odd characters in a name never produce an
// invalid or unexpected path.
function sanitizeForPath(str) {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '');
}

function formatDateForPath(date) {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`; // e.g. "20260723" — sortable, no separators needed
}

function buildStudentFolderName(ugNumber, firstName, lastName, date) {
  const safeUg = sanitizeForPath(ugNumber);
  const safeName = sanitizeForPath(`${firstName || ''}${lastName || ''}`);
  const dateStr = formatDateForPath(date);
  return `${safeUg}_${safeName}_${dateStr}`;
}

// Maps a multer fieldName (e.g. "education[tenth][marksheet]",
// "documents[aadhaarProof]") to a short, human-readable file basename
// (without extension) for storage within the student's folder.
const FIELD_NAME_TO_FILE_BASENAME = {
  'education[tenth][marksheet]': 'tenthMarksheet',
  'education[twelfth][marksheet]': 'twelfthMarksheet',
  'education[diploma][marksheet]': 'diplomaMarksheet',
  'documents[aadhaarProof]': 'aadhaarProof',
  'documents[abcIdProof]': 'abcIdProof',
  'documents[casteProof]': 'casteProof',
  'documents[pwdProof]': 'pwdProof',
  'documents[leavingCertificate]': 'leavingCertificate',
  'documents[aoLevelCertificate]': 'aoLevelCertificate',
  'documents[puAdmissionLetter]': 'puAdmissionLetter',
  'documents[passportUpload]': 'passportUpload',
};

function fileBasenameForField(fieldName) {
  return FIELD_NAME_TO_FILE_BASENAME[fieldName] || sanitizeForPath(fieldName);
}

/**
 * Persist every uploaded file in req.files to disk under a per-student
 * folder: uploads/{ugNumber}_{firstName}{lastName}/{docType}.{ext}
 *
 * @param {Object} files - req.files as populated by Multer's .fields()
 * @param {Object} studentInfo - { ugNumber, firstName, lastName }
 * @returns {Promise<Object>} map of fieldName -> public path (e.g. "uploads/24UG098890_PrakashRanjan/aadhaarProof.pdf")
 */
async function storeUploadedFiles(files, studentInfo) {
  if (!files || Object.keys(files).length === 0) return {};

  const { ugNumber, firstName, lastName } = studentInfo || {};
  const folderName = buildStudentFolderName(ugNumber, firstName, lastName, new Date());
  const studentDir = path.join(UPLOAD_DIR, folderName);
  await ensureUploadDir(studentDir);

  const storedPaths = {};

  for (const fieldName of Object.keys(files)) {
    const file = (files[fieldName] || [])[0];
    if (!file) continue;

    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = fileBasenameForField(fieldName);
    const diskName = `${baseName}${ext}`;
    const diskPath = path.join(studentDir, diskName);

    await fs.writeFile(diskPath, file.buffer);
    storedPaths[fieldName] = `${DB_PATH_PREFIX}/${folderName}/${diskName}`;
  }

  return storedPaths;
}

/**
 * Merge a flat { "documents[aadhaarProof]": "uploads/.../aadhaarProof.pdf", ... }
 * map produced by storeUploadedFiles() into req.body's nested shape.
 * Mutates and returns `body`.
 */
function applyStoredFilePaths(body, storedPaths) {
  for (const fieldName of Object.keys(storedPaths)) {
    const keys = fieldName
      .split('[')
      .map((part) => part.replace(']', ''))
      .filter(Boolean);

    let cursor = body;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        cursor[key] = storedPaths[fieldName];
      } else {
        if (typeof cursor[key] !== 'object' || cursor[key] === null) {
          cursor[key] = {};
        }
        cursor = cursor[key];
      }
    });
  }

  return body;
}

/**
 * Rollback helper. Deletes every file that was just written by
 * storeUploadedFiles() for this request — used when a later step fails
 * after files already hit disk, so a failed registration never leaves
 * orphaned uploads behind. Best-effort: logs but does not throw.
 * @param {Object} storedPaths - the map returned by storeUploadedFiles()
 */
async function deleteStoredFiles(storedPaths) {
  if (!storedPaths || Object.keys(storedPaths).length === 0) return;

  await Promise.all(
    Object.values(storedPaths).map(async (relativePath) => {
      const diskPath = path.join(__dirname, '..', relativePath);
      try {
        await fs.unlink(diskPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Rollback: failed to delete ${diskPath}:`, err);
        }
      }
    })
  );

  // Best-effort: if the student's folder is now empty (all its files
  // were just rolled back), remove the empty folder too so a failed
  // registration doesn't leave a stray empty directory behind.
  const firstPath = Object.values(storedPaths)[0];
  if (firstPath) {
    const folderPath = path.join(__dirname, '..', path.dirname(firstPath));
    try {
      const remaining = await fs.readdir(folderPath);
      if (remaining.length === 0) {
        await fs.rmdir(folderPath);
      }
    } catch (_) {
      // folder already gone, or not empty — nothing to do
    }
  }
}

module.exports = {
  storeUploadedFiles,
  applyStoredFilePaths,
  deleteStoredFiles,
  UPLOAD_DIR,
};