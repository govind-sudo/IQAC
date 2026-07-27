
const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentsSchema = new Schema(
  {
    aadhaarProof: { type: String, trim: true },
    abcIdProof: { type: String, trim: true },       // proof for ABC ID / APAAR ID
    casteProof: { type: String, trim: true },
    leavingCertificate: { type: String, trim: true },
    pwdProof: {
        type: String,
        trim: true,
    },

    passportUpload: {
        type: String,
        trim: true,
    },

    puAdmissionLetter: {
        type: String,
        trim: true,
    },

    aoLevelCertificate: {
        type: String,
        trim: true,
    },

 
  },
  { _id: false }
);

module.exports = documentsSchema;