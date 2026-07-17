const Student = require('../models/Student');

// GET /students/dashboard
exports.dashboard = async (req, res) => {
  try {
    const student = await Student.findById(req.session.userId);

    if (!student) {
      req.session.destroy(() => res.redirect('/login'));
      return;
    }

    res.render('students/dashboard', {
      currentPage: 'dashboard',
      student,
      dashboardStats: {},
      upcomingDeadlines: [],
      notificationsData: [],
    });
  } catch (err) {
    console.error('Dashboard load failed:', err.message);
    res.status(500).render('errors/500');
  }
};

// GET /students/personal
exports.getPersonalPage = async (req, res, next) => {
  try {
    const student = await Student.findById(req.session.userId);
    
    if (!student) {
      return res.redirect('/login');
    }

    res.render("students/personal", { 
        student, 
        currentPage: "personal" 
    });
  } catch (err) {
    next(err);
  }
};

// GET /students/academic
exports.getAcademicPage = async (req, res, next) => {
  try {
    // Retrieve the student database document using the working session ID
    const student = await Student.findById(req.session.userId);
    
    if (!student) {
      return res.redirect('/login');
    }

    // Render the academic view, passing down the live database object
    res.render("students/academic", { 
        student, 
        currentPage: "academic" 
    });
  } catch (err) {
    next(err);
  }
};

// GET /students/contact
exports.getContactPage = async (req, res, next) => {
  try {
    // Retrieve the student database document using the working session ID
    const student = await Student.findById(req.session.userId);
    
    if (!student) {
      return res.redirect('/login');
    }

    // Render the contact view, passing down the live database object
    res.render("students/contact", { 
        student, 
        currentPage: "contact" 
    });
  } catch (err) {
    next(err);
  }
};

// GET /students/documents
exports.getDocumentsPage = async (req, res, next) => {
  try {
    const student = await Student.findById(req.session.userId);
    if (!student) return res.redirect('/login');

    res.render("students/documents", { 
        student, 
        currentPage: "documents" 
    });
  } catch (err) {
    next(err);
  }
};