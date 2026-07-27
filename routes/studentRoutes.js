const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');
const path = require('path');
const fs = require('fs');


router.get('/documents/file', requireAuth, requireRole('student'), async (req, res) => {
  const Student = require('../models/Student');
  const student = await Student.findById(req.session.userId);
  if (!student) return res.status(404).send('Not found');

  const relativePath = req.query.path; // e.g. "uploads/24UG.../aadhaarProof.pdf"
  if (!relativePath || !relativePath.startsWith('uploads/')) {
    return res.status(400).send('Invalid path');
  }


  const ownedPaths = Object.values(student.documents?.toObject?.() || student.documents || {})
    .concat(
      student.education?.tenth?.marksheet,
      student.education?.twelfth?.marksheet,
      student.education?.diploma?.marksheet
    )
    .filter(Boolean);

  if (!ownedPaths.includes(relativePath)) {
    return res.status(403).send('Forbidden');
  }

  const absolutePath = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(absolutePath);
});



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