// models/Student.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = require('./addressSchema');
const parentSchema = require('./parentSchema');
const emergencyContactSchema = require('./emergencyContactSchema');
const educationSchema = require('./educationSchema');
const documentsSchema = require('./documentsSchema');

const studentSchema = new Schema(
  {
    // ---------- Personal ----------
    title: {
      type: String,
      enum: ['Mr', 'Ms', 'Mrs', 'Dr'],
    },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true }, // auto-set in a pre-save hook from first+middle+last
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    dob: { type: Date },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'EWS', 'PWD'],
    },
    religion: { type: String, trim: true },
    caste: { type: String, trim: true },
    nationality: { type: String, trim: true },
    // Domicile state — separate from presentAddress.state/permanentAddress.state,
    // since this is likely used for quota/reservation purposes rather than
    // a mailing address. Flag me if you actually meant one of those instead.
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    city: { type: String, trim: true },

    // ---------- Hostel ----------
    residesInHostel: { type: Boolean, default: false },
    hostelName: { type: String, trim: true }, // only relevant if residesInHostel is true

    // ---------- Authentication ----------
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never returned by default in queries
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // most students won't have this until Google login is added later
    },
    // Official Parul University email — issued by the institute, not
    // self-entered. Not usable for login yet since issuance is disabled
    // on the university's end; parulEmailActive tracks that separately
    // so the field itself can exist without implying it's live.
    parulEmailId: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    parulEmailActive: {
      type: Boolean,
      default: false, // flip to true once the university enables these accounts
    },
    enrollmentNo: {
      type: String,
      unique: true,
      sparse: true, // new admissions won't have one yet — HOD/admin assigns it during verification
      trim: true,
    },
    ugNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
  },

    // ---------- Academic ----------
    // Real hierarchy per the admission form: Faculty > Institute > Department
    faculty: { type: String, trim: true, default: 'FET' }, // Faculty of Engineering & Technology
    institute: { type: String, trim: true },
    course: { type: String, trim: true },       // e.g. B.Tech
    program: { type: String, trim: true },       // e.g. Computer Engineering
    department: { type: String, trim: true },   // FIXED: no longer defaults to 'FET' - that's the faculty field's job now. This holds the real department name (e.g. "Computer Science & Engineering")
    branch: { type: String, trim: true, default: 'CSE' },
    specialization: {
      type: String,
      enum: ['AIML', 'AIRO'],
    },
    joiningDate: { type: Date },
    admissionYear: { type: Number },
    admissionType: {
      type: String,
      enum: ['Regular', 'Lateral Entry', 'Transfer'],
    },
    admissionQuota: {
      type: String,
      enum: ['General', 'Management', 'NRI', 'Sports', 'Other'],
    },
    studentStatus: {
      type: String,
      enum: ['active', 'graduated', 'dropped', 'suspended'],
      default: 'active',
    },

    // ---------- Contact ----------
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    alternateEmail: { type: String, trim: true, lowercase: true },

    // ---------- Emergency ----------
    emergencyContact: emergencyContactSchema,

    // ---------- Parents ----------
    father: parentSchema,
    mother: parentSchema,

    // ---------- Addresses ----------
    presentAddress: addressSchema,
    permanentAddress: addressSchema,

    // ---------- Education ----------
    education: educationSchema,

    // ---------- Documents (proof required) ----------
    documents: documentsSchema,

    // ---------- Identity ----------
    abcId: {
      type: String,
      unique: true,
      sparse: true, // not every student may have generated one yet
      trim: true,
    },

    // ---------- Role ----------
    role: {
      type: String,
      enum: ['student'],
      default: 'student',
    },

    // ---------- Status ----------
    isActive: {
      type: Boolean,
      default: true,
    },

    // ---------- Verification ----------
    profileStatus: {
      type: String,
      enum: ['incomplete', 'pending', 'verified', 'rejected'],
      default: 'incomplete',
    },
  },
  { timestamps: true } // adds createdAt, updatedAt automatically
);

// Auto-build fullName from parts on every save, so you never have to
// remember to keep it in sync by hand.
studentSchema.pre('save', function (next) {
  this.fullName = [this.firstName, this.middleName, this.lastName]
    .filter(Boolean)
    .join(' ');
  next();
});

module.exports = mongoose.model('Student', studentSchema);