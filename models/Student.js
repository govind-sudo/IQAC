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
      enum: ['Mr', 'Ms', 'Mrs'],
    },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true, index: true },
    
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
    nationality: { type: String, trim: true, default: 'Indian' },
    passportNumber: { type: String, trim: true },

    aadhaarNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\d{12}$/, 'Please enter a valid 12-digit Aadhaar number']
    },

    // ---------- Hostel ----------
    residesInHostel: { type: Boolean, default: false },
    hostelName: { type: String, trim: true },

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
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    parulEmailId: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    parulEmailActive: {
      type: Boolean,
      default: false,
    },
    enrollmentNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    ugNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // ---------- Academic ----------
    faculty: { type: String, trim: true, default: 'FET' },
    institute: { type: String, trim: true },
    course: { type: String, trim: true },
    branch: { type: String, trim: true, default: 'CSE' },
    specialization: { type: String, trim: true },
    
    joiningDate: { type: Date },
    admissionYear: { type: Number, index: true },
    admissionType: {
      type: String,
      enum: ['Regular', 'Lateral Entry', 'Transfer'],
    },
    studentStatus: {
      type: String,
      enum: ['active', 'graduated', 'dropped', 'suspended'],
      default: 'active',
      index: true,
    },

    // ---------- Contact ----------
    phoneCode: { type: String, default: "+91" },
    phone: { type: String, trim: true, index: true },
    whatsapp: { type: String, trim: true },
    alternateEmail: { type: String, trim: true, lowercase: true },

    // ---------- Embedded Schemas ----------
    emergencyContact: emergencyContactSchema,
    father: parentSchema,
    mother: parentSchema,
    presentAddress: addressSchema,
    permanentAddress: addressSchema,
    education: educationSchema,
    documents: documentsSchema,

    // ---------- Identity & Status ----------
    abcId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student'],
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileStatus: {
      type: String,
      enum: ['incomplete', 'pending', 'verified', 'rejected'],
      default: 'incomplete',
      index: true,
    },
  },
  { timestamps: true }
);

// -------------------------------------------------------------
// INDEXES FOR HIGH-PERFORMANCE SEARCH & DASHBOARD AGGREGATIONS
// -------------------------------------------------------------

// Index for default pagination sorting
studentSchema.index({ createdAt: -1 });

// Index for District aggregation query in Admin Dashboard
studentSchema.index({ "presentAddress.district": 1 });

// Index for 12th Percentage Bucket aggregation in Admin Dashboard
studentSchema.index({ "education.twelfth.percentage": 1 });

// Text Index for Fast Server-Side Search Across Primary Identifiers
studentSchema.index({
  fullName: 'text',
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  ugNumber: 'text',
  enrollmentNo: 'text',
  phone: 'text'
});

// -------------------------------------------------------------
// HOOKS & MIDDLEWARE
// -------------------------------------------------------------

// Auto-build fullName on Save
studentSchema.pre('save', function (next) {
  this.fullName = [this.firstName, this.middleName, this.lastName]
    .filter(Boolean)
    .join(' ');
  next();
});

// Auto-build fullName on Update Queries (findOneAndUpdate / findByIdAndUpdate)
studentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.firstName || update.lastName || update.middleName) {
    const firstName = update.firstName || this._update.$set?.firstName;
    const middleName = update.middleName || this._update.$set?.middleName || '';
    const lastName = update.lastName || this._update.$set?.lastName;

    if (firstName && lastName) {
      this.set({ fullName: [firstName, middleName, lastName].filter(Boolean).join(' ') });
    }
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);