// models/JobDetails.js
const db = require('../config/database');

class JobDetails {
  static async create(jobDetailsData) {
    const {
      individual_data_id,
      supervisory_organization,
      job,
      business_title,
      job_profile,
      job_family,
      management_level,
      time_type,
      location,
      phone,
      email,
      work_address,
      skills = null
    } = jobDetailsData;
    
    const [result] = await db.execute(
      `INSERT INTO job_details (
        individual_data_id, supervisory_organization, job, business_title, 
        job_profile, job_family, management_level, time_type, location, 
        phone, email, work_address, skills
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        individual_data_id, supervisory_organization, job, business_title,
        job_profile, job_family, management_level, time_type, location,
        phone, email, work_address, JSON.stringify(skills)
      ]
    );
    
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.id = ?`,
      [id]
    );
    
    if (rows[0] && rows[0].skills) {
      try {
        rows[0].skills = JSON.parse(rows[0].skills);
      } catch (e) {
        rows[0].skills = null;
      }
    }
    
    return rows[0];
  }

  static async findByIndividualDataId(individual_data_id) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.individual_data_id = ?`,
      [individual_data_id]
    );
    
    if (rows[0] && rows[0].skills) {
      try {
        rows[0].skills = JSON.parse(rows[0].skills);
      } catch (e) {
        rows[0].skills = null;
      }
    }
    
    return rows[0];
  }

  static async findByEmployeeId(employee_id) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       INNER JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE i.employee_id = ?`,
      [employee_id]
    );
    
    if (rows[0] && rows[0].skills) {
      try {
        rows[0].skills = JSON.parse(rows[0].skills);
      } catch (e) {
        rows[0].skills = null;
      }
    }
    
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       ORDER BY i.employee_id`
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async findByJobProfile(job_profile) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.job_profile = ?
       ORDER BY i.employee_id`,
      [job_profile]
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async findByManagementLevel(management_level) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.management_level = ?
       ORDER BY i.employee_id`,
      [management_level]
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async findByJobFamily(job_family) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.job_family = ?
       ORDER BY i.employee_id`,
      [job_family]
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async findByLocation(location) {
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE jd.location LIKE ?
       ORDER BY i.employee_id`,
      [`%${location}%`]
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async searchBySkills(skillsArray) {
    const skillConditions = skillsArray.map(() => 'JSON_CONTAINS(jd.skills, JSON_QUOTE(?))').join(' OR ');
    
    const [rows] = await db.execute(
      `SELECT jd.*, i.employee_id, i.employee_name, i.status as employee_status,
              d.name as department_name
       FROM job_details jd 
       LEFT JOIN individual_data i ON jd.individual_data_id = i.id
       LEFT JOIN departments d ON i.department_id = d.id
       WHERE ${skillConditions}
       ORDER BY i.employee_id`,
      skillsArray
    );
    
    return rows.map(row => {
      if (row.skills) {
        try {
          row.skills = JSON.parse(row.skills);
        } catch (e) {
          row.skills = null;
        }
      }
      return row;
    });
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'supervisory_organization', 'job', 'business_title', 'job_profile',
      'job_family', 'management_level', 'time_type', 'location',
      'phone', 'email', 'work_address', 'skills'
    ];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'skills') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    const [result] = await db.execute(
      `UPDATE job_details SET ${fields.join(', ')}, 
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async updateByIndividualDataId(individual_data_id, updateData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'supervisory_organization', 'job', 'business_title', 'job_profile',
      'job_family', 'management_level', 'time_type', 'location',
      'phone', 'email', 'work_address', 'skills'
    ];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'skills') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(individual_data_id);
    
    const [result] = await db.execute(
      `UPDATE job_details SET ${fields.join(', ')}, 
       updated_at = CURRENT_TIMESTAMP WHERE individual_data_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM job_details WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async deleteByIndividualDataId(individual_data_id) {
    const [result] = await db.execute(
      'DELETE FROM job_details WHERE individual_data_id = ?',
      [individual_data_id]
    );
    return result.affectedRows > 0;
  }

  static async getJobDetailsStats() {
    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) as total_job_details,
        COUNT(DISTINCT job_profile) as unique_job_profiles,
        COUNT(DISTINCT job_family) as unique_job_families,
        COUNT(DISTINCT management_level) as unique_management_levels,
        COUNT(DISTINCT location) as unique_locations
      FROM job_details jd
      LEFT JOIN individual_data i ON jd.individual_data_id = i.id
      WHERE i.status = 'Active'
    `);
    
    return rows[0];
  }

  static async getManagementLevelDistribution() {
    const [rows] = await db.execute(`
      SELECT 
        jd.management_level,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM job_details)), 2) as percentage
      FROM job_details jd
      LEFT JOIN individual_data i ON jd.individual_data_id = i.id
      WHERE i.status = 'Active'
      GROUP BY jd.management_level
      ORDER BY count DESC
    `);
    
    return rows;
  }

  static async getJobFamilyDistribution() {
    const [rows] = await db.execute(`
      SELECT 
        jd.job_family,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM job_details)), 2) as percentage
      FROM job_details jd
      LEFT JOIN individual_data i ON jd.individual_data_id = i.id
      WHERE i.status = 'Active'
      GROUP BY jd.job_family
      ORDER BY count DESC
    `);
    
    return rows;
  }

  static async getLocationDistribution() {
    const [rows] = await db.execute(`
      SELECT 
        jd.location,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM job_details)), 2) as percentage
      FROM job_details jd
      LEFT JOIN individual_data i ON jd.individual_data_id = i.id
      WHERE i.status = 'Active'
      GROUP BY jd.location
      ORDER BY count DESC
    `);
    
    return rows;
  }

  static async validateUniqueIndividualDataId(individual_data_id, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM job_details WHERE individual_data_id = ?';
    const params = [individual_data_id];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0].count === 0; // Returns true if individual_data_id is available
  }
}

module.exports = JobDetails;