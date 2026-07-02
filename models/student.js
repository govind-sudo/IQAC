const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = require("./addressSchema");
const parentSchema = require("./parentSchema");
const emergencyContactSchema = require("./emergencyContactSchema");


const studentSchema = new Schema(
  {
    // ---------- Personal ----------
    title: {
      type: String,
      enum: ["Mr", "Ms", "Mrs", "Dr"],
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dob: Date,

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    category: {
      type: String,
      enum: ["General", "OBC", "SC", "ST", "EWS"],
    },

    religion: String,
    caste: String,

    // ---------- Authentication ----------
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
    },

    // ---------- Academic ----------
    institute: String,
    course: String,
    program: String,
    department: String,

    admissionYear: Number,

    admissionType: {
      type: String,
      enum: ["Regular", "Lateral Entry", "Transfer"],
    },

    admissionQuota: {
      type: String,
      enum: ["General", "Management", "NRI", "Sports", "Other"],
    },

    studentStatus: {
      type: String,
      enum: ["active", "graduated", "dropped", "suspended"],
      default: "active",
    },

    // ---------- Contact ----------
    phone: String,
    whatsapp: String,
    alternateEmail: String,

    // ---------- Emergency ----------
    emergencyContact: emergencyContactSchema,

    // ---------- Parents ----------
    father: parentSchema,
    mother: parentSchema,

    // ---------- Address ----------
    presentAddress: addressSchema,
    permanentAddress: addressSchema,

    // ---------- Identity ----------
    aadhaarNumber: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    // ---------- Faculty ----------
    mentorFaculty: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
    },

    // ---------- Role ----------
    role: {
      type: String,
      default: "student",
      enum: ["student"],
    },

    // ---------- Status ----------
    isActive: {
      type: Boolean,
      default: true,
    },

    profileStatus: {
      type: String,
      enum: ["incomplete", "pending", "verified", "rejected"],
      default: "incomplete",
    },
  },
  {
    timestamps: true,
  }
);

// Build full name automatically
studentSchema.pre("save", function (next) {
  this.fullName = [
    this.firstName,
    this.middleName,
    this.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  next();
});

module.exports = mongoose.model("Student", studentSchema);