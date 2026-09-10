require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

// Initialize database (creates tables if not exist)
require('./config/database');

// Auto-seed admin if not exists (for first deployment)
const User = require('./models/User');
const existingAdmin = User.findByUsername('admin');
if (!existingAdmin) {
  User.create({ username: 'admin', email: 'admin@kantor.com', password: 'admin123' });
  console.log('✅ Admin user created automatically.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// Flash messages
app.use(flash());

// Global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    username: req.session.username
  } : null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Import middleware
const { isAuthenticated } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendances');
const recapRoutes = require('./routes/recap');

// Use routes
app.use('/', authRoutes);
app.use('/', isAuthenticated, dashboardRoutes);
app.use('/employees', isAuthenticated, employeeRoutes);
app.use('/attendances', isAuthenticated, attendanceRoutes);
app.use('/recap', isAuthenticated, recapRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404 handler
app.use((req, res) => {
  res.status(404).redirect('/dashboard');
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔐 Login: http://localhost:${PORT}/login\n`);
});
