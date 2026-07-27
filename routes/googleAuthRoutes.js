const router = require("express").Router();
const passport = require("passport");

const Student = require("../models/Student");
const Admin = require("../models/admin");

// ==========================================================
// HELPER: Session Helper for Session Regeneration
// ==========================================================
const createAuthenticatedSession = (req, res, sessionData, redirectUrl) => {
  req.session.regenerate((err) => {
    if (err) {
      console.error("Session regeneration error:", err);
      return res.redirect("/login?error=Authentication failed");
    }

    Object.assign(req.session, sessionData);

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Session save error:", saveErr);
        return res.redirect("/login?error=Authentication failed");
      }
      return res.redirect(redirectUrl);
    });
  });
};

// ==========================================================
// STUDENT : STEP 1
// ==========================================================
router.post("/auth/enrollment-check", async (req, res) => {
  try {
    const { enrollmentNo } = req.body;

    if (!enrollmentNo || typeof enrollmentNo !== "string") {
      return res.redirect("/login?error=Please enter a valid UG Number");
    }

    const cleanEnrollment = enrollmentNo.trim();
    const student = await Student.findOne({ enrollmentNo: cleanEnrollment });

    if (!student) {
      return res.redirect("/login?error=Invalid UG Number");
    }

    req.session.pendingEnrollmentNo = cleanEnrollment;
    delete req.session.pendingAdminId;
    delete req.session.loginType;

    return res.redirect("/auth/google");
  } catch (err) {
    console.error("Enrollment check error:", err);
    return res.redirect("/login");
  }
});

// ==========================================================
// ADMIN : STEP 1
// ==========================================================
router.post("/auth/admin-check", async (req, res) => {
  try {
    const { misCode } = req.body;

    if (!misCode || typeof misCode !== "string") {
      return res.redirect("/login?error=Please enter a valid MIS Code");
    }

    const cleanMisCode = misCode.toUpperCase().trim();
    const admin = await Admin.findOne({ misCode: cleanMisCode });

    if (!admin) {
      return res.redirect("/login?error=Invalid MIS Code");
    }

    if (!admin.isActive) {
      return res.redirect("/login?error=Account Disabled");
    }

    req.session.pendingAdminId = admin._id.toString();
    req.session.loginType = "admin";
    delete req.session.pendingEnrollmentNo;

    return res.redirect("/auth/google");
  } catch (err) {
    console.error("Admin check error:", err);
    return res.redirect("/login");
  }
});

// ==========================================================
// GOOGLE LOGIN
// ==========================================================
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// ==========================================================
// GOOGLE CALLBACK
// ==========================================================
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login?error=Google authentication failed",
  }),
  async (req, res) => {
    try {
      if (!req.user || !req.user.emails || !req.user.emails.length) {
        return res.redirect("/login?error=No email associated with Google account");
      }

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

        // Verify account existence and active status
        if (!admin || !admin.isActive) {
          return res.redirect("/login?error=Account is invalid or disabled");
        }

        // First Login - Link Google ID
        if (!admin.googleId) {
          if (admin.email.toLowerCase() !== googleEmail) {
            return res.redirect("/login?error=Invalid MIS Code or Google Account");
          }

          admin.googleId = googleProfile.id;

          try {
            await admin.save();
          } catch (saveErr) {
            if (saveErr.code === 11000 && saveErr.keyPattern?.googleId) {
              return res.redirect(
                "/login?error=This Google account is already linked to a different profile."
              );
            }
            throw saveErr;
          }
        } else {
          // Subsequent Logins - Verify matching Google ID
          if (admin.googleId !== googleProfile.id) {
            return res.redirect("/login?error=Invalid MIS Code or Google Account");
          }
        }

        return createAuthenticatedSession(
          req,
          res,
          { userId: admin._id, role: admin.role },
          "/admin/dashboard"
        );
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

      // First Login - Link Google ID
      if (!student.googleId) {
        if (student.email.toLowerCase() !== googleEmail) {
          return res.redirect("/login?error=Invalid UG Number or Google Account");
        }

        student.googleId = googleProfile.id;
        student.parulEmailId = googleEmail;
        student.parulEmailActive = true;

        try {
          await student.save();
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern?.googleId) {
            return res.redirect(
              "/login?error=This Google account is already linked to a different student profile."
            );
          }
          throw saveErr;
        }
      } else {
        // Subsequent Logins - Verify matching Google ID
        if (student.googleId !== googleProfile.id) {
          return res.redirect("/login?error=Invalid UG Number or Google Account");
        }
      }

      return createAuthenticatedSession(
        req,
        res,
        { userId: student._id, role: "student" },
        "/students/dashboard"
      );
    } catch (err) {
      console.error("OAuth Callback error:", err);
      return res.redirect("/login?error=An unexpected error occurred");
    }
  }
);

module.exports = router;