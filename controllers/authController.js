const bcrypt = require('bcrypt');
const Student = require('../models/Student');

exports.showLogin = (req, res) => {
  res.render("students/login", {
    error: req.query.error || null,
  });
};

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const student = await Student.findOne({ email: email.toLowerCase() }).select('+password');

//     if (!student) {
//       return res.render('students/login', { error: 'Invalid email or password.' });
//     }

//     const isMatch = await bcrypt.compare(password, student.password);
//     if (!isMatch) {
//       return res.render('students/login', { error: 'Invalid email or password.' });
//     }

//     req.session.userId = student._id;
//     req.session.role = 'student';
//     res.redirect('/students/dashboard');
//   } catch (err) {
//     console.error('Login failed:', err.message);
//     res.status(500).render('errors/500');
//   }
// };

exports.logout = (req, res) => {
  const userRole = req.session.role;

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout session destruction failed:", err);
      
      // Smart fallback redirect based on who was logged in
      if (userRole === "admin" || userRole === "subadmin") {
        return res.redirect("/admin/dashboard");
      }
      return res.redirect("/students/dashboard");
    }

    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
};