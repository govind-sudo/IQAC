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

    // ---------- International students only (nationality === 'Other') ----------
    // Kept optional here — conditional "required if nationality is Other" is
    // enforced in registrationController.js, same pattern already used for
    // father/mother/address/education checks in this codebase.
    aoLevelCertificate: { type: String, trim: true },
    puOfferLetter: { type: String, trim: true },
    passport: { type: String, trim: true },

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