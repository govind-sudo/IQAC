// routes/registrationRoutes.js

const express = require('express');
const router = express.Router();
const {
  showRegisterForm,
  registerStudent,
} = require('../controllers/registrationController');

router.get('/register', showRegisterForm);
router.post('/register', registerStudent);

module.exports = router;