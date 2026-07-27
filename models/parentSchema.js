

const mongoose = require('mongoose');
const { Schema } = mongoose;

const parentSchema = new Schema(
  {
    name: { type: String, trim: true },
    phoneCode: { type: String, default: "+91",},
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

module.exports = parentSchema;