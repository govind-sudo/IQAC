const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// Dashboard Route
router.get('/dashboard', requireAuth, requireRole('student'), studentController.dashboard);

// Personal Information Route
router.get('/personal', requireAuth, requireRole('student'), studentController.getPersonalPage);

// Academic Information Route (New Setup)
router.get('/academic', requireAuth, requireRole('student'), studentController.getAcademicPage);

module.exports = router;