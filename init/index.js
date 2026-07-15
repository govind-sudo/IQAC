// require("dotenv").config();

// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");

// const Student = require("../models/Student");

// const imported = require("./data");

// const rawStudents = Array.isArray(imported)
//   ? imported
//   : imported.data;

// const MONGO_URL = process.env.MONGO_URL;

// // ==============================
// // Helper Functions
// // ==============================

// function parseDate(value) {
//   if (!value) return undefined;

//   if (value instanceof Date) return value;

//   const str = String(value).trim();

//   // Already ISO
//   if (str.includes("T")) {
//     return new Date(str);
//   }

//   // YYYY-MM-DD
//   if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
//     return new Date(str);
//   }

//   // DD-MM-YYYY
//   const parts = str.split("-");

//   if (parts.length === 3) {
//     return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
//   }

//   return new Date(str);
// }

// function toString(value) {
//   if (value === null || value === undefined) return undefined;

//   return String(value).trim();
// }

// function normalizeGender(value) {
//   if (!value) return undefined;

//   value = value.toLowerCase();

//   if (value === "male") return "male";
//   if (value === "female") return "female";

//   return "other";
// }

// function normalizeCategory(value) {
//   if (!value) return undefined;

//   value = value.toUpperCase();

//   switch (value) {
//     case "OPEN":
//     case "GENERAL":
//       return "General";

//     case "OBC":
//     case "OBC (SEBC)":
//       return "OBC";

//     case "SC":
//       return "SC";

//     case "ST":
//       return "ST";

//     case "EWS":
//       return "EWS";

//     default:
//       return "General";
//   }
// }

// // Registration form's nationality <select> only ever submits "Indian" or
// // "Other" (see register.ejs). Any legacy/seed value that isn't exactly
// // "Indian" is normalized to "Other" so downstream logic (e.g. which
// // document uploads are required) behaves the same as it does for live
// // registrations.
// function normalizeNationality(value) {
//   if (!value) return "Indian";
//   return String(value).trim().toLowerCase() === "indian" ? "Indian" : "Other";
// }

// // International students (nationality === "Other") must supply the same
// // 3 documents that registrationController.js requires at signup:
// // aoLevelCertificate, puOfferLetter, passport. This does NOT block
// // seeding — it just flags incomplete seed records so bad data doesn't
// // silently make it into the database.
// function validateInternationalDocuments(raw, nationality) {
//   if (nationality !== "Other") return;

//   const missing = [];
//   if (!raw.documents?.aoLevelCertificate) missing.push("aoLevelCertificate");
//   if (!raw.documents?.puOfferLetter) missing.push("puOfferLetter");
//   if (!raw.documents?.passport) missing.push("passport");

//   if (missing.length) {
//     console.warn(
//       `⚠️  ${raw.firstName || "Unknown"} ${raw.lastName || ""} has nationality "Other" but is missing: ${missing.join(", ")}`
//     );
//   }
// }

// function normalizeQuota(value) {
//   if (!value) return "Other";

//   value = value.toUpperCase();

//   if (value.includes("GENERAL")) return "General";
//   if (value.includes("MANAGEMENT")) return "Management";
//   if (value.includes("SPORT")) return "Sports";
//   if (value.includes("NRI")) return "NRI";

//   return "Other";
// }

// function normalizeStatus(value) {
//   if (!value) return "active";

//   return value.toLowerCase();
// }

// function normalizeProfile(value) {
//   if (!value) return "pending";

//   value = value.toLowerCase();

//   if (value === "yes") return "verified";

//   return value;
// }

// // ==============================
// // Clean One Student Record
// // ==============================

// async function cleanRecord(raw) {
//   const dob = parseDate(raw.dob);

//   // Password = DOB (YYYY-MM-DD)
//   const passwordString = dob
//     ? dob.toISOString().split("T")[0]
//     : "2000-01-01";

//   const hash = await bcrypt.hash(passwordString, 10);

//   const nationality = normalizeNationality(raw.nationality);
//   validateInternationalDocuments(raw, nationality);

//   return {
//     // ---------- Personal ----------
//     title: raw.title === "Miss" ? "Ms" : raw.title,

//     firstName: raw.firstName?.trim(),
//     middleName: raw.middleName?.trim(),
//     lastName: raw.lastName?.trim(),

