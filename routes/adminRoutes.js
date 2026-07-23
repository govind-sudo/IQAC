const router = require("express").Router();
const adminController = require("../controllers/adminController");
const Admin = require("../models/admin");
const { requireAuth, requireRole } = require("../middleware/auth");

// Route protection & admin loading
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

// Dashboard Route
router.get("/dashboard", adminController.getDashboard);

// Export Students CSV Endpoint
router.get("/export-students", adminController.exportStudentsCSV);

// Students Route
router.get("/students", adminController.getStudentsList);

// View detailed student profile
router.get("/students/:id/inDetail", adminController.getStudentInDetail);

// Sub-Admins Management Routes
router.get("/subadmins", adminController.getSubAdminsList);

// Render Add Sub-Admin Form (Admin Only)
router.get("/subadmins/new", requireRole("admin"), adminController.renderAddSubAdminForm);

// Create Sub-Admin Endpoint (Admin Only)
router.post("/subadmins", requireRole("admin"), adminController.createSubAdmin);

// Render Edit Sub-Admin Form (Admin Only)
router.get("/subadmins/:id/edit", requireRole("admin"), adminController.renderEditSubAdminForm);

// Update Sub-Admin Endpoint (Admin Only)
router.put("/subadmins/:id", requireRole("admin"), adminController.updateSubAdmin);

// Backup POST route if method-override isn't active
router.post("/subadmins/:id/update", requireRole("admin"), adminController.updateSubAdmin);

// Delete Sub-Admin Endpoint (Admin Only)
router.delete("/subadmins/:id", requireRole("admin"), adminController.deleteSubAdmin);

// Backup POST route
router.post("/subadmins/:id/delete", requireRole("admin"), adminController.deleteSubAdmin);

// Read-Only Profile Route (Both Admin & Sub-Admin)
router.get("/profile", adminController.getMyProfile);

// Admin Self-Edit Profile Routes (Admin Only)
router.get("/:id/edit", requireRole("admin"), adminController.renderEditProfileForm);
router.put("/:id/edit", requireRole("admin"), adminController.updateAdminProfile);
router.post("/:id/edit", requireRole("admin"), adminController.updateAdminProfile); // Backup POST

module.exports = router;