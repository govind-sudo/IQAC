const router = require('express').Router();
const authController = require('../controllers/authController');

router.get('/login', authController.showLogin);
router.get('/logout', authController.logout);

module.exports = router;