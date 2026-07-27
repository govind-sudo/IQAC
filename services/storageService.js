// services/storageService.js
//
// Step 5 of the upload pipeline: Storage Service.
//
// NAMING CONVENTION (updated):
//   Folder: uploads/{identifier}_{FirstLast}_{YYYYMMDD}/
//   File:   {identifier}_{FirstLast}_{documentType}.{ext}
//
//   e.g. uploads/24UG098890_PrakashRanjan_20260727/
//            24UG098890_PrakashRanjan_aadhaarProof.pdf
//            24UG098890_PrakashRanjan_tenthMarksheet.jpg
//
// `identifier` is the UG number at registration time. Once a real
// enrollment number is assigned by an admin, renameStudentDocuments()
// rewrites the folder AND every file inside it to use the enrollment
// number instead, and returns the new relative paths so the caller can
// persist them back onto the Student document.
//
// The date suffix on the folder is preserved across a rename, so the
// original intake date stays visible even after re-identification.

const fs = require('fs/promises');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const DB_PATH_PREFIX = 'uploads';

async function ensureUploadDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// Filesystem-safe token: strip anything that isn't a letter or digit,
// so odd characters in a name never produce an invalid path.
function sanitizeForPath(str) {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '');
}

function formatDateForPath(date) {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`; // e.g. "20260727" — sortable
}

function buildNameToken(firstName, lastName) {
  return sanitizeForPath(`${firstName || ''}${lastName || ''}`);
}

function buildStudentFolderName(identifier, firstName, lastName, date) {
  return `${sanitizeForPath(identifier)}_${buildNameToken(firstName, lastName)}_${formatDateForPath(date)}`;
}

// Maps a multer fieldName to the camelCase document-type token used in
// the stored filename.
const FIELD_NAME_TO_DOC_TYPE = {
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

// Where each document type lives on the Student document. Used by the
// rename routine and by the bulk-download controller so the mapping
// exists in exactly one place.
const DOC_TYPE_TO_STUDENT_PATH = {
  tenthMarksheet: 'education.tenth.marksheet',
  twelfthMarksheet: 'education.twelfth.marksheet',
  diplomaMarksheet: 'education.diploma.marksheet',
  aadhaarProof: 'documents.aadhaarProof',
  abcIdProof: 'documents.abcIdProof',
  casteProof: 'documents.casteProof',
  pwdProof: 'documents.pwdProof',
  leavingCertificate: 'documents.leavingCertificate',
  aoLevelCertificate: 'documents.aoLevelCertificate',
  puAdmissionLetter: 'documents.puAdmissionLetter',
  passportUpload: 'documents.passportUpload',
};

// Human labels for the admin UI.
const DOC_TYPE_LABELS = {
  aadhaarProof: 'Aadhaar Card',
  abcIdProof: 'ABC / APAAR ID Proof',
  casteProof: 'Caste Certificate',
  pwdProof: 'PWD Certificate',
  leavingCertificate: 'Leaving Certificate',
  tenthMarksheet: '10th Marksheet',
  twelfthMarksheet: '12th Marksheet',
  diplomaMarksheet: 'Diploma Marksheet',
  aoLevelCertificate: 'A / O Level Certificate',
  puAdmissionLetter: 'PU Admission Letter',
  passportUpload: 'Passport',
};

function docTypeForField(fieldName) {
  return FIELD_NAME_TO_DOC_TYPE[fieldName] || sanitizeForPath(fieldName);
}

// Reads a dotted path like "education.tenth.marksheet" off an object.
function getByPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

// Writes a dotted path, creating intermediate objects as needed.
function setByPath(obj, dottedPath, value) {
  const keys = dottedPath.split('.');
  let cursor = obj;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      cursor[key] = value;
    } else {
      if (cursor[key] == null || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
  });
  return obj;
}

/**
 * Persist every uploaded file in req.files to disk.
 *
 * @param {Object} files - req.files as populated by Multer's .fields()
 * @param {Object} studentInfo - { ugNumber, firstName, lastName, enrollmentNo? }
 *        If enrollmentNo is present it takes precedence over ugNumber
 *        as the filename identifier — so an admin re-uploading a
 *        document for an already-enrolled student gets the enrollment
 *        naming immediately, with no rename pass needed afterwards.
 * @returns {Promise<Object>} map of fieldName -> relative path
 */
async function storeUploadedFiles(files, studentInfo) {
  if (!files || Object.keys(files).length === 0) return {};

  const { ugNumber, firstName, lastName, enrollmentNo } = studentInfo || {};
  const identifier = enrollmentNo || ugNumber;
  const nameToken = buildNameToken(firstName, lastName);

  const folderName = buildStudentFolderName(identifier, firstName, lastName, new Date());
  const studentDir = path.join(UPLOAD_DIR, folderName);
  await ensureUploadDir(studentDir);

  const storedPaths = {};

  for (const fieldName of Object.keys(files)) {
    const file = (files[fieldName] || [])[0];
    if (!file) continue;

    const ext = path.extname(file.originalname || '').toLowerCase();
    const docType = docTypeForField(fieldName);
    const diskName = `${sanitizeForPath(identifier)}_${nameToken}_${docType}${ext}`;
    const diskPath = path.join(studentDir, diskName);

    await fs.writeFile(diskPath, file.buffer);
    storedPaths[fieldName] = `${DB_PATH_PREFIX}/${folderName}/${diskName}`;
  }

  return storedPaths;
}

/**
 * Merge the flat map produced by storeUploadedFiles() into req.body's
 * nested shape. Mutates and returns `body`.
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
 * Rollback helper — deletes files written by storeUploadedFiles() when
 * a later step fails. Best-effort: logs but never throws.
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

  const firstPath = Object.values(storedPaths)[0];
  if (firstPath) {
    const folderPath = path.join(__dirname, '..', path.dirname(firstPath));
    try {
      const remaining = await fs.readdir(folderPath);
      if (remaining.length === 0) await fs.rmdir(folderPath);
    } catch (_) {
      // folder already gone, or not empty — nothing to do
    }
  }
}

/**
 * Re-identify every stored document for a student under a new
 * identifier (normally: UG number -> real enrollment number).
 *
 * Renames the student's folder AND every file inside it, then mutates
 * the passed-in Mongoose document's path fields to point at the new
 * locations. Does NOT call .save() — the caller decides when to
 * persist, so this composes cleanly inside an existing update flow.
 *
 * Idempotent: if the paths already use the new identifier, it's a
 * no-op. Safe to call on a student with no documents at all.
 *
 * On any per-file failure, the folder rename is rolled back and the
 * error is re-thrown, so you never end up with a half-renamed folder
 * whose DB paths no longer resolve.
 *
 * @param {import('mongoose').Document} student - a live Student doc
 * @param {string} newIdentifier - e.g. the newly-assigned enrollment number
 * @returns {Promise<{ renamed: number, folder: string|null }>}
 */
async function renameStudentDocuments(student, newIdentifier) {
  const identifier = sanitizeForPath(newIdentifier);
  if (!identifier) return { renamed: 0, folder: null };

  const nameToken = buildNameToken(student.firstName, student.lastName);

  // Collect every (docType, currentRelativePath) pair that exists.
  const owned = [];
  for (const [docType, dottedPath] of Object.entries(DOC_TYPE_TO_STUDENT_PATH)) {
    const current = getByPath(student, dottedPath);
    if (typeof current === 'string' && current.trim()) {
      owned.push({ docType, dottedPath, relativePath: current.trim() });
    }
  }

  if (!owned.length) return { renamed: 0, folder: null };

  // All of a student's files live in one folder; derive it from the
  // first path rather than rebuilding it, so a folder created under an
  // older convention still resolves.
  const oldFolderRel = path.posix.dirname(owned[0].relativePath.replace(/\\/g, '/'));
  const oldFolderName = path.posix.basename(oldFolderRel);
  const oldFolderAbs = path.join(__dirname, '..', oldFolderRel);

  // Preserve the original intake date suffix if the folder has one.
  const dateMatch = oldFolderName.match(/_(\d{8})$/);
  const dateSuffix = dateMatch ? dateMatch[1] : formatDateForPath(student.createdAt || new Date());
  const newFolderName = `${identifier}_${nameToken}_${dateSuffix}`;

  // Already renamed — nothing to do.
  if (oldFolderName === newFolderName) {
    const alreadyCorrect = owned.every(({ relativePath, docType }) =>
      path.posix
        .basename(relativePath.replace(/\\/g, '/'))
        .startsWith(`${identifier}_${nameToken}_${docType}`)
    );
    if (alreadyCorrect) return { renamed: 0, folder: newFolderName };
  }

  const newFolderAbs = path.join(UPLOAD_DIR, newFolderName);

  try {
    await fs.access(oldFolderAbs);
  } catch (_) {
    console.warn(
      `renameStudentDocuments: folder "${oldFolderRel}" is missing on disk — ` +
        `skipping rename for student ${student._id}. DB paths left untouched.`
    );
    return { renamed: 0, folder: null };
  }

  let folderWasRenamed = false;
  if (oldFolderAbs !== newFolderAbs) {
    // Guard: never clobber an existing folder belonging to someone else.
    try {
      await fs.access(newFolderAbs);
      throw new Error(
        `Cannot rename documents: a folder named "${newFolderName}" already exists.`
      );
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    await fs.rename(oldFolderAbs, newFolderAbs);
    folderWasRenamed = true;
  }

  const applied = [];

  try {
    for (const { docType, dottedPath, relativePath } of owned) {
      const oldBase = path.posix.basename(relativePath.replace(/\\/g, '/'));
      const ext = path.extname(oldBase).toLowerCase();
      const newBase = `${identifier}_${nameToken}_${docType}${ext}`;

      if (oldBase !== newBase) {
        await fs.rename(
          path.join(newFolderAbs, oldBase),
          path.join(newFolderAbs, newBase)
        );
        applied.push({ from: newBase, to: oldBase }); // for rollback
      }

      setByPath(student, dottedPath, `${DB_PATH_PREFIX}/${newFolderName}/${newBase}`);
    }
  } catch (err) {
    // Undo file renames, then the folder rename, so disk and DB stay
    // consistent with each other.
    for (const { from, to } of applied.reverse()) {
      try {
        await fs.rename(path.join(newFolderAbs, from), path.join(newFolderAbs, to));
      } catch (_) {
        /* best effort */
      }
    }
    if (folderWasRenamed) {
      try {
        await fs.rename(newFolderAbs, oldFolderAbs);
      } catch (_) {
        /* best effort */
      }
    }
    throw err;
  }

  // Mongoose doesn't always detect deep mutations on nested paths.
  if (typeof student.markModified === 'function') {
    student.markModified('documents');
    student.markModified('education');
  }

  return { renamed: owned.length, folder: newFolderName };
}

module.exports = {
  storeUploadedFiles,
  applyStoredFilePaths,
  deleteStoredFiles,
  renameStudentDocuments,
  UPLOAD_DIR,
  DB_PATH_PREFIX,
  FIELD_NAME_TO_DOC_TYPE,
  DOC_TYPE_TO_STUDENT_PATH,
  DOC_TYPE_LABELS,
  sanitizeForPath,
};