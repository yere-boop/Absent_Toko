const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// GET /recap - Attendance recap
router.get('/', (req, res) => {
  const { month, year, department, employee_id } = req.query;

  // Default to current month/year
  const now = new Date();
  const selectedMonth = month || (now.getMonth() + 1).toString();
  const selectedYear = year || now.getFullYear().toString();

  const recap = Attendance.getRecap({
    month: selectedMonth,
    year: selectedYear,
    department: department || '',
    employeeId: employee_id || ''
  });

  const departments = Employee.getDepartments();
  const employees = Employee.getActiveEmployees();

  // Calculate grand totals
  const totals = recap.reduce((acc, r) => {
    acc.hadir += r.hadir;
    acc.izin += r.izin;
    acc.alpa += r.alpa;
    acc.total += r.total;
    return acc;
  }, { hadir: 0, izin: 0, alpa: 0, total: 0 });

  // Generate year options (current year ± 2)
  const currentYear = now.getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y);
  }

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  res.render('recap/index', {
    title: 'Rekap Absensi',
    active: 'recap',
    recap,
    totals,
    departments,
    employees,
    months,
    years,
    filters: {
      month: selectedMonth,
      year: selectedYear,
      department: department || '',
      employee_id: employee_id || ''
    }
  });
});

module.exports = router;
