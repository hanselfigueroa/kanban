/**
 * Admin authentication middleware
 * Protects all /admin/* routes from unauthenticated access
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  // Store the originally requested URL to redirect after login
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuth };
