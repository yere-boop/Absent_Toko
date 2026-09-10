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
  create({ employee_id, date, status, description }) {
    const stmt = db.prepare(`
      INSERT INTO attendances (employee_id, date, status, description)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(employee_id, date, status, description || '');
  },

  // Update attendance
  update(id, { employee_id, date, status, description }) {
    const stmt = db.prepare(`
      UPDATE attendances 
      SET employee_id = ?, date = ?, status = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(employee_id, date, status, description || '', id);
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

    const result = { Hadir: 0, Izin: 0, Alpa: 0 };
    stats.forEach(s => { result[s.status] = s.count; });
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

  // Get recap data for a period
  getRecap({ month = '', year = '', department = '', employeeId = '' } = {}) {
    let query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.employee_code,
        e.department,
        e.position,
        SUM(CASE WHEN a.status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN a.status = 'Izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN a.status = 'Alpa' THEN 1 ELSE 0 END) as alpa,
        COUNT(a.id) as total
      FROM employees e
      LEFT JOIN attendances a ON e.id = a.employee_id
    `;

    const conditions = [];
    const params = [];

    // Date filtering
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

    // Only show active employees by default
    conditions.push("e.status = 'Aktif'");

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.id ORDER BY e.name ASC';
    return db.prepare(query).all(...params);
  }
};

module.exports = Attendance;
