const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// GET /dashboard
router.get('/dashboard', (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const totalEmployees = Employee.count();
  const todayStats = Attendance.getTodayStats(todayStr);
  const recentAttendances = Attendance.getRecent(10);

  res.render('dashboard', {
    title: 'Dashboard',
    active: 'dashboard',
    totalEmployees,
    todayStats,
    recentAttendances,
    today: todayStr
  });
});

module.exports = router;
