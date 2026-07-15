// models/emergencyContactSchema.js
// Reusable shape for emergencyContact on Student.
// Not a standalone model — just a Schema to be embedded.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const emergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true },
    phoneCode: { type: String, default: "+91",},
    phone: { type: String, trim: true },
  },
  { _id: false }
);

module.exports = emergencyContactSchema;