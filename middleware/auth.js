// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    // Set cache control to prevent back button access after logout
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return next();
  }
  req.flash('error', 'Silakan login terlebih dahulu.');
  res.redirect('/login');
}

// Redirect if already logged in
function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { isAuthenticated, isGuest };
