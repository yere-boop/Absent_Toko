const db = require('./config/database');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');

console.log('🌱 Mulai seeding database...\n');

// Seed Admin User
console.log('👤 Membuat akun admin...');
const existingAdmin = User.findByUsername('admin');
if (!existingAdmin) {
  User.create({
    username: 'admin',
    email: 'admin@kantor.com',
    password: 'admin123'
  });
  console.log('   ✅ Admin berhasil dibuat (username: admin, password: admin123)');
} else {
  console.log('   ⏭️  Admin sudah ada, dilewati.');
}

// Seed Sample Employees
console.log('\n👥 Membuat data karyawan contoh...');
const sampleEmployees = [
  { employee_code: 'KRY-001', name: 'Andi Pratama', position: 'Staff IT', department: 'IT', phone: '081234567890', address: 'Jl. Merdeka No. 10, Jakarta', status: 'Aktif' },
  { employee_code: 'KRY-002', name: 'Budi Santoso', position: 'Manager', department: 'Keuangan', phone: '081234567891', address: 'Jl. Sudirman No. 20, Jakarta', status: 'Aktif' },
  { employee_code: 'KRY-003', name: 'Citra Dewi', position: 'Staff', department: 'HRD', phone: '081234567892', address: 'Jl. Gatot Subroto No. 30, Jakarta', status: 'Aktif' },
  { employee_code: 'KRY-004', name: 'Doni Setiawan', position: 'Supervisor', department: 'Produksi', phone: '081234567893', address: 'Jl. Ahmad Yani No. 40, Bandung', status: 'Aktif' },
  { employee_code: 'KRY-005', name: 'Eka Putri', position: 'Staff Admin', department: 'Administrasi', phone: '081234567894', address: 'Jl. Diponegoro No. 50, Surabaya', status: 'Aktif' },
  { employee_code: 'KRY-006', name: 'Fajar Hidayat', position: 'Staff IT', department: 'IT', phone: '081234567895', address: 'Jl. Pahlawan No. 60, Yogyakarta', status: 'Aktif' },
  { employee_code: 'KRY-007', name: 'Gita Rahayu', position: 'Staff', department: 'Keuangan', phone: '081234567896', address: 'Jl. Veteran No. 70, Semarang', status: 'Aktif' },
  { employee_code: 'KRY-008', name: 'Hendra Wijaya', position: 'Manager', department: 'Produksi', phone: '081234567897', address: 'Jl. Imam Bonjol No. 80, Medan', status: 'Tidak Aktif' },
  { employee_code: 'KRY-009', name: 'Indah Permata', position: 'Staff', department: 'HRD', phone: '081234567898', address: 'Jl. Kartini No. 90, Makassar', status: 'Aktif' },
  { employee_code: 'KRY-010', name: 'Joko Susilo', position: 'Staff', department: 'Administrasi', phone: '081234567899', address: 'Jl. Teuku Umar No. 100, Denpasar', status: 'Aktif' },
];

let employeeIds = [];
sampleEmployees.forEach(emp => {
  const existing = Employee.findByCode(emp.employee_code);
  if (!existing) {
    const result = Employee.create(emp);
    employeeIds.push(result.lastInsertRowid);
    console.log(`   ✅ ${emp.name} (${emp.employee_code})`);
  } else {
    employeeIds.push(existing.id);
    console.log(`   ⏭️  ${emp.name} sudah ada, dilewati.`);
  }
});

// Seed Sample Attendances
console.log('\n📋 Membuat data absensi contoh...');

// Generate attendances for the past 5 days
const today = new Date();
const statuses = ['Hadir', 'Hadir', 'Hadir', 'Hadir', 'Izin', 'Alpa']; // Weighted towards Hadir

for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
  const date = new Date(today);
  date.setDate(date.getDate() - dayOffset);
  
  // Skip weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) continue;

  const dateStr = date.toISOString().split('T')[0];

  employeeIds.forEach((empId, index) => {
    // Skip inactive employee (Hendra)
    if (index === 7) return;

    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    let description = '';
    if (randomStatus === 'Izin') {
      const reasons = ['Sakit', 'Urusan keluarga', 'Keperluan pribadi', 'Cuti tahunan', 'Pemeriksaan kesehatan'];
      description = reasons[Math.floor(Math.random() * reasons.length)];
    }

    try {
      if (!Attendance.existsForDate(empId, dateStr)) {
        Attendance.create({
          employee_id: empId,
          date: dateStr,
          status: randomStatus,
          description
        });
      }
    } catch (err) {
      // Skip duplicates silently
    }
  });
  console.log(`   ✅ Absensi tanggal ${dateStr}`);
}

console.log('\n🎉 Seeding selesai!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Login credentials:');
console.log('  Username: admin');
console.log('  Password: admin123');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
