const bcrypt = require('bcrypt');
const Student = require('../models/Student');

exports.showLogin = (req, res) => {
  res.render("students/login", {
    error: req.query.error || null,
  });
};

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