// models/parentSchema.js
// Reusable shape for father / mother on Student.
// Not a standalone model — just a Schema to be embedded.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const parentSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

module.exports = parentSchema;