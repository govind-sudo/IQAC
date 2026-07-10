function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).render('errors/403');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };