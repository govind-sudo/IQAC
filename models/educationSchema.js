// models/educationSchema.js
// Prior qualifications. Each level captures school/college name, the
// result type (percentage vs CGPA) with its value, and a marksheet link.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const qualificationLevelSchema = new Schema(
  {
    schoolName: { type: String, trim: true },
    gradeType: { type: String, enum: ['percentage', 'cgpa'] },
    gradeValue: { type: Number },
    marksheet: { type: String, trim: true }, // link/URL for now
  },
  { _id: false }
);

const educationSchema = new Schema(
  {
    tenth: qualificationLevelSchema,
    twelfth: qualificationLevelSchema,
    diploma: qualificationLevelSchema, // optional — not every student has a diploma
  },
  { _id: false }
);

module.exports = educationSchema;