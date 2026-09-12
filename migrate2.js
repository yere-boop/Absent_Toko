const db = require('./config/database');

console.log('🔄 Running migration 2...\n');

console.log('📋 Migrating attendances table to add Lembur status...');

db.exec(`
  -- Backup data
  CREATE TABLE IF NOT EXISTS attendances_backup2 AS SELECT * FROM attendances;

  -- Drop tabel
  DROP TABLE attendances;

  -- Buat tabel baru dengan schema yang diperbarui (tambah Lembur di CHECK constraint)
  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Hadir', 'Tidak Hadir', 'Setengah Hari', 'Lembur')),
    arrival_time TEXT DEFAULT NULL,
    is_overtime INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
  );

  -- Restore data
  INSERT INTO attendances (id, employee_id, date, status, arrival_time, is_overtime, description, created_at, updated_at)
  SELECT 
    id,
    employee_id,
    date,
    status,
    arrival_time,
    is_overtime,
    description,
    created_at,
    updated_at
  FROM attendances_backup2;

  -- Drop backup
  DROP TABLE attendances_backup2;
`);
console.log('✅ attendances table migrated to support Lembur status!\n');
