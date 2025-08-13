const db = require('../config/database');

class IndividualData {
  static async create(individualData) {
    const {
      employee_id,
      employee_type,
      employee_name,
      email,
      time_type,
      default_weekly_hours = 40.00,
      scheduled_weekly_hours,
      joining_date,
      hire_date,
      job_profile_progression_model_designation,
      department_id,
      manager_id,
      status = 'Active'
    } = individualData;

    const [result] = await db.execute(
      `INSERT INTO individual_data (
        employee_id, employee_name, employee_type, email, time_type, default_weekly_hours, 
        scheduled_weekly_hours, joining_date, hire_date, 
        job_profile_progression_model_designation, department_id, 
        manager_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id, employee_name, employee_type, email, time_type, default_weekly_hours,
        scheduled_weekly_hours, joining_date, hire_date,
        job_profile_progression_model_designation, department_id,
        manager_id, status
      ]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT i.*, d.name as department_name, 
              m.employee_id as manager_employee_id
       FROM individual_data i 
       LEFT JOIN departments d ON i.department_id = d.id 
       LEFT JOIN individual_data m ON i.manager_id = m.id
       WHERE i.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByEmployeeId(employee_id) {
    const [rows] = await db.execute(
      `SELECT i.*, d.name as department_name, 
              m.employee_id as manager_employee_id
       FROM individual_data i 
       LEFT JOIN departments d ON i.department_id = d.id 
       LEFT JOIN individual_data m ON i.manager_id = m.id
       WHERE i.employee_id = ?`,
      [employee_id]
    );
    return rows[0];
  }

  static async findAll({ page = 1, limit = 10, status = null } = {}) {
    // Ensure numeric values and set defaults
    const pageNum = Number.isInteger(page) ? page : 1;
    const limitNum = Number.isInteger(limit) ? Math.min(limit, 100) : 10;
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = `
    SELECT i.*, d.name as department_name, 
           m.employee_id as manager_employee_id
    FROM individual_data i 
    LEFT JOIN departments d ON i.department_id = d.id 
    LEFT JOIN individual_data m ON i.manager_id = m.id
  `;

    // Add WHERE clause if status filter is provided
    const params = [];
    if (status) {
      query += ' WHERE i.status = ?';
      params.push(status);
    }

    // Add ORDER BY and LIMIT/OFFSET for pagination
    query += ' ORDER BY i.employee_id LIMIT ? OFFSET ?';

    // MySQL requires numbers for LIMIT/OFFSET - convert explicitly
    params.push(limitNum.toString(), offset.toString());

    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  static async findByDepartment(department_id) {
    const [rows] = await db.execute(
      `SELECT i.*, d.name as department_name, 
              m.employee_id as manager_employee_id
       FROM individual_data i 
       LEFT JOIN departments d ON i.department_id = d.id 
       LEFT JOIN individual_data m ON i.manager_id = m.id
       WHERE i.department_id = ?
       ORDER BY i.employee_id`,
      [department_id]
    );
    return rows;
  }

  static async findByManager(manager_id) {
    const [rows] = await db.execute(
      `SELECT i.*, d.name as department_name
       FROM individual_data i 
       LEFT JOIN departments d ON i.department_id = d.id 
       WHERE i.manager_id = ?
       ORDER BY i.employee_id`,
      [manager_id]
    );
    return rows;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'employee_type', 'employee_name', 'time_type', 'default_weekly_hours',
      'scheduled_weekly_hours', 'joining_date', 'hire_date',
      'job_profile_progression_model_designation', 'department_id',
      'manager_id', 'status'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    const [result] = await db.execute(
      `UPDATE individual_data SET ${fields.join(', ')}, 
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE individual_data SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    // Soft delete by updating status
    return await this.updateStatus(id, 'Terminated');
  }

  static async getHierarchy(employee_id) {
    // Get employee and their reporting structure
    const [rows] = await db.execute(`
      WITH RECURSIVE employee_hierarchy AS (
        -- Base case: start with the given employee
        SELECT id, employee_id, manager_id, 
               job_profile_progression_model_designation as designation,
               0 as level, CAST(employee_id AS CHAR(1000)) as path
        FROM individual_data 
        WHERE employee_id = ?
        
        UNION ALL
        
        -- Recursive case: find all subordinates
        SELECT i.id, i.employee_id, i.manager_id, 
               i.job_profile_progression_model_designation as designation,
               eh.level + 1, CONCAT(eh.path, ' -> ', i.employee_id)
        FROM individual_data i
        INNER JOIN employee_hierarchy eh ON i.manager_id = eh.id
        WHERE eh.level < 10 -- Prevent infinite recursion
      )
      SELECT * FROM employee_hierarchy ORDER BY level, employee_id
    `, [employee_id]);

    return rows;
  }

  static async validateEmployeeId(employee_id) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM individual_data WHERE employee_id = ?',
      [employee_id]
    );
    return rows[0].count === 0; // Returns true if employee_id is available
  }
}

module.exports = IndividualData;