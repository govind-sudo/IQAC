// models/Admin.js
// The HOD/admin account. Deliberately minimal — no address, parents,
// or academic fields, since admin manages the system rather than
// having a student-style profile.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
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
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);