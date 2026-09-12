const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const PDFDocument = require('pdfkit');

// Helper: get Monday of the week containing given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper: get Sunday of the week
function getWeekEnd(dateFrom) {
  const d = new Date(dateFrom);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

// Helper: format tanggal Indonesia
function formatDateID(dateStr) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(dateStr) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── GET /recap — Monthly recap ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { month, year, department, employee_id } = req.query;

  const now = new Date();
  const selectedMonth = month || (now.getMonth() + 1).toString();
  const selectedYear = year || now.getFullYear().toString();

  const recap = await Attendance.getRecap({
    month: selectedMonth,
    year: selectedYear,
    department: department || '',
    employeeId: employee_id || ''
  });

  const departments = await Employee.getDepartments();
  const employees = await Employee.getActiveEmployees();

  const totals = recap.reduce((acc, r) => {
    acc.hadir += r.hadir;
    acc.tidak_hadir += r.tidak_hadir;
    acc.setengah_hari += r.setengah_hari;
    acc.lembur += r.lembur;
    acc.total += r.total;
    return acc;
  }, { hadir: 0, tidak_hadir: 0, setengah_hari: 0, lembur: 0, total: 0 });

  const currentYear = now.getFullYear();
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);

  const months = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
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

// ─── GET /recap/weekly — Weekly recap page ───────────────────────────────────
router.get('/weekly', async (req, res) => {
  const now = new Date();
  const { weekStart, department } = req.query;

  // Default: current week Monday
  const defaultStart = getWeekStart(now.toISOString().split('T')[0]);
  const selectedStart = weekStart || defaultStart;
  const selectedEnd = getWeekEnd(selectedStart);

  const recap = await Attendance.getWeeklyRecap({
    dateFrom: selectedStart,
    dateTo: selectedEnd,
    department: department || ''
  });

  // Get day-by-day detail
  const detail = await Attendance.getWeeklyDetail({ dateFrom: selectedStart, dateTo: selectedEnd });

  // Build date range array (7 days)
  const dateRange = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(selectedStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    dateRange.push(d.toISOString().split('T')[0]);
  }

  // Build lookup: employeeId_date => attendance
  const detailMap = {};
  detail.forEach(a => {
    detailMap[`${a.employee_id}_${a.date}`] = a;
  });

  const departments = await Employee.getDepartments();

  const totals = recap.reduce((acc, r) => {
    acc.hadir += r.hadir;
    acc.tidak_hadir += r.tidak_hadir;
    acc.setengah_hari += r.setengah_hari;
    acc.lembur += r.lembur;
    acc.total += r.total;
    return acc;
  }, { hadir: 0, tidak_hadir: 0, setengah_hari: 0, lembur: 0, total: 0 });

  res.render('recap/weekly', {
    title: 'Rekap Mingguan',
    active: 'recap',
    recap,
    totals,
    departments,
    dateRange,
    detailMap,
    selectedStart,
    selectedEnd,
    filters: { weekStart: selectedStart, department: department || '' },
    formatDateShort
  });
});

