const XLSX = require('xlsx');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const IndividualData = require('../models/IndividualData');
const User = require('../models/User');
const JobDetails = require('../models/JobDetails');

// Job details validation schema (updated to accept numeric individual_data_id)
const jobDetailsSchema = Joi.object({
  individual_data_id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().max(20)
  ).required()
    .messages({
      'any.required': 'Individual data ID is required'
    }),

  supervisory_organization: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Supervisory organization must not exceed 255 characters'
    }),

  job: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Job must not exceed 255 characters'
    }),

  business_title: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Business title must not exceed 255 characters'
    }),

  job_profile: Joi.string().trim().max(255).required()
    .messages({
      'string.max': 'Job profile must not exceed 255 characters',
      'any.required': 'Job profile is required'
    }),

  job_family: Joi.string().trim().max(255).required()
    .messages({
      'string.max': 'Job family must not exceed 255 characters',
      'any.required': 'Job family is required'
    }),

  management_level: Joi.string().valid(
    'Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'
  ).required()
    .messages({
      'any.only': 'Management level must be one of: Entry, Junior, Mid, Senior, Lead, Manager, Director, VP, C-Level',
      'any.required': 'Management level is required'
    }),

  time_type: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern').optional()
    .messages({
      'any.only': 'Time type must be one of: Full-time, Part-time, Contract, Temporary, Intern'
    }),

  location: Joi.string().trim().max(255).required()
    .messages({
      'string.max': 'Location must not exceed 255 characters',
      'any.required': 'Location is required'
    }),

  phone: Joi.string().trim().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid format'
    }),

  email: Joi.string().email().max(255).required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email must not exceed 255 characters',
      'any.required': 'Email is required'
    }),

  work_address: Joi.string().trim().max(500).optional()
    .messages({
      'string.max': 'Work address must not exceed 500 characters'
    }),

  skills: Joi.alternatives().try(
    Joi.string().trim().max(5000).optional(),
    Joi.array().items(Joi.string().trim().max(100)).min(0).max(50).optional()
  ).optional()
    .messages({
      'string.max': 'Skills string must not exceed 5000 characters',
      'array.min': 'Skills array cannot be empty if provided',
      'array.max': 'Skills array cannot have more than 50 items'
    })
});

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
        // Validate required fields for individual data
        if (!emp.employee_id || !emp.email || !emp.employee_type || !emp.time_type ||
          !emp.joining_date || !emp.hire_date || !emp.department_name || !emp.role_name) {
          throw new Error('Missing required fields for individual data');
        }

        // Validate required fields for job details
        if (!emp.job_profile || !emp.job_family || !emp.management_level || !emp.location) {
          throw new Error('Missing required fields for job details');
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

        // Create user account
        const userId = await User.create({
          employee_id: emp.employee_id,
          email: emp.email,
          password: hashedPassword,
          role_id: roleId,
          individual_data_id: individualId
        });

        // Prepare job details data using the created individual ID
        const jobDetailsData = {
          individual_data_id: individualId, // Using the actual created individual ID
          supervisory_organization: emp.supervisory_organization || null,
          job: emp.job || null,
          business_title: emp.business_title || null,
          job_profile: emp.job_profile,
          job_family: emp.job_family,
          management_level: emp.management_level,
          time_type: emp.time_type, // Reusing time_type from individual data
          location: emp.location,
          phone: emp.phone || null,
          email: emp.email, // Reusing email from individual data
          work_address: emp.work_address || null,
          skills: emp.skills || null // Keep skills as string initially
        };

        // Validate job details data
        const { error, value } = jobDetailsSchema.validate(jobDetailsData);
        if (error) {
          throw new Error(`Job details validation error: ${error.details[0].message}`);
        }

        // Convert skills string to array before saving to database
        if (value.skills && typeof value.skills === 'string') {
          // Split by comma and clean up each skill
          value.skills = value.skills.split(',')
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0); // Remove empty skills
          
          // Validate array length after conversion
          if (value.skills.length > 50) {
            throw new Error('Skills array cannot have more than 50 items');
          }
          
          // Validate each skill length
          for (const skill of value.skills) {
            if (skill.length > 100) {
              throw new Error(`Skill "${skill}" exceeds 100 characters`);
            }
          }
        }

        // Create job details using the validated and processed data
        const jobDetailsId = await JobDetails.create(value);

        results.push({
          row: index + 2, // Excel rows start at 1, header is row 1
          employee_id: emp.employee_id,
          status: 'Success',
          userId,
          individualId,
          jobDetailsId,
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

// Keep the existing createJobDetails function for individual job details creation
const createJobDetails = async (req, res) => {
  try {
    const { error, value } = jobDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    // Check if individual_data exists
    const individual = await IndividualData.findByEmployeeId(value.individual_data_id);
    if (!individual) {
      return res.status(404).json({ message: 'Individual data not found' });
    }
    
    // Check if job details already exist for this individual
    const existingJobDetails = await JobDetails.findByIndividualDataId(value.individual_data_id);
    if (existingJobDetails) {
      return res.status(400).json({
        message: 'Job details already exist for this employee. Use update instead.'
      });
    }
    
    value.individual_data_id = individual.id;
    
    // Convert skills string to array before saving to database (if needed)
    if (value.skills && typeof value.skills === 'string') {
      // Split by comma and clean up each skill
      value.skills = value.skills.split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0); // Remove empty skills
      
      // Validate array length after conversion
      if (value.skills.length > 50) {
        return res.status(400).json({ 
          message: 'Skills array cannot have more than 50 items' 
        });
      }
      
      // Validate each skill length
      for (const skill of value.skills) {
        if (skill.length > 100) {
          return res.status(400).json({ 
            message: `Skill "${skill}" exceeds 100 characters` 
          });
        }
      }
    }
    
    const jobDetailsId = await JobDetails.create(value);
    
    res.status(201).json({
      message: 'Job details created successfully',
      data: { id: jobDetailsId }
    });
  } catch (error) {
    console.error('Create job details error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Job details already exist for this employee' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  processBulkUpload,
  createJobDetails
};