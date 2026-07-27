
const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    address1: { type: String, trim: true },
    address2: { type: String, trim: true },
    address3: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

module.exports = addressSchema;