const db = require('../config/database');

const Employee = {
  // Get all employees with optional search and filter
  async findAll({ search = '', department = '', status = '' } = {}) {
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR employee_code ILIKE $${paramCount + 1} OR position ILIKE $${paramCount + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 3;
    }

    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY name ASC';
    const res = await db.query(query, params);
    return res.rows;
  },

  // Find by ID
  async findById(id) {
    const res = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    return res.rows[0];
  },

  // Find by employee code
  async findByCode(code) {
    const res = await db.query('SELECT * FROM employees WHERE employee_code = $1', [code]);
    return res.rows[0];
  },

  // Auto-generate next employee code
  async generateCode() {
    const res = await db.query(
      "SELECT employee_code FROM employees WHERE employee_code LIKE 'KRY-%' ORDER BY id DESC LIMIT 1"
    );
    const last = res.rows[0];
    if (!last) return 'KRY-001';
    const num = parseInt(last.employee_code.replace('KRY-', ''), 10) || 0;
    return 'KRY-' + String(num + 1).padStart(3, '0');
  },

  // Create new employee
  async create({ name, position, employee_code, department, phone, address, status }) {
    const code = employee_code && employee_code.trim()
      ? employee_code.trim()
      : await Employee.generateCode();

    const res = await db.query(`
      INSERT INTO employees (employee_code, name, position, department, phone, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [
      code,
      name,
      position || '',
      department || '',
      phone || '',
      address || '',
      status || 'Aktif'
    ]);
    return { lastInsertRowid: res.rows[0].id };
  },

  // Update employee
  async update(id, { name, position, employee_code, department, phone, address, status }) {
    await db.query(`
      UPDATE employees 
      SET name = $1, position = $2, employee_code = $3, department = $4, phone = $5, address = $6, status = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      name,
      position || '',
      employee_code || '',
      department || '',
      phone || '',
      address || '',
      status || 'Aktif',
      id
    ]);
  },

  // Delete employee
  async delete(id) {
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
  },

  // Count total employees
  async count() {
    const res = await db.query('SELECT COUNT(*) as total FROM employees WHERE status = $1', ['Aktif']);
    return parseInt(res.rows[0].total, 10);
  },

  // Get all unique departments
  async getDepartments() {
    const res = await db.query("SELECT DISTINCT department FROM employees WHERE department != '' ORDER BY department");
    return res.rows.map(r => r.department);
  },

  // Get all active employees (for dropdown)
  async getActiveEmployees() {
    const res = await db.query('SELECT id, employee_code, name, department, position FROM employees WHERE status = $1 ORDER BY name', ['Aktif']);
    return res.rows;
  }
};

module.exports = Employee;