//     gender: normalizeGender(raw.gender),

//     dob,

//     bloodGroup: raw.bloodGroup,

//     category: normalizeCategory(raw.category),

//     religion: raw.religion,
//     caste: raw.caste,

//     nationality,
//     state:
//       raw.state ||
//       raw.presentAddress?.state,

//     district:
//       raw.district ||
//       raw.presentAddress?.district,

//     country:
//       raw.country ||
//       raw.presentAddress?.country ||
//       "India",

//     city:
//       raw.city ||
//       raw.presentAddress?.city,

//     // ---------- Hostel ----------

//     residesInHostel:
//       raw.residesInHostel || false,

//     hostelName:
//       raw.hostelName || undefined,

//     // ---------- Authentication ----------

//     email:
//       raw.email.toLowerCase(),

//     password: hash,

//     googleId:
//       raw.googleId || undefined,

//     parulEmailId:
//       raw.parulEmailId || undefined,

//     parulEmailActive:
//       raw.parulEmailActive || false,

//     enrollmentNo:
//       raw.enrollmentNo || undefined,

//     ugNumber:
//       raw.ugNumber
//         ? String(raw.ugNumber).trim().toUpperCase()
//         : undefined,

//     // ---------- Academic ----------

//     faculty:
//       raw.faculty || "FET",

//     institute:
//       raw.institute,

//     course:
//       raw.course,

//     program:
//       raw.program,

//     department:
//       raw.department,

//     branch:
//       raw.branch || "CSE",

//     specialization:
//       raw.specialization || undefined,

//     joiningDate:
//       raw.joiningDate
//         ? parseDate(raw.joiningDate)
//         : undefined,

//     admissionYear:
//       raw.admissionYear,

//     admissionType:
//       raw.admissionType,

//     admissionQuota:
//       normalizeQuota(raw.admissionQuota),

//     studentStatus:
//       normalizeStatus(raw.studentStatus),

//     // ---------- Contact ----------

//     phone:
//       toString(raw.phone),

//     whatsapp:
//       toString(raw.whatsapp),

//     alternateEmail:
//       raw.alternateEmail
//         ? raw.alternateEmail.toLowerCase()
//         : undefined,

//     // ---------- Emergency ----------

//     emergencyContact:
//       raw.emergencyContact
//         ? {
//             name:
//               raw.emergencyContact.name,

//             phone:
//               toString(
//                 raw.emergencyContact.phone
//               ),
//           }
//         : undefined,

//     // ---------- Parents ----------

//     father:
//       raw.father
//         ? {
//             name:
//               raw.father.name,

//             phone:
//               toString(raw.father.phone),

//             email:
//               raw.father.email,
//           }
//         : undefined,

//     mother:
//       raw.mother
//         ? {
//             name:
//               raw.mother.name,

//             phone:
//               toString(raw.mother.phone),

//             email:
//               raw.mother.email,
//           }
//         : undefined,

//     // ---------- Addresses ----------

//     presentAddress:
//       raw.presentAddress
//         ? {
//             address1:
//               raw.presentAddress.address1,

//             address2:
//               raw.presentAddress.address2,

//             address3:
//               raw.presentAddress.address3,

//             city:
//               raw.presentAddress.city,

//             district:
//               raw.presentAddress.district,

//             state:
//               raw.presentAddress.state,

//             country:
//               raw.presentAddress.country,

//             pincode:
//               toString(
//                 raw.presentAddress.pincode
//               ),
//           }
//         : undefined,

//     permanentAddress:
//       raw.permanentAddress
//         ? {
//             address1:
//               raw.permanentAddress.address1,

//             address2:
//               raw.permanentAddress.address2,

//             address3:
//               raw.permanentAddress.address3,

//             city:
//               raw.permanentAddress.city,

//             district:
//               raw.permanentAddress.district,

//             state:
//               raw.permanentAddress.state,

//             country:
//               raw.permanentAddress.country,

//             pincode:
//               toString(
//                 raw.permanentAddress.pincode
//               ),
//           }
//         : undefined,

//     // ---------- Education ----------

//     education:
//       raw.education || undefined,

//     // ---------- Documents ----------

