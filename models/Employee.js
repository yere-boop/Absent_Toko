const db = require('../config/database');

const Employee = {
  // Get all employees with optional search and filter
  findAll({ search = '', department = '', status = '' } = {}) {
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR employee_code LIKE ? OR position LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';
    return db.prepare(query).all(...params);
  },

  // Find by ID
  findById(id) {
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  },

  // Find by employee code
  findByCode(code) {
    return db.prepare('SELECT * FROM employees WHERE employee_code = ?').get(code);
  },

  // Auto-generate next employee code
  generateCode() {
    const last = db.prepare(
      "SELECT employee_code FROM employees WHERE employee_code LIKE 'KRY-%' ORDER BY id DESC LIMIT 1"
    ).get();
    if (!last) return 'KRY-001';
    const num = parseInt(last.employee_code.replace('KRY-', ''), 10) || 0;
    return 'KRY-' + String(num + 1).padStart(3, '0');
  },

  // Create new employee — hanya name & position yang wajib
  create({ name, position, employee_code, department, phone, address, status }) {
    const code = employee_code && employee_code.trim()
      ? employee_code.trim()
      : Employee.generateCode();

    const stmt = db.prepare(`
      INSERT INTO employees (employee_code, name, position, department, phone, address, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      code,
      name,
      position || '',
      department || '',
      phone || '',
      address || '',
      status || 'Aktif'
    );
  },

  // Update employee
  update(id, { name, position, employee_code, department, phone, address, status }) {
    const stmt = db.prepare(`
      UPDATE employees 
      SET name = ?, position = ?, employee_code = ?, department = ?, phone = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      name,
      position || '',
      employee_code || '',
      department || '',
      phone || '',
      address || '',
      status || 'Aktif',
      id
    );
  },

  // Delete employee
  delete(id) {
    return db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  },

  // Count total employees
  count() {
    return db.prepare('SELECT COUNT(*) as total FROM employees WHERE status = ?').get('Aktif').total;
  },

  // Get all unique departments
  getDepartments() {
    return db.prepare("SELECT DISTINCT department FROM employees WHERE department != '' ORDER BY department").all().map(r => r.department);
  },

  // Get all active employees (for dropdown)
  getActiveEmployees() {
    return db.prepare('SELECT id, employee_code, name, department, position FROM employees WHERE status = ? ORDER BY name').all('Aktif');
  }
};

module.exports = Employee;
