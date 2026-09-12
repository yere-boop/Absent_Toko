const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// GET /attendances - List all attendances
router.get('/', async (req, res) => {
  const { search, status, department, dateFrom, dateTo, date } = req.query;
  const attendances = await Attendance.findAll({ search, status, department, dateFrom, dateTo, date });
  const departments = await Employee.getDepartments();

  res.render('attendances/index', {
    title: 'Data Absensi',
    active: 'attendances',
    attendances,
    departments,
    filters: {
      search: search || '',
      status: status || '',
      department: department || '',
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
      date: date || ''
    },
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// GET /attendances/create - Show create form
router.get('/create', async (req, res) => {
  const employees = await Employee.getActiveEmployees();

  res.render('attendances/create', {
    title: 'Tambah Absensi',
    active: 'attendances',
    employees,
    error: req.flash('error'),
    old: (() => { try { const d = req.flash('old')[0]; return d ? JSON.parse(d) : {}; } catch(e) { return {}; } })()
  });
});

// POST /attendances - Create new attendance
router.post('/', async (req, res) => {
  const { employee_id, date, status, arrival_time, is_overtime, description } = req.body;

  // Validation
  const errors = [];
  if (!employee_id) errors.push('Karyawan wajib dipilih.');
  if (!date) errors.push('Tanggal wajib diisi.');
  if (!status) errors.push('Status absensi wajib dipilih.');
  if ((status === 'Hadir' || status === 'Lembur' || status === 'Setengah Hari') && (!arrival_time || !arrival_time.trim())) {
    errors.push('Jam masuk wajib diisi jika status Hadir/Lembur/Setengah Hari.');
  }

  // Check duplicate attendance
  if (employee_id && date && await Attendance.existsForDate(employee_id, date)) {
    errors.push('Karyawan ini sudah memiliki data absensi pada tanggal tersebut.');
  }

  if (errors.length > 0) {
    req.flash('error', errors);
    req.flash('old', JSON.stringify(req.body));
    return res.redirect('/attendances/create');
  }

  try {
    await Attendance.create({
      employee_id: parseInt(employee_id),
      date,
      status,
      arrival_time: arrival_time ? arrival_time.trim() : null,
      is_overtime: is_overtime === 'on' || is_overtime === '1' ? 1 : 0,
      description: description ? description.trim() : ''
    });

    req.flash('success', 'Data absensi berhasil ditambahkan.');
    res.redirect('/attendances');
  } catch (err) {
    req.flash('error', 'Gagal menambahkan absensi: ' + err.message);
    req.flash('old', JSON.stringify(req.body));
    res.redirect('/attendances/create');
  }
});

// GET /attendances/:id - Show attendance detail
router.get('/:id', async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    req.flash('error', 'Data absensi tidak ditemukan.');
    return res.redirect('/attendances');
  }

  res.render('attendances/show', {
    title: 'Detail Absensi',
    active: 'attendances',
    attendance
  });
});

// GET /attendances/:id/edit - Show edit form
router.get('/:id/edit', async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    req.flash('error', 'Data absensi tidak ditemukan.');
    return res.redirect('/attendances');
  }

  const employees = await Employee.getActiveEmployees();

  res.render('attendances/edit', {
    title: 'Edit Absensi',
    active: 'attendances',
    attendance,
    employees,
    error: req.flash('error')
  });
});

// PUT /attendances/:id - Update attendance
router.put('/:id', async (req, res) => {
  const { employee_id, date, status, arrival_time, is_overtime, description } = req.body;
  const id = req.params.id;

  const attendance = await Attendance.findById(id);
  if (!attendance) {
    req.flash('error', 'Data absensi tidak ditemukan.');
    return res.redirect('/attendances');
  }

  // Validation
  const errors = [];
  if (!employee_id) errors.push('Karyawan wajib dipilih.');
  if (!date) errors.push('Tanggal wajib diisi.');
  if (!status) errors.push('Status absensi wajib dipilih.');
  if ((status === 'Hadir' || status === 'Lembur' || status === 'Setengah Hari') && (!arrival_time || !arrival_time.trim())) {
    errors.push('Jam masuk wajib diisi jika status Hadir/Lembur/Setengah Hari.');
  }

  // Check duplicate attendance (exclude current)
  if (employee_id && date && await Attendance.existsForDate(employee_id, date, id)) {
    errors.push('Karyawan ini sudah memiliki data absensi pada tanggal tersebut.');
  }

  if (errors.length > 0) {
    req.flash('error', errors);
    return res.redirect(`/attendances/${id}/edit`);
  }

  try {
    await Attendance.update(id, {
      employee_id: parseInt(employee_id),
      date,
      status,
      arrival_time: arrival_time ? arrival_time.trim() : null,
      is_overtime: is_overtime === 'on' || is_overtime === '1' ? 1 : 0,
      description: description ? description.trim() : ''
    });

    req.flash('success', 'Data absensi berhasil diperbarui.');
    res.redirect('/attendances');
  } catch (err) {
    req.flash('error', 'Gagal memperbarui absensi: ' + err.message);
    res.redirect(`/attendances/${id}/edit`);
  }
});

// DELETE /attendances/:id - Delete attendance
router.delete('/:id', async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    req.flash('error', 'Data absensi tidak ditemukan.');
    return res.redirect('/attendances');
  }

  try {
    await Attendance.delete(req.params.id);
    req.flash('success', 'Data absensi berhasil dihapus.');
  } catch (err) {
    req.flash('error', 'Gagal menghapus data absensi: ' + err.message);
  }

  res.redirect('/attendances');
});

module.exports = router;