//     // Passed through as-is — aoLevelCertificate, puOfferLetter, and
//     // passport (added for international students) flow through here
//     // automatically, same as every other documents.* field.
//     documents:
//       raw.documents || undefined,

//     // ---------- Identity ----------

//     abcId:
//       raw.abcId || undefined,

//     // NOTE: Aadhaar is NOT omitted — it lives inside the `documents`
//     // sub-object above (documents.aadhaarNumber), which is passed through
//     // in full via `documents: raw.documents || undefined`.

//     // ---------- Role ----------

//     role:
//       "student",

//     // ---------- Status ----------

//     isActive:
//       raw.isActive ?? true,

//     profileStatus:
//       normalizeProfile(
//         raw.profileStatus
//       ),
//   };
// }

// // ==============================
// // Seed Database
// // ==============================

// async function seed() {
//   try {
//     await mongoose.connect(MONGO_URL);

//     console.log("\n======================================");
//     console.log("✅ Connected to MongoDB");
//     console.log("======================================");

//     console.log(`Found ${rawStudents.length} student records.\n`);

//    const cleanedStudents = [];

// for (let i = 0; i < rawStudents.length; i++) {
//   console.log(`Cleaning student ${i + 1}`);

//   console.log(rawStudents[i]);   // <-- print original data

//   const cleaned = await cleanRecord(rawStudents[i]);

//   console.log(cleaned);          // <-- print cleaned object

//   cleanedStudents.push(cleaned);
// }
//     // Delete existing students
//     await Student.deleteMany({});
//     console.log("🗑️  Old student records deleted.");

//     // Insert all students
//     await Student.insertMany(cleanedStudents);

//     console.log(`✅ Inserted ${cleanedStudents.length} students.`);

//     const total = await Student.countDocuments();

//     console.log("\n======================================");
//     console.log(`📚 Total Students in Database : ${total}`);
//     console.log("======================================");

//     // Show first few students
//     const sample = await Student.find({}, "fullName enrollmentNo email").limit(5);

//     console.log("\nSample Records:");
//     sample.forEach((student, index) => {
//       console.log(
//         `${index + 1}. ${student.fullName} | ${student.enrollmentNo} | ${student.email}`
//       );
//     });

//     console.log("\n🎉 Database seeded successfully!");
//   } catch (err) {
//     console.error("\n❌ Seeding Failed\n");
//     console.error(err);
//   } finally {
//     await mongoose.disconnect();
//     console.log("\n🔌 MongoDB Disconnected.");
//     process.exit(0);
//   }
// }

// seed();
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Student = require("../models/Student");

const imported = require("./data");

const rawStudents = Array.isArray(imported)
  ? imported
  : imported.data;

const MONGO_URL = process.env.MONGO_URL;

// ==============================
// Helper Functions
// ==============================

function parseDate(value) {
  if (!value) return undefined;

  if (value instanceof Date) return value;

  const str = String(value).trim();

  // Already ISO
  if (str.includes("T")) {
    return new Date(str);
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str);
  }

  // DD-MM-YYYY
  const parts = str.split("-");

  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }

  return new Date(str);
}

