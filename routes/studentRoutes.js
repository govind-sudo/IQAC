const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// Dashboard Route
router.get('/dashboard', requireAuth, requireRole('student'), studentController.dashboard);

// Personal Information Route
router.get('/personal', requireAuth, requireRole('student'), studentController.getPersonalPage);

// Academic Information Route
router.get('/academic', requireAuth, requireRole('student'), studentController.getAcademicPage);

// Contact & Address Information Route
router.get('/contact', requireAuth, requireRole('student'), studentController.getContactPage);

//documents information
router.get('/documents', requireAuth, requireRole('student'), studentController.getDocumentsPage);

module.exports = router;