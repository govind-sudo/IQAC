const Student = require('../models/Student');

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