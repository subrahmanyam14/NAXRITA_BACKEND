const XLSX = require('xlsx');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const IndividualData = require('../models/IndividualData');
const User = require('../models/User');

const processBulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const employees = XLSX.utils.sheet_to_json(worksheet);

    // Validate and process each employee
    const results = [];
    const errors = [];

    for (const [index, emp] of employees.entries()) {
      try {
        // Validate required fields
        if (!emp.employee_id || !emp.email || !emp.employee_type || !emp.time_type ||
          !emp.joining_date || !emp.hire_date || !emp.department_name || !emp.role_name) {
          throw new Error('Missing required fields');
        }

        let managerId;
        // Get manager ID
        if (emp.manager_id) {
          managerId = await IndividualData.findByEmployeeId(emp.manager_id);
        }

        // Get department ID
        const departmentId = await User.getDepartmentId(emp.department_name);
        if (!departmentId) {
          throw new Error(`Department '${emp.department_name}' not found`);
        }

        // Get role ID
        const roleId = await User.getRoleId(emp.role_name);
        if (!roleId) {
          throw new Error(`Role '${emp.role_name}' not found`);
        }

        // Process dates properly
        const joiningDate = new Date(emp.joining_date);
        const hireDate = new Date(emp.hire_date);

        // Validate dates
        if (isNaN(joiningDate.getTime()) || isNaN(hireDate.getTime())) {
          throw new Error('Invalid date format');
        }

        // Prepare individual data
        const individualData = {
          employee_id: emp.employee_id,
          employee_name: emp.employee_name || '',
          employee_type: emp.employee_type,
          email: emp.email,
          time_type: emp.time_type,
          default_weekly_hours: parseFloat(emp.default_weekly_hours) || 40.00,
          scheduled_weekly_hours: emp.scheduled_weekly_hours ? parseFloat(emp.scheduled_weekly_hours) : null,
          joining_date: joiningDate,
          hire_date: hireDate,
          job_profile_progression_model_designation: emp.job_profile || null,
          department_id: departmentId,
          manager_id: managerId?.id || null,
          status: emp.status || 'Active'
        };

        // Create individual record
        const individualId = await IndividualData.create(individualData);

        // Create password using the original joining_date value from Excel
        // Format the date as YYYY-MM-DD for consistency
        const joiningDateStr = joiningDate.toISOString().split('T')[0];
        const password = `${emp.employee_id}@${joiningDateStr}`;

        // Debug log to check password
        console.log(`Creating password for ${emp.employee_id}: ${password}`);

        // Validate password before hashing
        if (!password || password.includes('undefined') || password.includes('null')) {
          throw new Error(`Invalid password generated: ${password}`);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user account - fix the User.create call
        const userId = await User.create({
          employee_id: emp.employee_id,
          email: emp.email,
          password: hashedPassword, // Use 'password' not 'password_hash'
          role_id: roleId,
          individual_data_id: individualId
        });

        results.push({
          row: index + 2, // Excel rows start at 1, header is row 1
          employee_id: emp.employee_id,
          status: 'Success',
          userId,
          generatedPassword: password // Include generated password in response for reference
        });

      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        errors.push({
          row: index + 2,
          employee_id: emp.employee_id || 'Unknown',
          status: 'Failed',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk upload processed',
      stats: {
        total: employees.length,
        success: results.length,
        failed: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

module.exports = {
  processBulkUpload
};