function toString(value) {
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

function normalizeCategory(value) {
  if (!value) return undefined;

  value = value.toUpperCase();

  switch (value) {
    case "OPEN":
    case "GENERAL":
      return "General";

    case "OBC":
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

// Registration form's nationality <select> only ever submits "Indian" or
// "Other" (see register.ejs). Any legacy/seed value that isn't exactly
// "Indian" is normalized to "Other" so downstream logic (e.g. which
// document uploads are required) behaves the same as it does for live
// registrations.
function normalizeNationality(value) {
  if (!value) return "Indian";
  return String(value).trim().toLowerCase() === "indian" ? "Indian" : "Other";
}

// International students (nationality === "Other") must supply the same
// 3 documents that registrationController.js requires at signup:
// aoLevelCertificate, puOfferLetter, passport. This does NOT block
// seeding — it just flags incomplete seed records so bad data doesn't
// silently make it into the database.
function validateInternationalDocuments(raw, nationality) {
  if (nationality !== "Other") return;

  const missing = [];
  if (!raw.documents?.aoLevelCertificate) missing.push("aoLevelCertificate");
  if (!raw.documents?.puAdmissionLetter) missing.push("puAdmissionLetter");
  if (!raw.documents?.passportUpload) missing.push("passportUpload");

  if (missing.length) {
    console.warn(
      `⚠️  ${raw.firstName || "Unknown"} ${raw.lastName || ""} has nationality "Other" but is missing: ${missing.join(", ")}`
    );
  }
}

// function normalizeQuota(value) {
//   if (!value) return "Other";

//   value = value.toUpperCase();

//   if (value.includes("GENERAL")) return "General";
//   if (value.includes("MANAGEMENT")) return "Management";
//   if (value.includes("SPORT")) return "Sports";
//   if (value.includes("NRI")) return "NRI";

//   return "Other";
// }

function normalizeStatus(value) {
  if (!value) return "active";

  return value.toLowerCase();
}

function normalizeProfile(value) {
  if (!value) return "pending";

  value = value.toLowerCase();

  if (value === "yes") return "verified";

  return value;
}

// ==============================
// Clean One Student Record
// ==============================

async function cleanRecord(raw) {
  const dob = parseDate(raw.dob);

  // Password = DOB (YYYY-MM-DD)
  const passwordString = dob
    ? dob.toISOString().split("T")[0]
    : "2000-01-01";

  const hash = await bcrypt.hash(passwordString, 10);

  const nationality = normalizeNationality(raw.nationality);
  validateInternationalDocuments(raw, nationality);

  return {
    // ---------- Personal ----------
    title: raw.title === "Miss" ? "Ms" : raw.title,

    firstName: raw.firstName?.trim(),
    middleName: raw.middleName?.trim(),
    lastName: raw.lastName?.trim(),

    gender: normalizeGender(raw.gender),

    dob,

    bloodGroup: raw.bloodGroup,

    category: normalizeCategory(raw.category),

    religion: raw.religion,
    caste: raw.caste,

    // nationality,
    // state:
    //   raw.state ||
    //   raw.presentAddress?.state,

    // district:
    //   raw.district ||
    //   raw.presentAddress?.district,

    // country:
    //   raw.country ||
    //   raw.presentAddress?.country ||
    //   "India",

    // city:
    //   raw.city ||
    //   raw.presentAddress?.city,

    nationality,

    passportNumber:
      raw.passportNumber || undefined,

    aadhaarNumber:
      raw.aadhaarNumber || undefined,

    // ---------- Hostel ----------

    residesInHostel:
      raw.residesInHostel || false,

    hostelName:
      raw.hostelName || undefined,

    // ---------- Authentication ----------

    email:
      raw.email.toLowerCase(),

    password: hash,

    googleId:
      raw.googleId || undefined,

    parulEmailId:
      raw.parulEmailId || undefined,

    parulEmailActive:
      raw.parulEmailActive || false,

    enrollmentNo:
      raw.enrollmentNo || undefined,

    ugNumber:
      raw.ugNumber
        ? String(raw.ugNumber).trim().toUpperCase()
        : undefined,

    // ---------- Academic ----------

    // faculty:
    //   raw.faculty || "FET",

    // institute:
    //   raw.institute,

    // course:
    //   raw.course,

    // program:
    //   raw.program,

    // department:
    //   raw.department,

    // branch:
    //   raw.branch || "CSE",

    // specialization:
    //   raw.specialization || undefined,

    // joiningDate:
    //   raw.joiningDate
    //     ? parseDate(raw.joiningDate)
    //     : undefined,

    // admissionYear:
    //   raw.admissionYear,

    // admissionType:
    //   raw.admissionType,

    // admissionQuota:
    //   normalizeQuota(raw.admissionQuota),

    // studentStatus:
    //   normalizeStatus(raw.studentStatus),


    faculty:
        raw.faculty || "FET",

    institute:
        raw.institute,

    course:
        raw.course,

    branch:
        raw.branch || "CSE",

    specialization:
        raw.specialization,

    joiningDate:
        raw.joiningDate
            ? parseDate(raw.joiningDate)
            : undefined,

    admissionYear:
        raw.admissionYear,

    admissionType:
        raw.admissionType,

    studentStatus:
        normalizeStatus(raw.studentStatus),
    // ---------- Contact ----------

    // phone:
    //   toString(raw.phone),
    phoneCode:
        raw.phoneCode || "+91",

    phone:
        toString(raw.phone),

    whatsapp:
      toString(raw.whatsapp),

    alternateEmail:
      raw.alternateEmail
        ? raw.alternateEmail.toLowerCase()
        : undefined,

    // ---------- Emergency ----------

    emergencyContact:
      raw.emergencyContact
        ? {
            name:
              raw.emergencyContact.name,

            phoneCode:
              raw.emergencyContact.phoneCode || "+91",

            phone:
              toString(
                raw.emergencyContact.phone
              ),
          }
        : undefined,

        

    // ---------- Parents ----------

    father:
      raw.father
        ? {
            name:
              raw.father.name,
            phoneCode:
              raw.father.phoneCode || "+91",
            phone:
              toString(raw.father.phone),

            email:
              raw.father.email,
          }
        : undefined,

    mother:
      raw.mother
        ? {
            name:
              raw.mother.name,
            phoneCode:
              raw.mother.phoneCode || "+91",

            phone:
              toString(raw.mother.phone),

            email:
              raw.mother.email,
          }
        : undefined,

    // ---------- Addresses ----------

    presentAddress:
      raw.presentAddress
        ? {
            address1:
              raw.presentAddress.address1,

            address2:
              raw.presentAddress.address2,

            address3:
              raw.presentAddress.address3,

            city:
              raw.presentAddress.city,

            district:
              raw.presentAddress.district,

            state:
              raw.presentAddress.state,

            country:
              raw.presentAddress.country,

            pincode:
              toString(
                raw.presentAddress.pincode
              ),
          }
        : undefined,

    permanentAddress:
      raw.permanentAddress
        ? {
            address1:
              raw.permanentAddress.address1,

            address2:
              raw.permanentAddress.address2,

            address3:
              raw.permanentAddress.address3,

            city:
              raw.permanentAddress.city,

            district:
              raw.permanentAddress.district,

            state:
              raw.permanentAddress.state,

            country:
              raw.permanentAddress.country,

            pincode:
              toString(
                raw.permanentAddress.pincode
              ),
          }
        : undefined,

    // ---------- Education ----------

    education:
      raw.education || undefined,

    // ---------- Documents ----------

    // Passed through as-is — aoLevelCertificate, puOfferLetter, and
    // passport (added for international students) flow through here
    // automatically, same as every other documents.* field.
    documents:
      raw.documents || undefined,

    // ---------- Identity ----------

    abcId:
      raw.abcId || undefined,

    // NOTE: Aadhaar is NOT omitted — it lives inside the `documents`
    // sub-object above (documents.aadhaarNumber), which is passed through
    // in full via `documents: raw.documents || undefined`.

    // ---------- Role ----------

    role:
      "student",

    // ---------- Status ----------

    isActive:
      raw.isActive ?? true,

    profileStatus:
      normalizeProfile(
        raw.profileStatus
      ),
  };
}

// ==============================
// Seed Database
// ==============================

async function seed() {
  try {
    await mongoose.connect(MONGO_URL);

    console.log("\n======================================");
    console.log("✅ Connected to MongoDB");
    console.log("======================================");

    console.log(`Found ${rawStudents.length} student records.\n`);

   const cleanedStudents = [];

for (let i = 0; i < rawStudents.length; i++) {
  console.log(`Cleaning student ${i + 1}`);

  console.log(rawStudents[i]);   // <-- print original data

  const cleaned = await cleanRecord(rawStudents[i]);

  console.log(cleaned);          // <-- print cleaned object

  cleanedStudents.push(cleaned);
}
    // Delete existing students
    await Student.deleteMany({});
    console.log("🗑️  Old student records deleted.");

    // Insert all students
    await Student.insertMany(cleanedStudents);

    console.log(`✅ Inserted ${cleanedStudents.length} students.`);

    const total = await Student.countDocuments();

    console.log("\n======================================");
    console.log(`📚 Total Students in Database : ${total}`);
    console.log("======================================");

    // Show first few students
    const sample = await Student.find({}, "fullName enrollmentNo email").limit(5);

    console.log("\nSample Records:");
    sample.forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.fullName} | ${student.enrollmentNo} | ${student.email}`
      );
    });

    console.log("\n🎉 Database seeded successfully!");
  } catch (err) {
    console.error("\n❌ Seeding Failed\n");
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB Disconnected.");
    process.exit(0);
  }
}

seed();