// controllers/registrationController.js

const bcrypt = require('bcrypt');
const Student = require('../models/Student');

// Only branch currently offered by the form (see studentRegistration.js
// BRANCH_OPTIONS). Extend this map when more branches/departments are added.
const BRANCH_DEPARTMENT_MAP = {
  CSE: 'Computer Science and Engineering',
};

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

exports.registerStudent = async (req, res) => {
  const body = req.body || {};

  try {
    // ---------- 1. Required top-level fields ----------
    const requiredTopLevel = [
      'title', 'firstName', 'lastName', 'gender', 'dob', 'category',
      'nationality', 'joiningDate', 'email', 'phone', 'institute',
      'faculty', 'course', 'branch', 'specialization',
      'admissionType', 'admissionQuota', 'residesInHostel', 'ugNumber',
    ];

    const missing = requiredTopLevel.filter(
      (field) => !body[field] || String(body[field]).trim() === ''
    );
    if (missing.length) {
      return res.status(400).render('students/register', {
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // ---------- 2. Required nested groups ----------
    if (
      !body.father?.name || !body.father?.phone ||
      !body.mother?.name || !body.mother?.phone ||
      !body.emergencyContact?.name || !body.emergencyContact?.phone
    ) {
      return res.status(400).render('students/register', {
        error: 'Parent/Guardian and Emergency Contact details are required.',
      });
    }

    if (
      !body.presentAddress?.address1 || !body.presentAddress?.district ||
      !body.presentAddress?.pincode ||
      !body.permanentAddress?.address1 || !body.permanentAddress?.district ||
      !body.permanentAddress?.pincode
    ) {
      return res.status(400).render('students/register', {
        error: 'Present and Permanent address details are required.',
      });
    }

    if (!body.education?.tenth?.schoolName || !body.education?.tenth?.percentage) {
      return res.status(400).render('students/register', {
        error: '10th standard education details are required.',
      });
    }

    // register.ejs renames the 12th-standard fields to education[diploma][...]
    // client-side when the "Diploma" radio is selected — see studentRegistration.js
    const qualKey = body.qualificationType === 'diploma' ? 'diploma' : 'twelfth';
    if (!body.education?.[qualKey]?.schoolName || !body.education?.[qualKey]?.percentage) {
      return res.status(400).render('students/register', {
        error: `${qualKey === 'diploma' ? 'Diploma' : '12th standard'} education details are required.`,
      });
    }

    // if (body.residesInHostel === 'true' && !body.hostelName) {
    //   return res.status(400).render('students/register', {
    //     error: 'Please select a hostel since you indicated you reside in a PU hostel.',
    //   });
    // }
    if (body.residesInHostel === 'true' && !body.hostelName) {
      return res.status(400).render('students/register', {
        error: 'Please select a hostel since you indicated you reside in a PU hostel.',
      });
    }

    // International students (Nationality = "Other") must supply three
    // additional proof documents. Indian students are exempt — mirrors the
    // hostel check above.
    if (body.nationality === 'Other') {
      const missingIntlDocs = [];
      if (!body.documents?.aoLevelCertificate) missingIntlDocs.push('A/O Level Certificate');
      if (!body.documents?.puOfferLetter) missingIntlDocs.push('PU Offer Letter');
      if (!body.documents?.passport) missingIntlDocs.push('Passport');

      if (missingIntlDocs.length) {
        return res.status(400).render('students/register', {
          error: `International students must upload: ${missingIntlDocs.join(', ')}.`,
        });
      }
    }

    // ---------- 3. Normalize identifiers ----------
    const ugNumber = String(body.ugNumber).trim().toUpperCase();
    const email = String(body.email).trim().toLowerCase();

    // ---------- 4. Duplicate checks (friendly, pre-save) ----------
    const [existingByUg, existingByEmail] = await Promise.all([
      Student.findOne({ ugNumber }),
      Student.findOne({ email }),
    ]);

    if (existingByUg) {
      return res.status(409).render('students/register', {
        error: `A student with UG Number "${ugNumber}" is already registered.`,
      });
    }
    if (existingByEmail) {
      return res.status(409).render('students/register', {
        error: `A student with email "${email}" is already registered.`,
      });
    }

    // ---------- 5. Password from DOB (DDMMYYYY), hashed ----------
    const dob = new Date(body.dob);
    if (Number.isNaN(dob.getTime())) {
      return res.status(400).render('students/register', {
        error: 'Invalid date of birth.',
      });
    }
    const plainPassword = dobToPasswordString(dob);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // ---------- 6. Booleans ----------
    const residesInHostel = body.residesInHostel === 'true';

    // ---------- 7. Course / Department derivation ----------
    // register.ejs's cascading select (id="department") now posts under
    // req.body.course (e.g. "Bachelor of Technology") — see register.ejs
    // change below. The real `department` name is derived from branch
    // until more than one department is offered.
    const department = BRANCH_DEPARTMENT_MAP[body.branch] || undefined;

    // ---------- 8. Education block (only the active 12th/diploma key) ----------
    const education = {
      tenth: {
        schoolName: body.education.tenth.schoolName,
        percentage: body.education.tenth.percentage !== undefined
          ? Number(body.education.tenth.percentage)
          : undefined,
        marksheet: body.education.tenth.marksheet || undefined,
      },
      [qualKey]: {
        schoolName: body.education[qualKey].schoolName,
        percentage: body.education[qualKey].percentage !== undefined
          ? Number(body.education[qualKey].percentage)
          : undefined,
        marksheet: body.education[qualKey].marksheet || undefined,
      },
    };

    // ---------- 9. Build and save the Student document ----------
    const student = new Student({
      title: body.title,
      firstName: body.firstName,
      middleName: body.middleName || undefined,
      lastName: body.lastName,
      gender: body.gender,
      dob,
      bloodGroup: body.bloodGroup || undefined,
      category: body.category,
      religion: body.religion || undefined,
      caste: body.caste || undefined,
      nationality: body.nationality,
      abcId: body.abcId || undefined,

      residesInHostel,
      hostelName: residesInHostel ? body.hostelName : undefined,

      email,
      password: hashedPassword,

      ugNumber,
    //   enrollmentNo: undefined,
      enrollmentNo: ugNumber,

      faculty: body.faculty,
      institute: body.institute,
      course: body.course,
      branch: body.branch,
      department,
      specialization: body.specialization,

      joiningDate: new Date(body.joiningDate),
      admissionYear: new Date(body.joiningDate).getFullYear(),
      admissionType: body.admissionType,
      admissionQuota: body.admissionQuota,

      phone: body.phone,
      whatsapp: body.whatsapp || undefined,
      alternateEmail: body.alternateEmail ? body.alternateEmail.toLowerCase() : undefined,

      emergencyContact: {
        name: body.emergencyContact.name,
        phone: body.emergencyContact.phone,
      },
      father: {
        name: body.father.name,
        phone: body.father.phone,
        email: body.father.email || undefined,
      },
      mother: {
        name: body.mother.name,
        phone: body.mother.phone,
        email: body.mother.email || undefined,
      },

      presentAddress: { ...body.presentAddress },
      permanentAddress: { ...body.permanentAddress },

      education,


    documents: body.documents
        ? {
            abcIdProof: body.documents.abcIdProof || undefined,
            casteProof: body.documents.casteProof || undefined,
            nationalityProof: body.documents.nationalityProof || undefined,
            leavingCertificate: body.documents.leavingCertificate || undefined,
            aadhaarNumber: body.documents.aadhaarNumber || undefined,
            // International students only (nationality === 'Other')
            aoLevelCertificate: body.documents.aoLevelCertificate || undefined,
            puOfferLetter: body.documents.puOfferLetter || undefined,
            passport: body.documents.passport || undefined,
          }
        : undefined,
    });

    await student.save();

    return res.redirect('/login?registered=true');
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).render('students/register', {
        error: messages.join(' '),
      });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).render('students/register', {
        error: `A student with this ${field} already exists.`,
      });
    }
    console.error('Registration error:', err);
    return res.status(500).render('students/register', {
      error: 'Something went wrong while registering. Please try again.',
    });
  }
};