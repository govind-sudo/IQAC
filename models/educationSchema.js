// models/educationSchema.js
// Prior qualifications. For now, each level just stores a marksheet
// link — can be expanded later (board name, percentage, year passed)
// once you need more than a document reference.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const educationSchema = new Schema(
  {
    tenth: {
      marksheet: { type: String, trim: true }, // link/URL for now
    },
    twelfth: {
      marksheet: { type: String, trim: true },
    },
    diploma: {
      marksheet: { type: String, trim: true }, // optional — not every student has a diploma
    },
  },
  { _id: false }
);

module.exports = educationSchema;