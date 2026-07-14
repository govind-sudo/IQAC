const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");

router.get(
    "/dashboard",
    requireAuth,
    requireRole("admin", "subadmin"),
    (req, res) => {

        res.render("admin/dashboard");
    }
);

module.exports = router;