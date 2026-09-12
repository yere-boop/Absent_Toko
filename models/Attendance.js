const db = require('../config/database');

const Attendance = {
  // Get all attendances with optional filters
  findAll({ search = '', status = '', department = '', dateFrom = '', dateTo = '', date = '' } = {}) {
    let query = `
      SELECT a.*, e.name as employee_name, e.employee_code, e.department, e.position
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (e.name LIKE ? OR e.employee_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }

    if (dateFrom) {
      query += ' AND a.date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND a.date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY a.date DESC, e.name ASC';
    return db.prepare(query).all(...params);
  },

  // Find by ID with employee info
  findById(id) {
    return db.prepare(`
      SELECT a.*, e.name as employee_name, e.employee_code, e.department, e.position
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.id = ?
    `).get(id);
  },

  // Check if attendance exists for employee on date
  existsForDate(employeeId, date, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM attendances WHERE employee_id = ? AND date = ?';
    const params = [employeeId, date];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    return db.prepare(query).get(...params).count > 0;
  },

  // Create new attendance
  create({ employee_id, date, status, arrival_time, is_overtime, description }) {
    const stmt = db.prepare(`
      INSERT INTO attendances (employee_id, date, status, arrival_time, is_overtime, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      employee_id,
      date,
      status,
      arrival_time || null,
      is_overtime ? 1 : 0,
      description || ''
    );
  },

  // Update attendance
  update(id, { employee_id, date, status, arrival_time, is_overtime, description }) {
    const stmt = db.prepare(`
      UPDATE attendances 
      SET employee_id = ?, date = ?, status = ?, arrival_time = ?, is_overtime = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      employee_id,
      date,
      status,
      arrival_time || null,
      is_overtime ? 1 : 0,
      description || '',
      id
    );
  },

  // Delete attendance
  delete(id) {
    return db.prepare('DELETE FROM attendances WHERE id = ?').run(id);
  },

  // Dashboard stats: count by status for today
  getTodayStats(todayDate) {
    const stats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM attendances
      WHERE date = ?
      GROUP BY status
    `).all(todayDate);

    const result = { 'Hadir': 0, 'Tidak Hadir': 0, 'Setengah Hari': 0, 'Lembur': 0 };
    stats.forEach(s => { result[s.status] = s.count; });

    // Hitung lembur dari yang hadir + is_overtime atau status = 'Lembur'
    const lemburCount = db.prepare(`
      SELECT COUNT(*) as count FROM attendances WHERE date = ? AND (status = 'Lembur' OR (status = 'Hadir' AND is_overtime = 1))
    `).get(todayDate);
    result['Lembur'] = lemburCount.count;

    return result;
  },

  // Get recent attendances for dashboard
  getRecent(limit = 10) {
    return db.prepare(`
      SELECT a.*, e.name as employee_name, e.employee_code, e.department
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);
  },

  // Get recap data for a period (monthly)
  getRecap({ month = '', year = '', department = '', employeeId = '' } = {}) {
    let query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.employee_code,
        e.department,
        e.position,
        SUM(CASE WHEN a.status = 'Hadir' OR (a.status = 'Lembur' AND a.is_overtime = 0) THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN a.status = 'Tidak Hadir' THEN 1 ELSE 0 END) as tidak_hadir,
        SUM(CASE WHEN a.status = 'Setengah Hari' THEN 1 ELSE 0 END) as setengah_hari,
        SUM(CASE WHEN a.status = 'Lembur' OR (a.status = 'Hadir' AND a.is_overtime = 1) THEN 1 ELSE 0 END) as lembur,
        COUNT(a.id) as total
      FROM employees e
      LEFT JOIN attendances a ON e.id = a.employee_id
    `;

    const conditions = [];
    const params = [];

    if (month && year) {
      conditions.push("strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?");
      params.push(month.toString().padStart(2, '0'), year.toString());
    } else if (year) {
      conditions.push("strftime('%Y', a.date) = ?");
      params.push(year.toString());
    }

    if (department) {
      conditions.push('e.department = ?');
      params.push(department);
    }

    if (employeeId) {
      conditions.push('e.id = ?');
      params.push(employeeId);
    }

    conditions.push("e.status = 'Aktif'");

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.id ORDER BY e.name ASC';
    return db.prepare(query).all(...params);
  },

  // Get weekly recap (by date range)
  getWeeklyRecap({ dateFrom, dateTo, department = '', employeeId = '' } = {}) {
    let query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.employee_code,
        e.department,
        e.position,
        SUM(CASE WHEN a.status = 'Hadir' OR (a.status = 'Lembur' AND a.is_overtime = 0) THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN a.status = 'Tidak Hadir' THEN 1 ELSE 0 END) as tidak_hadir,
        SUM(CASE WHEN a.status = 'Setengah Hari' THEN 1 ELSE 0 END) as setengah_hari,
        SUM(CASE WHEN a.status = 'Lembur' OR (a.status = 'Hadir' AND a.is_overtime = 1) THEN 1 ELSE 0 END) as lembur,
        COUNT(a.id) as total
      FROM employees e
      LEFT JOIN attendances a ON e.id = a.employee_id
        AND a.date >= ? AND a.date <= ?
    `;

    const params = [dateFrom, dateTo];
    const conditions = ["e.status = 'Aktif'"];

    if (department) {
      conditions.push('e.department = ?');
      params.push(department);
    }

    if (employeeId) {
      conditions.push('e.id = ?');
      params.push(employeeId);
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY e.id ORDER BY e.name ASC';
    return db.prepare(query).all(...params);
  },

  // Get daily detail for weekly recap (each day per employee)
  getWeeklyDetail({ dateFrom, dateTo } = {}) {
    return db.prepare(`
      SELECT a.*, e.name as employee_name, e.position, e.department
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= ? AND a.date <= ?
      ORDER BY e.name ASC, a.date ASC
    `).all(dateFrom, dateTo);
  }
};

module.exports = Attendance;
