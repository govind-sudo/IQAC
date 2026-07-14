const router = require("express").Router();
const passport = require("passport");

const Student = require("../models/Student");
const Admin = require("../models/admin");


// ==========================================================
// STUDENT : STEP 1
// Student enters UG Number
// ==========================================================

router.post("/auth/enrollment-check", async (req, res) => {
  try {
    console.log("SESSION ID at enrollment-check:", req.sessionID);

    const { enrollmentNo } = req.body;

    if (!enrollmentNo) {
      return res.redirect("/login?error=Please enter UG Number");
    }

    const student = await Student.findOne({ enrollmentNo });

    if (!student) {
      return res.redirect("/login?error=Invalid UG Number");
    }

    req.session.pendingEnrollmentNo = enrollmentNo;

    // Remove any previous admin session values
    delete req.session.pendingAdminId;
    delete req.session.loginType;

    return res.redirect("/auth/google");
  } catch (err) {
    console.error(err);
    return res.redirect("/login");
  }
});


// ==========================================================
// ADMIN : STEP 1
// Admin/Subadmin enters MIS Code
// ==========================================================

router.post("/auth/admin-check", async (req, res) => {
  try {
    const { misCode } = req.body;

    if (!misCode) {
      return res.redirect("/login?error=Please enter MIS Code");
    }

    const admin = await Admin.findOne({
      misCode: misCode.toUpperCase().trim(),
    });

    if (!admin) {
      return res.redirect("/login?error=Invalid MIS Code");
    }

    if (!admin.isActive) {
      return res.redirect("/login?error=Account Disabled");
    }

    req.session.pendingAdminId = admin._id;
    req.session.loginType = "admin";

    // Remove any previous student session values
    delete req.session.pendingEnrollmentNo;

    return res.redirect("/auth/google");
  } catch (err) {
    console.error(err);
    return res.redirect("/login");
  }
});


// ==========================================================
// GOOGLE LOGIN
// ==========================================================

router.get(
  "/auth/google",
  (req, res, next) => {
    console.log("SESSION ID at /auth/google:", req.sessionID);
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    // hd: "paruluniversity.ac.in",
  })
);


// ==========================================================
// GOOGLE CALLBACK
// ==========================================================

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {

      console.log("SESSION:", req.session);

      const googleProfile = req.user;
      const googleEmail = googleProfile.emails[0].value.toLowerCase();



      // =====================================================
      // ADMIN / SUBADMIN LOGIN
      // =====================================================

      if (req.session.loginType === "admin") {

        const adminId = req.session.pendingAdminId;

        if (!adminId) {
          return res.redirect("/login");
        }

        const admin = await Admin.findById(adminId);

        if (!admin) {
          return res.redirect("/login?error=Admin not found");
        }

        // -------------------------------
        // FIRST LOGIN
        // -------------------------------

        if (!admin.googleId) {

          if (admin.email.toLowerCase() !== googleEmail) {
            return res.redirect("/login?error=Invalid MIS Code or Google Account");
          }

          admin.googleId = googleProfile.id;

          await admin.save();
        }

        // -------------------------------
        // NEXT LOGINS
        // -------------------------------

        else {

          if (admin.googleId !== googleProfile.id) {
            return res.redirect("/login?error=Invalid MIS Code or Google Account");
          }

        }

        delete req.session.pendingAdminId;
        delete req.session.loginType;

        req.session.userId = admin._id;
        req.session.role = admin.role;

        return res.redirect("/admin/dashboard");
      }



      // =====================================================
      // STUDENT LOGIN
      // =====================================================

      const enrollmentNo = req.session.pendingEnrollmentNo;

      if (!enrollmentNo) {
        return res.redirect("/login");
      }

      const student = await Student.findOne({ enrollmentNo });

      if (!student) {
        return res.redirect("/login?error=Student not found");
      }

      // -------------------------------
      // FIRST LOGIN
      // -------------------------------

      if (!student.googleId) {

        if (student.email.toLowerCase() !== googleEmail) {
          return res.redirect("/login?error=Invalid UG Number or Google Account");
        }

        student.googleId = googleProfile.id;
        student.parulEmailId = googleEmail;
        student.parulEmailActive = true;

        await student.save();
      }

      // -------------------------------
      // NEXT LOGIN
      // -------------------------------

      else {

        if (student.googleId !== googleProfile.id) {
          return res.redirect("/login?error=Invalid UG Number or Google Account");
        }

      }

      delete req.session.pendingEnrollmentNo;

      req.session.userId = student._id;
      req.session.role = "student";

      return res.redirect("/students/dashboard");

    } catch (err) {
      console.error(err);
      return res.redirect("/login");
    }
  }
);

module.exports = router;