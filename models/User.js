const db = require('../config/database');
const bcrypt = require('bcryptjs');
const IndividualData = require('./IndividualData');

class User {
  static async create(userData) {
    const { employee_id, email, password, role_id, individual_data_id } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await db.execute(
      `INSERT INTO users (employee_id, individual_data_id, email, password_hash, role_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [employee_id, individual_data_id, email, hashedPassword, role_id]
    );
    
    return result.insertId;
  }

  static async findByEmployeeId(employee_id) {
    const [rows] = await db.execute(
      `SELECT u.*, r.name, r.permissions
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.employee_id = ? AND u.is_active = true`,
      [employee_id]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT u.*, r.name as role_name, r.permissions,
              i.employee_type, i.status as employee_status
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       JOIN individual_data i ON u.individual_data_id = i.id
       WHERE u.email = ? AND u.is_active = true`,
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT u.*, r.name as role_name, r.permissions,
              i.employee_id, i.employee_type, i.status as employee_status,
              i.department_id, d.name as department_name
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       JOIN individual_data i ON u.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE u.id = ? AND u.is_active = true`,
      [id]
    );
    return rows[0];
  }

  static async findByIndividualDataId(individual_data_id) {
    const [rows] = await db.execute(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.individual_data_id = ? AND u.is_active = true`,
      [individual_data_id]
    );
    return rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const [result] = await db.execute(
      `UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, 
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  }

  static async resetPasswordToDefault(userId) {
    // Get user with individual data
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const individualData = await IndividualData.findById(user.individual_data_id);
    if (!individualData) {
      throw new Error('Individual data not found');
    }

    // Create default password: employee_id@joining_date
    const joiningDate = new Date(individualData.joining_date).toISOString().split('T')[0];
    const defaultPassword = `${individualData.employee_id}@${joiningDate}`;
    
    return await this.updatePassword(userId, defaultPassword);
  }

  static async updateLastLogin(userId) {
    await db.execute(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  static async deactivateUser(userId) {
    const [result] = await db.execute(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async activateUser(userId) {
    const [result] = await db.execute(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async updateRole(userId, roleId) {
    const [result] = await db.execute(
      'UPDATE users SET role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [roleId, userId]
    );
    return result.affectedRows > 0;
  }

  static async getUsersWithDetails() {
    const [rows] = await db.execute(`
      SELECT u.id, u.employee_id, u.email, u.is_active, u.created_at,
             r.name as role_name,
             i.employee_type, i.time_type, i.status as employee_status,
             i.joining_date, i.hire_date,
             d.name as department_name,
             jd.job as job_title, jd.business_title,
             pd.gender, pd.nationality
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN individual_data i ON u.individual_data_id = i.id
      LEFT JOIN departments d ON i.department_id = d.id
      LEFT JOIN job_details jd ON i.id = jd.individual_data_id
      LEFT JOIN personal_details pd ON i.id = pd.individual_data_id
      ORDER BY u.employee_id
    `);
    return rows;
  }

  static async getUsersByRole(roleId) {
    const [rows] = await db.execute(`
      SELECT u.*, i.employee_id, i.employee_type, i.status as employee_status,
             d.name as department_name
      FROM users u
      JOIN individual_data i ON u.individual_data_id = i.id
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE u.role_id = ? AND u.is_active = true
      ORDER BY u.employee_id
    `, [roleId]);
    return rows;
  }

  static async getUsersByDepartment(departmentId) {
    const [rows] = await db.execute(`
      SELECT u.*, i.employee_id, i.employee_type, i.status as employee_status,
             r.name as role_name
      FROM users u
      JOIN individual_data i ON u.individual_data_id = i.id
      JOIN roles r ON u.role_id = r.id
      WHERE i.department_id = ? AND u.is_active = true
      ORDER BY u.employee_id
    `, [departmentId]);
    return rows;
  }


static async getRoleId(name) {
  const [rows] = await db.execute(`SELECT id FROM roles WHERE name = ?`, [name]);
  return rows[0]?.id; // Return just the ID or undefined
}

static async getDepartmentId(name) {
  const [rows] = await db.execute(`SELECT id FROM departments WHERE name = ?`, [name]);
  return rows[0]?.id; // Return just the ID or undefined
}

  // Utility method to validate employee_id availability for user creation
  static async validateEmployeeIdForUser(employee_id) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE employee_id = ?',
      [employee_id]
    );
    return rows[0].count === 0; // Returns true if employee_id is available
  }
}

module.exports = User;