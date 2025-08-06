// models/RoleDepartmentModels.js
const db = require('../config/database');

class Role {
  static async create(roleData) {
    try {
      const { name, description, permissions } = roleData;
      const [result] = await db.execute(
        `INSERT INTO roles (name, description, permissions)
         VALUES (?, ?, ?)`,
        [name, description, JSON.stringify(permissions)]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating role:', error);
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM roles WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding role by ID:', error);
      throw new Error(`Failed to find role: ${error.message}`);
    }
  }

  static async findByName(name) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM roles WHERE name = ?`,
        [name]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding role by name:', error);
      throw new Error(`Failed to find role: ${error.message}`);
    }
  }

  static async findAll(limit = 50, offset = 0) {
    try {
      const limitNum = Number(limit) || 50;
      const offsetNum = Number(offset) || 0;
      
      // Use parameterized queries instead of db.escape
      const [rows] = await db.execute(
        `SELECT * FROM roles 
         ORDER BY created_at DESC `
      );
      return rows;
    } catch (error) {
      console.error('Error finding all roles:', error);
      throw new Error(`Failed to retrieve roles: ${error.message}`);
    }
  }

  static async update(id, roleData) {
    try {
      const { name, description, permissions } = roleData;
      const [result] = await db.execute(
        `UPDATE roles 
         SET name = ?, description = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, JSON.stringify(permissions), id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating role:', error);
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute(
        `DELETE FROM roles WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  static async getCount() {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM roles`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error getting role count:', error);
      throw new Error(`Failed to get role count: ${error.message}`);
    }
  }
}

class Department {
  static async create(departmentData) {
    try {
      const { name, description, head_employee_id } = departmentData;
      const [result] = await db.execute(
        `INSERT INTO departments (name, description, head_employee_id)
         VALUES (?, ?, ?)`,
        [name, description, head_employee_id || null]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating department:', error);
      throw new Error(`Failed to create department: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT d.*, 
                i.employee_name as head_employee_name,
                i.employee_id as head_employee_code
         FROM departments d
         LEFT JOIN individual_data i ON d.head_employee_id = i.id
         WHERE d.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding department by ID:', error);
      throw new Error(`Failed to find department: ${error.message}`);
    }
  }

  static async findByName(name) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM departments WHERE name = ?`,
        [name]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding department by name:', error);
      throw new Error(`Failed to find department: ${error.message}`);
    }
  }

  static async findAll(limit = 50, offset = 0) {
    try {
      const limitNum = Number(limit) || 50;
      const offsetNum = Number(offset) || 0;
      
      const [rows] = await db.execute(
        `SELECT d.*, 
                i.employee_name as head_employee_name,
                i.employee_id as head_employee_code
         FROM departments d
         LEFT JOIN individual_data i ON d.head_employee_id = i.id
         ORDER BY d.created_at DESC `
      );
      return rows;
    } catch (error) {
      console.error('Error finding all departments:', error);
      throw new Error(`Failed to retrieve departments: ${error.message}`);
    }
  }

  static async update(id, departmentData) {
    try {
      const { name, description, head_employee_id } = departmentData;
      const [result] = await db.execute(
        `UPDATE departments 
         SET name = ?, description = ?, head_employee_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, head_employee_id || null, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating department:', error);
      throw new Error(`Failed to update department: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      // Check if department has employees before deleting
      const [employeeCheck] = await db.execute(
        `SELECT COUNT(*) as count FROM individual_data WHERE department_id = ?`,
        [id]
      );
      
      if (employeeCheck[0].count > 0) {
        throw new Error('Cannot delete department that has employees assigned to it');
      }

      const [result] = await db.execute(
        `DELETE FROM departments WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw new Error(`Failed to delete department: ${error.message}`);
    }
  }

  static async getCount() {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM departments`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error getting department count:', error);
      throw new Error(`Failed to get department count: ${error.message}`);
    }
  }

  static async getDepartmentEmployees(departmentId, limit, offset) {
  try {
    // Validate and convert parameters
    const deptId = parseInt(departmentId);
    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;
    
    // Check if departmentId is a valid number
    if (isNaN(deptId)) {
      throw new Error('Invalid department ID provided');
    }
    
    const [rows] = await db.execute(
      `SELECT i.id, 
              i.employee_id, 
              i.employee_name,
              i.email, 
              r.name as role_name,
              i.status,
              i.employee_type,
              i.time_type
       FROM individual_data i
       LEFT JOIN users u ON i.id = u.individual_data_id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE i.department_id = ?
       ORDER BY i.employee_name`,
      [deptId]
    );
    return rows;
  } catch (error) {
    console.error('Error getting department employees:', error);
    throw new Error(`Failed to retrieve department employees: ${error.message}`);
  }
}

  static async getDepartmentEmployeeCount(departmentId) {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM individual_data WHERE department_id = ?`,
        [departmentId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error getting department employee count:', error);
      throw new Error(`Failed to get department employee count: ${error.message}`);
    }
  }

  // Helper method to validate department head assignment
  static async validateHeadEmployee(employeeId, departmentId) {
    try {
      const [rows] = await db.execute(
        `SELECT id, department_id FROM individual_data WHERE id = ?`,
        [employeeId]
      );
      
      if (rows.length === 0) {
        return { valid: false, message: 'Employee not found' };
      }
      
      const employee = rows[0];
      if (employee.department_id !== parseInt(departmentId)) {
        return { 
          valid: false, 
          message: 'Employee must belong to the department to be assigned as head' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error validating head employee:', error);
      throw new Error(`Failed to validate head employee: ${error.message}`);
    }
  }
}

module.exports = { Role, Department };