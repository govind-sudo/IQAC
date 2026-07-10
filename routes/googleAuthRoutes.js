const router = require('express').Router();
const passport = require('passport');
const Student = require('../models/Student');

// Step 1 — student submits their UG Number first
router.post('/auth/enrollment-check', async (req, res) => {
  console.log('SESSION ID at enrollment-check:', req.sessionID);

  const { enrollmentNo } = req.body;

  console.log("Received enrollment:", enrollmentNo);

  const student = await Student.findOne({ enrollmentNo });

  console.log("Student found:", student);

  if (!student) {
    return res.redirect("/login?error=Invalid UG Number or Google Account");
  }

  console.log("Redirecting to Google...");

  req.session.pendingEnrollmentNo = enrollmentNo;
  res.redirect('/auth/google');
});
// Step 2 — kick off Google's login screen
router.get(
  '/auth/google',
  (req, res, next) => {
    console.log('SESSION ID at /auth/google:', req.sessionID);
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // hd: 'paruluniversity.ac.in',
  })
);

// Step 3 — Google sends them back here after they approve
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login',
  }),
  async (req, res) => {
    try {
      console.log('SESSION ID at callback:', req.sessionID);

      const enrollmentNo = req.session.pendingEnrollmentNo;

      if (!enrollmentNo) {
        return res.redirect('/login');
      }

      const googleProfile = req.user;
      const googleEmail = googleProfile.emails[0].value.toLowerCase();

      console.log("Google Email:", googleEmail);

      const student = await Student.findOne({ enrollmentNo });

      if (!student) {
        return res.render("students/login", {
          error: "Student not found.",
        });
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
      // NEXT LOGINS
      // -------------------------------
      else {

        if (student.googleId !== googleProfile.id) {
          return res.redirect("/login?error=Invalid UG Number or Google Account");
        }

      }

      delete req.session.pendingEnrollmentNo;

      req.session.userId = student._id;
      req.session.role = "student";

      res.redirect("/students/dashboard");

    } catch (err) {
      console.log(err);
      res.redirect("/login");
    }
  }
);

module.exports = router;