const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Student = require("../models/student");

const imported = require("./data");
const rawStudents = Array.isArray(imported)
  ? imported
  : imported.data;

const MONGO_URI = process.env.MONGO_URL

// ---------------- Helper Functions ----------------

function parseDob(dobStr) {
  if (!dobStr) return undefined;

  if (dobStr.includes("T")) {
    return new Date(dobStr);
  }

  const [day, month, year] = dobStr.split("-");
  return new Date(`${year}-${month}-${day}`);
}

function numToString(value) {
  if (value === null || value === undefined) return undefined;
  return String(value).trim();
}

function normalizeGender(value) {
  if (!value) return undefined;
  value = value.toLowerCase();

  if (value === "male") return "male";
  if (value === "female") return "female";

  return "other";
}

function normalizeStudentStatus(value) {
  if (!value) return "active";
  return value.toLowerCase();
}

function normalizeProfileStatus(value) {
  if (!value) return "incomplete";

  value = value.toLowerCase();

  if (value === "yes") return "verified";

  return value;
}

function normalizeCategory(value) {
  if (!value) return undefined;

  switch (value.toUpperCase()) {
    case "OPEN":
      return "General";

    case "OBC (SEBC)":
      return "OBC";

    case "SC":
      return "SC";

    case "ST":
      return "ST";

    case "EWS":
      return "EWS";

    default:
      return "General";
  }
}

function normalizeQuota(value) {
  if (!value) return "Other";

  value = value.toUpperCase();

  if (value.includes("MANAGEMENT")) return "Management";
  if (value.includes("SPORT")) return "Sports";
  if (value.includes("NRI")) return "NRI";
  if (value.includes("GENERAL")) return "General";

  return "Other";
}

// ---------------- Cleaning ----------------

async function cleanRecord(raw) {
  const hash = await bcrypt.hash("ChangeMe123!", 10);

  return {
    title:
      raw.title === "Miss"
        ? "Ms"
        : raw.title,

    firstName: raw.firstName,
    middleName: raw.middleName,
    lastName: raw.lastName,

    gender: normalizeGender(raw.gender),
    dob: parseDob(raw.dob),

    bloodGroup: raw.bloodGroup,
    category: normalizeCategory(raw.category),

    religion: raw.religion,
    caste: raw.caste,

    email: raw.email.toLowerCase(),

    password: hash,

    enrollmentNo: raw.enrollmentNo,

    institute: raw.institute,
    course: raw.course,
    program: raw.program,
    department: raw.department,

    admissionYear: raw.admissionYear,
    admissionType: raw.admissionType,
    admissionQuota: normalizeQuota(raw.admissionQuota),

    studentStatus: normalizeStudentStatus(raw.studentStatus),

    phone: numToString(raw.phone),
    whatsapp: numToString(raw.whatsapp),

    alternateEmail: raw.alternateEmail,

    emergencyContact: raw.emergencyContact
      ? {
          name: raw.emergencyContact.name,
          phone: numToString(raw.emergencyContact.phone),
        }
      : undefined,

    father: raw.father
      ? {
          name: raw.father.name,
          phone: numToString(raw.father.phone),
          email: raw.father.email,
        }
      : undefined,

    mother: raw.mother
      ? {
          name: raw.mother.name,
          phone: numToString(raw.mother.phone),
          email: raw.mother.email,
        }
      : undefined,

    presentAddress: raw.presentAddress
      ? {
          ...raw.presentAddress,
          pincode: numToString(raw.presentAddress.pincode),
        }
      : undefined,

    permanentAddress: raw.permanentAddress
      ? {
          ...raw.permanentAddress,
          pincode: numToString(raw.permanentAddress.pincode),
        }
      : undefined,

    aadhaarNumber: numToString(raw.aadhaarNumber),

    mentorFaculty: undefined,

    profileStatus: normalizeProfileStatus(raw.profileStatus),

    isActive: raw.isActive,
  };
}

// ---------------- Seed ----------------

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ Connected");

    console.log("Records Found:", rawStudents.length);

    const cleaned = await Promise.all(
      rawStudents.map(cleanRecord)
    );

    console.log("Cleaned:", cleaned.length);

    // Remove previous students
    await Student.deleteMany({});
    console.log("Old records deleted.");

    // Insert one by one to identify errors
    for (let i = 0; i < cleaned.length; i++) {
      try {
        await Student.create(cleaned[i]);
        console.log(
          `Inserted ${i + 1}/${cleaned.length}`
        );
      } catch (err) {
        console.log(
          `❌ Failed Record ${i + 1}`
        );
        console.log(err.message);
      }
    }

    const count = await Student.countDocuments();

    console.log("\n=======================");
    console.log("Students in Database:", count);
    console.log("=======================\n");
  } catch (err) {
    console.log(err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

seed();