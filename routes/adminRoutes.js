const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const XLSX = require("xlsx");

const adminController = require("../controllers/adminController");
const documentBulkController = require("../controllers/documentBulkController");
const Admin = require("../models/admin");
const Student = require("../models/Student");

const { requireAuth, requireRole } = require("../middleware/auth");
const { handleAdminUpload } = require("../middleware/uploadMiddleware");

// Configure Multer for Excel file upload (In-Memory)
const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Max
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.mimetype === "application/vnd.ms-excel"
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
        }
    },
});

// ==========================================
// Base Middlewares
// ==========================================
router.use(requireAuth);
router.use(requireRole("admin", "subadmin"));

// One-time flash messages ("Sub-Admin created successfully", etc).
router.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    if (req.session.flash) delete req.session.flash;
    next();
});

router.use(async (req, res, next) => {
    try {
        const loggedInAdmin = await Admin.findById(req.session.userId);
        if (!loggedInAdmin) return res.redirect("/login");
        req.admin = loggedInAdmin;
        res.locals.admin = loggedInAdmin;
        next();
    } catch (err) {
        res.redirect("/login");
    }
});

// ==========================================
// Shared helper for the document view/download routes
// ==========================================
async function resolveOwnedDocument(req, res) {
    const student = await Student.findById(req.params.id).lean();
    if (!student) {
        res.status(404).send("Student not found");
        return null;
    }

    const relativePath = req.query.path;
    if (!relativePath || !relativePath.startsWith("uploads/")) {
        res.status(400).send("Invalid path");
        return null;
    }

    const ownedPaths = Object.values(student.documents || {})
        .concat(
            student.education?.tenth?.marksheet,
            student.education?.twelfth?.marksheet,
            student.education?.diploma?.marksheet
        )
        .filter(Boolean);

    if (!ownedPaths.includes(relativePath)) {
        res.status(403).send("Forbidden");
        return null;
    }

    const absolutePath = path.join(__dirname, "..", relativePath);
    if (!fs.existsSync(absolutePath)) {
        res.status(404).send("File not found");
        return null;
    }

    return absolutePath;
}

// ==========================================
// 1. Static General Routes
// ==========================================
router.get("/dashboard", adminController.getDashboard);
router.get("/profile", adminController.getMyProfile);
router.get("/help", adminController.getHelpPage);
router.get("/export-students", adminController.exportStudentsCSV);

// Bulk document downloads (one ZIP per document type)
router.get("/documents", documentBulkController.getBulkDownloadsPage);
router.get("/documents/download", documentBulkController.downloadDocumentsByType);

// ==========================================
// 2. Student Routes
// ==========================================
router.get("/students", adminController.getStudentsList);

// Bulk Update Enrollment Numbers from Excel Sheet
router.post(
    "/students/upload-enrollments",
    excelUpload.single("excelFile"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Please upload an Excel file." });
            }

            // 1. Read Excel workbook from RAM buffer
            const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // 2. Convert sheet data to JSON array
            const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            if (!rawData || rawData.length === 0) {
                return res.status(400).json({ error: "Uploaded Excel file is empty." });
            }

            // 3. Prepare MongoDB bulk operations
            const bulkOps = [];
            const skippedRows = [];
            const seenEnrollments = new Set();

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];

                // Flexible header matching
                const ugNumber = (row.ugNumber || row["UG Number"] || row["ug_number"])
                    ?.toString()
                    .trim()
                    .toUpperCase();

                const enrollmentNo = (row.enrollmentNo || row["Enrollment No"] || row["enrollment_no"])
                    ?.toString()
                    .trim()
                    .toUpperCase();

                if (ugNumber && enrollmentNo) {
                    // Check for duplicate enrollment numbers within the uploaded sheet
                    if (seenEnrollments.has(enrollmentNo)) {
                        skippedRows.push({
                            rowNumber: i + 2,
                            reason: `Duplicate enrollment number '${enrollmentNo}' found in sheet.`,
                        });
                        continue;
                    }
                    seenEnrollments.add(enrollmentNo);

                    bulkOps.push({
                        updateOne: {
                            filter: { ugNumber: ugNumber },
                            update: { $set: { enrollmentNo: enrollmentNo } },
                        },
                    });
                } else {
                    skippedRows.push({
                        rowNumber: i + 2,
                        reason: "Missing required 'UG Number' or 'Enrollment No' column value.",
                    });
                }
            }

            if (bulkOps.length === 0) {
                return res.status(400).json({
                    error: "No valid rows found. Ensure Excel column headers are 'UG Number' and 'Enrollment No'.",
                });
            }

            // 4. Execute high-speed bulk update
            const result = await Student.bulkWrite(bulkOps, { ordered: false });

            return res.json({
                success: true,
                message: "Enrollment numbers updated successfully.",
                stats: {
                    totalRowsParsed: rawData.length,
                    matchedStudents: result.matchedCount,
                    updatedStudents: result.modifiedCount,
                    skippedRowsCount: skippedRows.length,
                },
                skippedRows,
            });
        } catch (err) {
            console.error("Bulk enrollment upload error:", err);

            // Handle MongoDB duplicate key error (E11000)
            if (err.code === 11000 || err.name === "BulkWriteError") {
                return res.status(400).json({
                    error: "One or more Enrollment Numbers already exist in the database or excel sheet.",
                });
            }

            return res.status(500).json({
                error: err.message || "Failed to process Excel file due to a server error.",
            });
        }
    }
);
router.get("/students/:id/inDetail", adminController.getStudentInDetail);

