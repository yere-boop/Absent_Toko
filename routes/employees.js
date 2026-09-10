const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// GET /employees - List all employees
router.get('/', (req, res) => {
  const { search, department, status } = req.query;
  const employees = Employee.findAll({ search, department, status });
  const departments = Employee.getDepartments();

  res.render('employees/index', {
    title: 'Data Karyawan',
    active: 'employees',
    employees,
    departments,
    filters: { search: search || '', department: department || '', status: status || '' },
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// GET /employees/create - Show create form
router.get('/create', (req, res) => {
  const departments = Employee.getDepartments();
  res.render('employees/create', {
    title: 'Tambah Karyawan',
    active: 'employees',
    departments,
    error: req.flash('error'),
    old: req.flash('old')[0] || {}
  });
});

// POST /employees - Create new employee
router.post('/', (req, res) => {
  const { employee_code, name, position, department, phone, address, status } = req.body;

  // Validation
  const errors = [];
  if (!employee_code || !employee_code.trim()) errors.push('Nomor karyawan wajib diisi.');
  if (!name || !name.trim()) errors.push('Nama lengkap wajib diisi.');
  if (!position || !position.trim()) errors.push('Jabatan wajib diisi.');
  if (!department || !department.trim()) errors.push('Departemen wajib diisi.');

  // Check unique employee code
  if (employee_code && Employee.findByCode(employee_code.trim())) {
    errors.push('Nomor karyawan sudah digunakan.');
  }

  if (errors.length > 0) {
    req.flash('error', errors);
    req.flash('old', JSON.stringify(req.body));
    return res.redirect('/employees/create');
  }

  try {
    Employee.create({
      employee_code: employee_code.trim(),
      name: name.trim(),
      position: position.trim(),
      department: department.trim(),
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'Aktif'
    });

    req.flash('success', 'Karyawan berhasil ditambahkan.');
    res.redirect('/employees');
  } catch (err) {
    req.flash('error', 'Gagal menambahkan karyawan: ' + err.message);
    req.flash('old', JSON.stringify(req.body));
    res.redirect('/employees/create');
  }
});

// GET /employees/:id - Show employee detail
router.get('/:id', (req, res) => {
  const employee = Employee.findById(req.params.id);
  if (!employee) {
    req.flash('error', 'Karyawan tidak ditemukan.');
    return res.redirect('/employees');
  }

  // Get attendance history for this employee
  const Attendance = require('../models/Attendance');
  const attendances = Attendance.findAll({ search: '', status: '', department: '', dateFrom: '', dateTo: '' });
  const employeeAttendances = attendances.filter(a => a.employee_id === employee.id);

  res.render('employees/show', {
    title: 'Detail Karyawan',
    active: 'employees',
    employee,
    attendances: employeeAttendances.slice(0, 20)
  });
});

// GET /employees/:id/edit - Show edit form
router.get('/:id/edit', (req, res) => {
  const employee = Employee.findById(req.params.id);
  if (!employee) {
    req.flash('error', 'Karyawan tidak ditemukan.');
    return res.redirect('/employees');
  }

  const departments = Employee.getDepartments();

  res.render('employees/edit', {
    title: 'Edit Karyawan',
    active: 'employees',
    employee,
    departments,
    error: req.flash('error')
  });
});

// PUT /employees/:id - Update employee
router.put('/:id', (req, res) => {
  const { employee_code, name, position, department, phone, address, status } = req.body;
  const id = req.params.id;

  const employee = Employee.findById(id);
  if (!employee) {
    req.flash('error', 'Karyawan tidak ditemukan.');
    return res.redirect('/employees');
  }

  // Validation
  const errors = [];
  if (!employee_code || !employee_code.trim()) errors.push('Nomor karyawan wajib diisi.');
  if (!name || !name.trim()) errors.push('Nama lengkap wajib diisi.');
  if (!position || !position.trim()) errors.push('Jabatan wajib diisi.');
  if (!department || !department.trim()) errors.push('Departemen wajib diisi.');

  // Check unique employee code (exclude current)
  const existing = Employee.findByCode(employee_code.trim());
  if (existing && existing.id !== parseInt(id)) {
    errors.push('Nomor karyawan sudah digunakan.');
  }

  if (errors.length > 0) {
    req.flash('error', errors);
    return res.redirect(`/employees/${id}/edit`);
  }

  try {
    Employee.update(id, {
      employee_code: employee_code.trim(),
      name: name.trim(),
      position: position.trim(),
      department: department.trim(),
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'Aktif'
    });

    req.flash('success', 'Data karyawan berhasil diperbarui.');
    res.redirect('/employees');
  } catch (err) {
    req.flash('error', 'Gagal memperbarui data: ' + err.message);
    res.redirect(`/employees/${id}/edit`);
  }
});

// DELETE /employees/:id - Delete employee
router.delete('/:id', (req, res) => {
  const employee = Employee.findById(req.params.id);
  if (!employee) {
    req.flash('error', 'Karyawan tidak ditemukan.');
    return res.redirect('/employees');
  }

  try {
    Employee.delete(req.params.id);
    req.flash('success', `Karyawan "${employee.name}" berhasil dihapus.`);
  } catch (err) {
    req.flash('error', 'Gagal menghapus karyawan: ' + err.message);
  }

  res.redirect('/employees');
});

module.exports = router;
