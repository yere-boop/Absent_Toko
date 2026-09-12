const db = require('../config/database');

const Attendance = {
  // Get all attendances with optional filters
  async findAll({ search = '', status = '', department = '', dateFrom = '', dateTo = '', date = '' } = {}) {
    let query = `
      SELECT a.*, e.name as employee_name, e.employee_code, e.department, e.position
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (e.name ILIKE $${paramCount} OR e.employee_code ILIKE $${paramCount + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount += 2;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND e.department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (date) {
      query += ` AND a.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (dateFrom) {
      query += ` AND a.date >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      query += ` AND a.date <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }

    query += ' ORDER BY a.date DESC, e.name ASC';
    const res = await db.query(query, params);
    return res.rows;
  },

  // Find by ID with employee info
  async findById(id) {
    const res = await db.query(`
      SELECT a.*, e.name as employee_name, e.employee_code, e.department, e.position
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.id = $1
    `, [id]);
    return res.rows[0];
  },

  // Check if attendance exists for employee on date
  async existsForDate(employeeId, date, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM attendances WHERE employee_id = $1 AND date = $2';
    const params = [employeeId, date];

    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }

    const res = await db.query(query, params);
    return parseInt(res.rows[0].count, 10) > 0;
  },

  // Create new attendance
  async create({ employee_id, date, status, arrival_time, is_overtime, description }) {
    await db.query(`
      INSERT INTO attendances (employee_id, date, status, arrival_time, is_overtime, description)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      employee_id,
      date,
      status,
      arrival_time || null,
      is_overtime ? 1 : 0,
      description || ''
    ]);
  },

  // Update attendance
  async update(id, { employee_id, date, status, arrival_time, is_overtime, description }) {
    await db.query(`
      UPDATE attendances 
      SET employee_id = $1, date = $2, status = $3, arrival_time = $4, is_overtime = $5, description = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      employee_id,
      date,
      status,
      arrival_time || null,
      is_overtime ? 1 : 0,
      description || '',
      id
    ]);
  },

  // Delete attendance
  async delete(id) {
    await db.query('DELETE FROM attendances WHERE id = $1', [id]);
  },

  // Dashboard stats: count by status for today
  async getTodayStats(todayDate) {
    const statsRes = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM attendances
      WHERE date = $1
      GROUP BY status
    `, [todayDate]);

    const result = { 'Hadir': 0, 'Tidak Hadir': 0, 'Setengah Hari': 0, 'Lembur': 0 };
    statsRes.rows.forEach(s => { result[s.status] = parseInt(s.count, 10); });

    // Hitung lembur dari yang hadir + is_overtime atau status = 'Lembur'
    const lemburRes = await db.query(`
      SELECT COUNT(*) as count FROM attendances WHERE date = $1 AND (status = 'Lembur' OR (status = 'Hadir' AND is_overtime = 1))
    `, [todayDate]);
    result['Lembur'] = parseInt(lemburRes.rows[0].count, 10);

    return result;
  },

  // Get recent attendances for dashboard
  async getRecent(limit = 10) {
    const res = await db.query(`
      SELECT a.*, e.name as employee_name, e.employee_code, e.department
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  },

  // Get recap data for a period (monthly)
  async getRecap({ month = '', year = '', department = '', employeeId = '' } = {}) {
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
    let paramCount = 1;

    if (month && year) {
      conditions.push(`TO_CHAR(a.date, 'MM') = $${paramCount} AND TO_CHAR(a.date, 'YYYY') = $${paramCount + 1}`);
      params.push(month.toString().padStart(2, '0'), year.toString());
      paramCount += 2;
    } else if (year) {
      conditions.push(`TO_CHAR(a.date, 'YYYY') = $${paramCount}`);
      params.push(year.toString());
      paramCount++;
    }

    if (department) {
      conditions.push(`e.department = $${paramCount}`);
      params.push(department);
      paramCount++;
    }

    if (employeeId) {
      conditions.push(`e.id = $${paramCount}`);
      params.push(employeeId);
      paramCount++;
    }

    conditions.push("e.status = 'Aktif'");

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.id, e.name, e.employee_code, e.department, e.position ORDER BY e.name ASC';
    const res = await db.query(query, params);
    
    // PG SUM returns string, map it back to int
    return res.rows.map(row => ({
      ...row,
      hadir: parseInt(row.hadir || 0, 10),
      tidak_hadir: parseInt(row.tidak_hadir || 0, 10),
      setengah_hari: parseInt(row.setengah_hari || 0, 10),
      lembur: parseInt(row.lembur || 0, 10),
      total: parseInt(row.total || 0, 10)
    }));
  },

  // Get weekly recap (by date range)
  async getWeeklyRecap({ dateFrom, dateTo, department = '', employeeId = '' } = {}) {
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
        AND a.date >= $1 AND a.date <= $2
    `;

    const params = [dateFrom, dateTo];
    const conditions = ["e.status = 'Aktif'"];
    let paramCount = 3;

    if (department) {
      conditions.push(`e.department = $${paramCount}`);
      params.push(department);
      paramCount++;
    }

    if (employeeId) {
      conditions.push(`e.id = $${paramCount}`);
      params.push(employeeId);
      paramCount++;
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY e.id, e.name, e.employee_code, e.department, e.position ORDER BY e.name ASC';
    const res = await db.query(query, params);
    
    return res.rows.map(row => ({
      ...row,
      hadir: parseInt(row.hadir || 0, 10),
      tidak_hadir: parseInt(row.tidak_hadir || 0, 10),
      setengah_hari: parseInt(row.setengah_hari || 0, 10),
      lembur: parseInt(row.lembur || 0, 10),
      total: parseInt(row.total || 0, 10)
    }));
  },

  // Get daily detail for weekly recap (each day per employee)
  async getWeeklyDetail({ dateFrom, dateTo } = {}) {
    const res = await db.query(`
      SELECT a.*, e.name as employee_name, e.position, e.department
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= $1 AND a.date <= $2
      ORDER BY e.name ASC, a.date ASC
    `, [dateFrom, dateTo]);
    return res.rows;
  }
};

module.exports = Attendance;
