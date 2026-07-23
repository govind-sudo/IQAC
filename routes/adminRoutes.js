const router = require("express").Router();
const adminController = require("../controllers/adminController");
const Admin = require("../models/admin");
const path = require("path");
const fs = require("fs");
const Student = require("../models/Student");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleUpload } = require("../middleware/uploadMiddleware");

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

router.get("/dashboard", adminController.getDashboard);
router.get("/export-students", adminController.exportStudentsCSV);
router.get("/students", adminController.getStudentsList);
router.get("/students/:id/inDetail", adminController.getStudentInDetail);
router.get("/students/:id/documents/file", async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).lean();
        if (!student) return res.status(404).send("Student not found");

        const relativePath = req.query.path;
        if (!relativePath || !relativePath.startsWith("uploads/")) {
            return res.status(400).send("Invalid path");
        }

        const ownedPaths = Object.values(student.documents || {})
            .concat(
                student.education?.tenth?.marksheet,
                student.education?.twelfth?.marksheet,
                student.education?.diploma?.marksheet
            )
            .filter(Boolean);

        if (!ownedPaths.includes(relativePath)) {
            return res.status(403).send("Forbidden");
        }

        const absolutePath = path.join(__dirname, "..", relativePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).send("File not found");
        }

        res.sendFile(absolutePath);
    } catch (err) {
        console.error("Error serving admin document view:", err);
        res.status(500).send("Server error");
    }
});

// ---------- Student Edit / Delete (NEW) ----------
router.get("/students/:id/edit", adminController.renderEditStudentForm);
router.put("/students/:id", handleUpload, adminController.updateStudent);
router.post("/students/:id/update", handleUpload, adminController.updateStudent); // backup POST if method-override isn't active
router.delete("/students/:id", adminController.deleteStudent);
router.post("/students/:id/delete", adminController.deleteStudent); // backup POST

router.get("/subadmins", adminController.getSubAdminsList);
router.get("/subadmins/new", requireRole("admin"), adminController.renderAddSubAdminForm);
router.post("/subadmins", requireRole("admin"), adminController.createSubAdmin);
router.get("/subadmins/:id/edit", requireRole("admin"), adminController.renderEditSubAdminForm);
router.put("/subadmins/:id", requireRole("admin"), adminController.updateSubAdmin);
router.post("/subadmins/:id/update", requireRole("admin"), adminController.updateSubAdmin);
router.delete("/subadmins/:id", requireRole("admin"), adminController.deleteSubAdmin);
router.post("/subadmins/:id/delete", requireRole("admin"), adminController.deleteSubAdmin);

router.get("/profile", adminController.getMyProfile);
router.get("/:id/edit", requireRole("admin"), adminController.renderEditProfileForm);
router.put("/:id/edit", requireRole("admin"), adminController.updateAdminProfile);
router.post("/:id/edit", requireRole("admin"), adminController.updateAdminProfile);

module.exports = router;