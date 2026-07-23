// controllers/registrationController.js

const bcrypt = require('bcrypt');
const Student = require('../models/Student');
const { storeUploadedFiles, applyStoredFilePaths, deleteStoredFiles } = require('../services/storageService');

function pad2(n) {
  return String(n).padStart(2, '0');
}

// DOB (Date) -> "DDMMYYYY" string, used as the initial plaintext password.
function dobToPasswordString(dobDate) {
  const day = pad2(dobDate.getUTCDate());
  const month = pad2(dobDate.getUTCMonth() + 1);
  const year = dobDate.getUTCFullYear();
  return `${day}${month}${year}`;
}

exports.showRegisterForm = (req, res) => {
  res.render('students/register', { error: null });
};

// NOTE: Document OCR/AI re-verification at final submit has been
// intentionally removed per product decision — final submit now only
// validates that required fields are present and well-formed. The
// pre-submit AJAX checks (fileVerification.js) still run OCR/AI while
// the student is filling the form, as a helpful live-feedback UX, but
// nothing blocks final registration based on document content anymore.
//
// Responses are now JSON (not res.render) so the frontend can submit
// via fetch() instead of a native form POST — this means a rejection
// (duplicate UG number, validation error, etc.) no longer reloads the
// page, so neither typed fields nor selected files are lost. See
// public/js/registerSubmit.js for the client side of this.
exports.registerStudent = async (req, res) => {
  const body = req.body || {};
  const isIndian = body.nationality === 'Indian';
  let storedFilePaths = null; // set once files are written; used to roll back on later failure

  try {
    // ---------- 1. Required top-level fields ----------
    const requiredTopLevel = [
      'title',
      'firstName',
      'lastName',
      'gender',
      'dob',
      'nationality',
      'joiningDate',
      'email',
      'phone',
      'institute',
      'faculty',
      'course',
      'branch',
      'specialization',
      'admissionType',
      'residesInHostel',
      'ugNumber',
    ];

    if (isIndian) {
      requiredTopLevel.push('category');
    }

    const missing = requiredTopLevel.filter(
      (field) => !body[field] || String(body[field]).trim() === ''
    );
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // ---------- 2. Required nested groups ----------
    if (
      !body.father?.name || !body.father?.phone ||
      !body.mother?.name || !body.mother?.phone ||
      !body.emergencyContact?.name || !body.emergencyContact?.phone
    ) {
      return res.status(400).json({
        success: false,
        error: 'Parent/Guardian and Emergency Contact details are required.',
      });
    }

    if (
      !body.presentAddress?.address1 || !body.presentAddress?.district ||
      !body.presentAddress?.pincode ||
      !body.permanentAddress?.address1 || !body.permanentAddress?.district ||
      !body.permanentAddress?.pincode
    ) {
      return res.status(400).json({
        success: false,
        error: 'Present and Permanent address details are required.',
      });
    }

    // Qualification type
    const qualKey = body.qualificationType === 'diploma' ? 'diploma' : 'twelfth';

    // Only Indian students submit 10th / 12th / Diploma details
    if (isIndian) {
      if (!body.education?.tenth?.schoolName || !body.education?.tenth?.percentage) {
        return res.status(400).json({
          success: false,
          error: '10th standard education details are required.',
        });
      }

      if (!body.education?.[qualKey]?.schoolName || !body.education?.[qualKey]?.percentage) {
        return res.status(400).json({
          success: false,
          error: `${qualKey === 'diploma' ? 'Diploma' : '12th standard'} education details are required.`,
        });
      }
    }

    if (body.residesInHostel === 'true' && !body.hostelName) {
      return res.status(400).json({
        success: false,
        error: 'Please select a hostel since you indicated you reside in a PU hostel.',
      });
    }

    // International students (Nationality = "Other") must supply three
    // additional proof documents. Indian students are exempt.
    if (!isIndian) {
      const missingIntlDocs = [];
      if (!body.documents?.aoLevelCertificate) missingIntlDocs.push('A/O Level Certificate');
      if (!body.documents?.puAdmissionLetter) missingIntlDocs.push('PU Offer Letter');
      if (!body.documents?.passportUpload) missingIntlDocs.push('Passport');

      if (missingIntlDocs.length) {
        return res.status(400).json({
          success: false,
          error: `International students must upload: ${missingIntlDocs.join(', ')}.`,
        });
      }
    }

    // ---------- 2b. Persist uploaded files (Storage Service) ----------
    // Signature Validator (middleware) already approved every buffer in
    // req.files, and all field/business-rule checks above have passed,
    // so it's now safe to write them to disk with UUID names and fold
    // the resulting paths back into `body` at the same nested keys the
    // rest of this function already expects.
    // ---------- 3. Normalize identifiers ----------
    const ugNumber = String(body.ugNumber).trim().toUpperCase();
    const email = String(body.email).trim().toLowerCase();

    // ---------- 4. Duplicate checks (friendly, pre-save) ----------
    // Moved BEFORE file storage: storeUploadedFiles now needs a
    // confirmed-unique ugNumber to build the student's folder name, so
    // there's no point writing files to disk for a registration that's
    // about to be rejected as a duplicate anyway.
    const [existingByUg, existingByEmail] = await Promise.all([
      Student.findOne({ ugNumber }),
      Student.findOne({ email }),
    ]);

    if (existingByUg) {
      return res.status(409).json({
        success: false,
        error: `A student with UG Number "${ugNumber}" is already registered.`,
      });
    }
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        error: `A student with email "${email}" is already registered.`,
      });
    }

    // ---------- 2b. Persist uploaded files (Storage Service) ----------
    storedFilePaths = await storeUploadedFiles(req.files, {
      ugNumber,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    applyStoredFilePaths(body, storedFilePaths);
    // ---------- 5. Password from DOB (DDMMYYYY), hashed ----------
    const dob = new Date(body.dob);
    if (Number.isNaN(dob.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth.',
      });
    }
    const plainPassword = dobToPasswordString(dob);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // ---------- 6. Booleans ----------
    const residesInHostel = body.residesInHostel === 'true';

    // ---------- 7. Education block ----------
    let education = {};

    if (isIndian) {
      education = {
        tenth: {
          schoolName: body.education.tenth.schoolName,
          percentage:
            body.education.tenth.percentage !== undefined
              ? Number(body.education.tenth.percentage)
              : undefined,
          marksheet: body.education.tenth.marksheet || undefined,
        },
        [qualKey]: {
          schoolName: body.education[qualKey].schoolName,
          percentage:
            body.education[qualKey].percentage !== undefined
              ? Number(body.education[qualKey].percentage)
              : undefined,
          marksheet: body.education[qualKey].marksheet || undefined,
        },
      };
    } else if (body.education) {
      for (const level of ['tenth', 'twelfth', 'diploma']) {
        const entry = body.education[level];
        if (!entry) continue;
        if (!entry.schoolName && !entry.percentage && !entry.marksheet) continue;
        education[level] = {
          schoolName: entry.schoolName || undefined,
          percentage: entry.percentage !== undefined && entry.percentage !== ''
            ? Number(entry.percentage)
            : undefined,
          marksheet: entry.marksheet || undefined,
        };
      }
    }

    // ---------- 9. Build and save the Student document ----------
    const student = new Student({
      title: body.title,
      firstName: body.firstName,
      middleName: body.middleName || undefined,
      lastName: body.lastName,
      gender: body.gender,
      dob,
      bloodGroup: body.bloodGroup || undefined,
      category: isIndian ? body.category : undefined,
      religion: body.religion || undefined,
      caste: isIndian ? body.caste : undefined,
      nationality: body.nationality,
      passportNumber: isIndian ? undefined : body.passportNumber,
      aadhaarNumber: isIndian ? body.aadhaarNumber : undefined,
      abcId: isIndian ? body.abcId : undefined,

      residesInHostel,
      hostelName: residesInHostel ? body.hostelName : undefined,
      profileStatus: 'verified',
      email,
      password: hashedPassword,

      ugNumber,
      enrollmentNo: ugNumber,

      faculty: body.faculty,
      institute: body.institute,
      course: body.course,
      branch: body.branch,
      specialization: body.specialization,

      joiningDate: new Date(body.joiningDate),
      admissionYear: new Date(body.joiningDate).getFullYear(),
      admissionType: body.admissionType,

      phoneCode: body.phoneCode || '+91',
      phone: body.phone,
      whatsapp: body.whatsapp || undefined,
      alternateEmail: body.alternateEmail ? body.alternateEmail.toLowerCase() : undefined,

      emergencyContact: {
        name: body.emergencyContact.name,
        phoneCode: body.emergencyContact.phoneCode || '+91',
        phone: body.emergencyContact.phone,
      },
      father: {
        name: body.father.name,
        phoneCode: body.father.phoneCode || '+91',
        phone: body.father.phone,
        email: body.father.email || undefined,
      },
      mother: {
        name: body.mother.name,
        phoneCode: body.mother.phoneCode || '+91',
        phone: body.mother.phone,
        email: body.mother.email || undefined,
      },

      presentAddress: { ...body.presentAddress },
      permanentAddress: { ...body.permanentAddress },

      education,

      documents: body.documents
        ? {
            aadhaarProof: body.documents.aadhaarProof || undefined,
            abcIdProof: body.documents.abcIdProof || undefined,
            casteProof: body.documents.casteProof || undefined,
            pwdProof: body.documents?.pwdProof || undefined,
            leavingCertificate: body.documents.leavingCertificate || undefined,
            aoLevelCertificate: body.documents.aoLevelCertificate || undefined,
            puAdmissionLetter: body.documents.puAdmissionLetter || undefined,
            passportUpload: body.documents.passportUpload || undefined,
          }
        : undefined,
    });

    await student.save();

    return res.json({ success: true, redirectTo: '/students/registerSuccess' });
  } catch (err) {
    // Rollback: if files were already written to disk this request but a
    // later step (e.g. student.save()) failed, don't leave orphaned uploads.
    if (storedFilePaths) {
      await deleteStoredFiles(storedFilePaths);
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(' ') });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        error: `A student with this ${field} already exists.`,
      });
    }
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong while registering. Please try again.',
    });
  }
};