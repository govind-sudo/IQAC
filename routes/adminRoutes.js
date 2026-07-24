const router = require("express").Router();
const path = require("path");
const fs = require("fs");

const adminController = require("../controllers/adminController");
const Admin = require("../models/admin");
const Student = require("../models/Student");

const { requireAuth, requireRole } = require("../middleware/auth");
const { handleUpload } = require("../middleware/uploadMiddleware");

// ==========================================
// Base Middlewares
// ==========================================
router.use(requireAuth);
router.use(requireRole("admin", "subadmin"));

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
// Resolves ?path=... against the paths this specific student actually
// owns. Admins may open any student's files, but only files that belong
// to the student named in the URL — a mismatched path is a 403, not a
// silent read of someone else's folder.
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
router.get("/export-students", adminController.exportStudentsCSV);

// ==========================================
// 2. Student Routes
// ==========================================
router.get("/students", adminController.getStudentsList);
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
router.put("/students/:id", handleUpload, adminController.updateStudent);
router.post("/students/:id/update", handleUpload, adminController.updateStudent); // backup POST if method-override isn't active
router.delete("/students/:id", adminController.deleteStudent);
router.post("/students/:id/delete", adminController.deleteStudent); // backup POST

// ==========================================
// 3. Sub-Admin & Admin Management (ROOT ADMIN ONLY)
// ==========================================

// Add New Admin (MUST BE BEFORE :id routes)
router.get("/add", requireRole("admin"), adminController.renderAddAdminForm);
router.post("/add", requireRole("admin"), adminController.addAdmin);

router.get("/allAdmins", adminController.getAllAdmins);

// Subadmin List & Specific Handlers
router.get("/subadmins", adminController.getSubAdminsList);
router.get("/subadmins/new", requireRole("admin"), adminController.renderAddSubAdminForm);
router.post("/subadmins", requireRole("admin"), adminController.createSubAdmin);

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