// models/documentsSchema.js
// Proof documents required alongside certain fields (ABC ID, caste,
// nationality, leaving certificate). Same pattern as educationSchema.js —
// just links for now, not full metadata.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentsSchema = new Schema(
  {
    abcIdProof: { type: String, trim: true },       // proof for ABC ID / APAAR ID
    casteProof: { type: String, trim: true },
    nationalityProof: { type: String, trim: true },
    leavingCertificate: { type: String, trim: true },
    aadhaarNumber: {
      type: String,
      unique: true,
      sparse: true, // not every student may have it filled in immediately
      select: false, // sensitive — excluded from queries unless explicitly requested
    },
  },
  { _id: false }
);

module.exports = documentsSchema;