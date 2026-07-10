const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

router.get('/dashboard', requireAuth, requireRole('student'), studentController.dashboard);

module.exports = router;