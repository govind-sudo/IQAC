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