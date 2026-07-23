// routes/registrationRoutes.js

const express = require('express');
const router = express.Router();
const {
  showRegisterForm,
  registerStudent,
} = require('../controllers/registrationController');

const { handleUpload } = require('../middleware/uploadMiddleware');
const validateFileSignatures = require('../middleware/validateFileSignatures');

router.get('/register', showRegisterForm);

// Pipeline: Upload Middleware (Multer) -> Signature Validator -> Controller
router.post('/register', handleUpload, validateFileSignatures, registerStudent);

module.exports = router;
