const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isGuest } = require('../middleware/auth');

// GET /login - Show login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', {
    layout: false,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /login - Process login
router.post('/login', isGuest, async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    req.flash('error', 'Username dan password wajib diisi.');
    return res.redirect('/login');
  }

  // Find user
  const user = await User.findByUsername(username);
  if (!user) {
    req.flash('error', 'Username atau password salah.');
    return res.redirect('/login');
  }

  // Verify password
  if (!User.verifyPassword(password, user.password)) {
    req.flash('error', 'Username atau password salah.');
    return res.redirect('/login');
  }

  // Create session
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

// POST /logout - Process logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/login');
  });
});

module.exports = router;