// View a document inline (opens in a new tab)
router.get("/students/:id/documents/file", async (req, res) => {
    try {
        const absolutePath = await resolveOwnedDocument(req, res);
        if (!absolutePath) return;
        res.sendFile(absolutePath);
    } catch (err) {
        console.error("Error serving admin document view:", err);
        res.status(500).send("Server error");
    }
});

// Download a document as an attachment
router.get("/students/:id/documents/download", async (req, res) => {
    try {
        const absolutePath = await resolveOwnedDocument(req, res);
        if (!absolutePath) return;
        res.download(absolutePath);
    } catch (err) {
        console.error("Error downloading document:", err);
        res.status(500).send("Server error");
    }
});

// Student Edit / Delete
router.get("/students/:id/edit", adminController.renderEditStudentForm);
router.put("/students/:id", handleAdminUpload, adminController.updateStudent);
router.post("/students/:id/update", handleAdminUpload, adminController.updateStudent); // backup POST if method-override isn't active
router.delete("/students/:id", adminController.deleteStudent);
router.post("/students/:id/delete", adminController.deleteStudent); // backup POST

// ==========================================
// 3. Sub-Admin & Admin Management (ROOT ADMIN ONLY)
// ==========================================

// Add New Admin (MUST BE BEFORE :id routes)
router.get("/add", requireRole("admin"), adminController.renderAddAdminForm);
router.post("/add", requireRole("admin"), adminController.addAdmin);

router.get("/allAdmins", adminController.getAllAdmins);

// Admin management actions
router.post("/admins/:id/demote", requireRole("admin"), adminController.demoteAdmin);
router.post("/admins/:id/status", requireRole("admin"), adminController.toggleAdminStatus);
router.post("/admins/:id/delete", requireRole("admin"), adminController.deleteAdmin);
router.delete("/admins/:id", requireRole("admin"), adminController.deleteAdmin);

// Subadmin List & Specific Handlers
router.get("/subadmins", adminController.getSubAdminsList);
router.get("/subadmins/new", requireRole("admin"), adminController.renderAddSubAdminForm);
router.post("/subadmins", requireRole("admin"), adminController.createSubAdmin);

router.post("/subadmins/:id/promote", requireRole("admin"), adminController.promoteSubAdmin);
router.get("/subadmins/:id/edit", requireRole("admin"), adminController.renderEditSubAdminForm);
router.put("/subadmins/:id", requireRole("admin"), adminController.updateSubAdmin);
router.post("/subadmins/:id/update", requireRole("admin"), adminController.updateSubAdmin);
router.delete("/subadmins/:id", requireRole("admin"), adminController.deleteSubAdmin);
router.post("/subadmins/:id/delete", requireRole("admin"), adminController.deleteSubAdmin);

// Admin Profile Edit (Keep at bottom due to broad `/:id` match)
router.get("/:id/edit", requireRole("admin"), adminController.renderEditProfileForm);
router.put("/:id/edit", requireRole("admin"), adminController.updateAdminProfile);
router.post("/:id/edit", requireRole("admin"), adminController.updateAdminProfile);

module.exports = router;