// ─── GET /recap/weekly/pdf — Download PDF ────────────────────────────────────
router.get('/weekly/pdf', async (req, res) => {
  const now = new Date();
  const { weekStart, department } = req.query;
  const defaultStart = getWeekStart(now.toISOString().split('T')[0]);
  const selectedStart = weekStart || defaultStart;
  const selectedEnd = getWeekEnd(selectedStart);

  const recap = await Attendance.getWeeklyRecap({
    dateFrom: selectedStart,
    dateTo: selectedEnd,
    department: department || ''
  });

  const detail = await Attendance.getWeeklyDetail({ dateFrom: selectedStart, dateTo: selectedEnd });

  // Build date range
  const dateRange = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(selectedStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    dateRange.push(d.toISOString().split('T')[0]);
  }

  const detailMap = {};
  detail.forEach(a => {
    detailMap[`${a.employee_id}_${a.date}`] = a;
  });

  // ── Build PDF ──
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="rekap-mingguan-${selectedStart}-sd-${selectedEnd}.pdf"`
  );
  doc.pipe(res);

  // ── Header ──
  doc.fontSize(18).font('Helvetica-Bold').text('REKAP ABSENSI MINGGUAN', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text(
    `Periode: ${formatDateID(selectedStart)} s/d ${formatDateID(selectedEnd)}`,
    { align: 'center' }
  );
  if (department) {
    doc.fontSize(10).text(`Departemen: ${department}`, { align: 'center' });
  }
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(802 - 40, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Table Setup ──
  const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const startX = 40;
  const rowHeight = 20;
  const nameColW = 130;
  const jabColW = 90;
  const dayColW = 48;
  const summaryColW = 38;

  const cols = [
    { label: 'No', w: 24 },
    { label: 'Nama', w: nameColW },
    { label: 'Jabatan', w: jabColW },
    ...dateRange.map((d, i) => ({ label: dayLabels[i] + '\n' + formatDateShort(d), w: dayColW, date: d })),
    { label: 'H', w: summaryColW },
    { label: 'TH', w: summaryColW },
    { label: 'SH', w: summaryColW },
    { label: 'L', w: summaryColW },
  ];

  const totalWidth = cols.reduce((s, c) => s + c.w, 0);

  // ── Draw header row ──
  let x = startX;
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(8);
  cols.forEach(col => {
    doc.rect(x, y, col.w, rowHeight * 2).stroke();
    const lines = col.label.split('\n');
    if (lines.length === 2) {
      doc.text(lines[0], x + 1, y + 3, { width: col.w - 2, align: 'center' });
      doc.text(lines[1], x + 1, y + 11, { width: col.w - 2, align: 'center' });
    } else {
      doc.text(col.label, x + 1, y + 6, { width: col.w - 2, align: 'center' });
    }
    x += col.w;
  });
  y += rowHeight * 2;

  // ── Status abbrev helper ──
  function statusAbbrev(att) {
    if (!att) return '-';
    if (att.status === 'Hadir') return att.is_overtime ? 'H+L' : 'H';
    if (att.status === 'Lembur') return 'L';
    if (att.status === 'Tidak Hadir') return 'TH';
    if (att.status === 'Setengah Hari') return 'SH';
    return '-';
  }

  function statusColor(att) {
    if (!att) return null;
    if (att.status === 'Hadir') return att.is_overtime ? [34, 197, 94] : [22, 163, 74];
    if (att.status === 'Lembur') return [139, 92, 246];
    if (att.status === 'Tidak Hadir') return [239, 68, 68];
    if (att.status === 'Setengah Hari') return [234, 179, 8];
    return null;
  }

  // ── Draw data rows ──
  doc.font('Helvetica').fontSize(8);
  recap.forEach((emp, i) => {
    // Check page break
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage({ layout: 'landscape', size: 'A4', margin: 40 });
      y = 40;
    }

    x = startX;
    const rowData = [
      { val: String(i + 1) },
      { val: emp.name },
      { val: emp.position || '-' },
      ...dateRange.map(d => {
        const att = detailMap[`${emp.employee_id}_${d}`];
        return { val: statusAbbrev(att), color: statusColor(att) };
      }),
      { val: String(emp.hadir) },
      { val: String(emp.tidak_hadir) },
      { val: String(emp.setengah_hari) },
      { val: String(emp.lembur) },
    ];

    rowData.forEach((cell, ci) => {
      const col = cols[ci];
      doc.rect(x, y, col.w, rowHeight).stroke();
      if (cell.color) {
        doc.save().fillColor(cell.color).text(cell.val, x + 1, y + 5, { width: col.w - 2, align: 'center' }).restore();
        doc.fillColor('black');
      } else {
        doc.text(cell.val || '', x + 1, y + 5, { width: col.w - 2, align: 'center' });
      }
      x += col.w;
    });
    y += rowHeight;
  });

  // ── Totals row ──
  if (recap.length > 0) {
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage({ layout: 'landscape', size: 'A4', margin: 40 });
      y = 40;
    }
    x = startX;
    const totals = recap.reduce((acc, r) => {
      acc.hadir += r.hadir; acc.tidak_hadir += r.tidak_hadir;
      acc.setengah_hari += r.setengah_hari; acc.lembur += r.lembur;
      return acc;
    }, { hadir: 0, tidak_hadir: 0, setengah_hari: 0, lembur: 0 });

    const totalRow = [
      { val: '' }, { val: 'TOTAL', bold: true }, { val: '' },
      ...dateRange.map(() => ({ val: '' })),
      { val: String(totals.hadir), bold: true },
      { val: String(totals.tidak_hadir), bold: true },
      { val: String(totals.setengah_hari), bold: true },
      { val: String(totals.lembur), bold: true },
    ];

    doc.font('Helvetica-Bold').fontSize(8);
    totalRow.forEach((cell, ci) => {
      const col = cols[ci];
      doc.rect(x, y, col.w, rowHeight).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('black').text(cell.val || '', x + 1, y + 5, { width: col.w - 2, align: 'center' });
      x += col.w;
    });
    y += rowHeight;
  }

  // ── Legend ──
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(9)
    .text('Keterangan: H = Hadir  |  TH = Tidak Hadir  |  SH = Setengah Hari  |  L = Lembur  |  H+L = Hadir + Lembur  |  - = Tidak Ada Data',
      { align: 'left' });

  // ── Footer ──
  doc.fontSize(8).fillColor('#888888').text(
    `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
    40, doc.page.height - 40,
    { align: 'right', width: totalWidth }
  );

  doc.end();
});

module.exports = router;
