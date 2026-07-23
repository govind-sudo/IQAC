const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// Registration success page — intentionally NOT behind requireAuth,
// since a student who just completed registration doesn't have a
// session yet (registration creates the account but doesn't log them
// in). Must come before any other route that might match a similar
// path pattern.
router.get('/registerSuccess', (req, res) => {
  res.render('students/registerSuccess');
});

// Dashboard Route
router.get('/dashboard', requireAuth, requireRole('student'), studentController.dashboard);

// Personal Information Route
router.get('/personal', requireAuth, requireRole('student'), studentController.getPersonalPage);

// Academic Information Route
router.get('/academic', requireAuth, requireRole('student'), studentController.getAcademicPage);

// Contact & Address Information Route
router.get('/contact', requireAuth, requireRole('student'), studentController.getContactPage);

// Documents Information Route
router.get('/documents', requireAuth, requireRole('student'), studentController.getDocumentsPage);

module.exports = router;