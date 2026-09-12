/**
 * Migration script — update schema attendances & employees
 * Run: node migrate.js
 */
const db = require('./config/database');

console.log('🔄 Running migration...\n');

// ── Step 1: Recreate attendances table dengan CHECK constraint baru ──────────
console.log('📋 Migrating attendances table...');

db.exec(`
  -- Backup data lama
  CREATE TABLE IF NOT EXISTS attendances_backup AS SELECT * FROM attendances;

  -- Drop tabel lama
  DROP TABLE attendances;

  -- Buat tabel baru dengan schema yang diperbarui
  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Hadir', 'Tidak Hadir', 'Setengah Hari')),
    arrival_time TEXT DEFAULT NULL,
    is_overtime INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
  );

  -- Restore data, convert Izin/Alpa -> Tidak Hadir
  INSERT INTO attendances (id, employee_id, date, status, arrival_time, is_overtime, description, created_at, updated_at)
  SELECT 
    id,
    employee_id,
    date,
    CASE 
      WHEN status IN ('Izin', 'Alpa') THEN 'Tidak Hadir'
      ELSE status
    END as status,
    NULL as arrival_time,
    0 as is_overtime,
    COALESCE(description, '') as description,
    created_at,
    updated_at
  FROM attendances_backup;

  -- Drop backup
  DROP TABLE attendances_backup;
`);
console.log('✅ attendances table migrated!\n');

// ── Step 2: Update employees table — jadikan employee_code auto-generate ─────
console.log('👤 Checking employees table...');
const empCols = db.pragma('table_info(employees)').map(c => c.name);
console.log('   Columns:', empCols.join(', '));
console.log('✅ employees table OK\n');

console.log('🎉 Migration complete!');
console.log('   - Status baru: Hadir, Tidak Hadir, Setengah Hari');
console.log('   - Kolom baru: arrival_time, is_overtime\n');
