// models/addressSchema.js
// Reusable shape for presentAddress / permanentAddress on Student.
// Not a standalone model — no mongoose.model() call here — just a
// Schema to be embedded inside other schemas.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    address1: { type: String, trim: true },
    address2: { type: String, trim: true },
    address3: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
  },
  { _id: false } // sub-document doesn't need its own _id
);

module.exports = addressSchema;