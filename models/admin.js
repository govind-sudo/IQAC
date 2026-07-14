const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
{
    fullName: {
        type: String,
        required: true,
        trim: true,
    },

    misCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    googleId: {
        type: String,
        default: null,
    },

    phone: {
        type: String,
        trim: true,
        default: null,
    },

    role: {
        type: String,
        enum: ["admin", "subadmin"],
        default: "subadmin",
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Admin", adminSchema);