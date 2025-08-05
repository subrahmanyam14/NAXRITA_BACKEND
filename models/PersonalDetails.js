const db = require('../config/database');

class PersonalDetails {
  
  // CREATE - Insert new personal details
  static async create(personalData) {
    const {
      individual_data_id,
      gender,
      date_of_birth,
      country_birth,
      marital_status,
      citizenship_status,
      nationality,
      pan_id,
      adhaar,
      address,
      mobile,
      profile_pic,
      email,
      emergency_contact_name,
      emergency_contact_phone
    } = personalData;

    try {
      const [result] = await db.execute(
        `INSERT INTO personal_details (
          individual_data_id, gender, date_of_birth, country_birth, marital_status,
          citizenship_status, nationality, pan_id, adhaar, address, mobile,
          profile_pic, email, emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          individual_data_id, gender, date_of_birth, country_birth, marital_status,
          citizenship_status, nationality, pan_id, adhaar, address, mobile,
          profile_pic, email, emergency_contact_name, emergency_contact_phone
        ]
      );
      
      return {
        success: true,
        id: result.insertId,
        message: 'Personal details created successfully'
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Personal details already exist for this individual');
      }
      throw new Error(`Failed to create personal details: ${error.message}`);
    }
  }

  // READ - Get personal details by individual_data_id
  static async getByIndividualId(individualId) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM personal_details WHERE individual_data_id = ?`,
        [individualId]
      );
      
      if (rows.length === 0) {
        return {
          success: false,
          data: null,
          message: 'Personal details not found'
        };
      }
      
      return {
        success: true,
        data: rows[0],
        message: 'Personal details retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve personal details: ${error.message}`);
    }
  }

  // READ - Get personal details by ID
  static async getById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM personal_details WHERE id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return {
          success: false,
          data: null,
          message: 'Personal details not found'
        };
      }
      
      return {
        success: true,
        data: rows[0],
        message: 'Personal details retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve personal details: ${error.message}`);
    }
  }

  // READ - Get all personal details with pagination
  static async getAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM personal_details`
      );
      const total = countResult[0].total;
      
      // Get paginated results
      const [rows] = await db.execute(
        `SELECT pd.*, id.employee_name, id.employee_id 
         FROM personal_details pd
         JOIN individual_data id ON pd.individual_data_id = id.id
         ORDER BY pd.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      return {
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Personal details retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve personal details: ${error.message}`);
    }
  }

  // UPDATE - Update personal details by individual_data_id
  static async updateByIndividualId(individualId, updateData) {
    try {
      // First check if record exists
      const existing = await this.getByIndividualId(individualId);
      if (!existing.success) {
        return {
          success: false,
          message: 'Personal details not found for this individual'
        };
      }

      // Build dynamic query
      const fields = [];
      const values = [];
      
      const allowedFields = [
        'gender', 'date_of_birth', 'country_birth', 'marital_status',
        'citizenship_status', 'nationality', 'pan_id', 'adhaar', 'address',
        'mobile', 'profile_pic', 'email', 'emergency_contact_name', 'emergency_contact_phone'
      ];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          fields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (fields.length === 0) {
        return {
          success: false,
          message: 'No valid fields to update'
        };
      }

      values.push(individualId);

      const [result] = await db.execute(
        `UPDATE personal_details SET ${fields.join(', ')} WHERE individual_data_id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'No records updated'
        };
      }

      return {
        success: true,
        message: 'Personal details updated successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`Failed to update personal details: ${error.message}`);
    }
  }

  // UPDATE - Update personal details by ID
  static async updateById(id, updateData) {
    try {
      // First check if record exists
      const existing = await this.getById(id);
      if (!existing.success) {
        return {
          success: false,
          message: 'Personal details not found'
        };
      }

      // Validate updateData is an object
      if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
        return {
          success: false,
          message: 'Invalid update data format'
        };
      }

      // Build dynamic query
      const fields = [];
      const values = [];
      
      const allowedFields = [
        'gender', 'date_of_birth', 'country_birth', 'marital_status',
        'citizenship_status', 'nationality', 'pan_id', 'adhaar', 'address',
        'mobile', 'profile_pic', 'email', 'emergency_contact_name', 'emergency_contact_phone'
      ];

      allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          fields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (fields.length === 0) {
        return {
          success: false,
          message: 'No valid fields to update'
        };
      }

      values.push(id);

      const [result] = await db.execute(
        `UPDATE personal_details SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return {
        success: true,
        message: 'Personal details updated successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`Failed to update personal details: ${error.message}`);
    }
  }

  // DELETE - Delete personal details by individual_data_id
  static async deleteByIndividualId(individualId) {
    try {
      const [result] = await db.execute(
        `DELETE FROM personal_details WHERE individual_data_id = ?`,
        [individualId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Personal details not found'
        };
      }

      return {
        success: true,
        message: 'Personal details deleted successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`Failed to delete personal details: ${error.message}`);
    }
  }

  // DELETE - Delete personal details by ID
  static async deleteById(id) {
    try {
      const [result] = await db.execute(
        `DELETE FROM personal_details WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Personal details not found'
        };
      }

      return {
        success: true,
        message: 'Personal details deleted successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`Failed to delete personal details: ${error.message}`);
    }
  }

  // UTILITY - Check if personal details exist for individual
  static async existsForIndividual(individualId) {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM personal_details WHERE individual_data_id = ?`,
        [individualId]
      );
      
      return rows[0].count > 0;
    } catch (error) {
      throw new Error(`Failed to check personal details existence: ${error.message}`);
    }
  }

  // UTILITY - Search personal details by various fields
  static async search(searchTerm, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;
      
      // Get total count
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM personal_details pd
         JOIN individual_data id ON pd.individual_data_id = id.id
         WHERE pd.pan_id LIKE ? OR pd.adhaar LIKE ? OR pd.mobile LIKE ? 
         OR pd.email LIKE ? OR id.employee_name LIKE ? OR id.employee_id LIKE ?`,
        [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
      );
      const total = countResult[0].total;
      
      // Get paginated results
      const [rows] = await db.execute(
        `SELECT pd.*, id.employee_name, id.employee_id 
         FROM personal_details pd
         JOIN individual_data id ON pd.individual_data_id = id.id
         WHERE pd.pan_id LIKE ? OR pd.adhaar LIKE ? OR pd.mobile LIKE ? 
         OR pd.email LIKE ? OR id.employee_name LIKE ? OR id.employee_id LIKE ?
         ORDER BY pd.updated_at DESC
         LIMIT ? OFFSET ?`,
        [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit, offset]
      );
      
      return {
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Search completed successfully'
      };
    } catch (error) {
      throw new Error(`Failed to search personal details: ${error.message}`);
    }
  }

  // UTILITY - Get personal details with individual data joined
  static async getDetailedByIndividualId(individualId) {
    try {
      const [rows] = await db.execute(
        `SELECT pd.*, id.employee_name, id.employee_id, id.email as work_email,
                id.employee_type, id.department_id, id.status
         FROM personal_details pd
         JOIN individual_data id ON pd.individual_data_id = id.id
         WHERE pd.individual_data_id = ?`,
        [individualId]
      );
      
      if (rows.length === 0) {
        return {
          success: false,
          data: null,
          message: 'Personal details not found'
        };
      }
      
      return {
        success: true,
        data: rows[0],
        message: 'Detailed personal information retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to retrieve detailed personal details: ${error.message}`);
    }
  }
}

module.exports = PersonalDetails;