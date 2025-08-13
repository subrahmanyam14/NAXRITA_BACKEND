const XLSX = require('xlsx');
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

// Utility function to convert Excel date serial number to JavaScript Date
const excelDateToJSDate = (excelDate) => {
  if (!excelDate) return null;
  
  // If it's already a Date object
  if (excelDate instanceof Date) return excelDate;
  
  // If it's a number (Excel serial date)
  if (typeof excelDate === 'number' && excelDate > 0) {
    // Excel date serial number conversion
    // Excel epoch: January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
  }
  
  // If it's a string in dd-mm-yyyy format
  if (typeof excelDate === 'string') {
    // Handle dd-mm-yyyy format
    const datePattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const match = excelDate.match(datePattern);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
      const year = parseInt(match[3], 10);
      
      const jsDate = new Date(year, month, day);
      
      // Validate the constructed date
      if (jsDate.getFullYear() === year && 
          jsDate.getMonth() === month && 
          jsDate.getDate() === day) {
        return jsDate;
      } else {
        throw new Error(`Invalid date: ${excelDate}`);
      }
    }
    
    // Try parsing as a regular date string (fallback)
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  throw new Error(`Unable to convert date: ${excelDate} (type: ${typeof excelDate})`);
};

// Utility function to format date as dd-mm-yyyy string
const formatDateToDDMMYYYY = (date) => {
  if (!date || !(date instanceof Date)) return null;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // JavaScript months are 0-indexed
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

const processBulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Read Excel file with specific options to handle dates
    const workbook = XLSX.read(req.file.buffer, {
      cellDates: true, // Parse dates as Date objects when possible
      dateNF: 'dd-mm-yyyy' // Default date format
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with raw: false to format cells
    const employees = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Format dates and numbers
      dateNF: 'dd-mm-yyyy' // Specify date format for output
    });

    console.log('Sample employee data:', employees[0]); // Debug log

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

        console.log(`Processing row ${index + 2}:`);
        console.log(`Original joining_date: ${emp.joining_date} (type: ${typeof emp.joining_date})`);
        console.log(`Original hire_date: ${emp.hire_date} (type: ${typeof emp.hire_date})`);

        // Validate required fields for job details
        if (!emp.job_profile || !emp.job_family || !emp.management_level || !emp.location) {
          throw new Error('Missing required fields for job details');
        }

        // Convert Excel dates to JavaScript dates
        const joiningDate = excelDateToJSDate(emp.joining_date);
        const hireDate = excelDateToJSDate(emp.hire_date);

        console.log(`Converted joining_date: ${joiningDate}`);
        console.log(`Converted hire_date: ${hireDate}`);

        // Validate converted dates
        if (!joiningDate || !hireDate || isNaN(joiningDate.getTime()) || isNaN(hireDate.getTime())) {
          throw new Error(`Invalid date format - joining: ${emp.joining_date}, hire: ${emp.hire_date}`);
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

        console.log("Processed individual data:", individualData);

        // Create individual record
        const individualId = await IndividualData.create(individualData);

        // Create password using the joining date in yyyy-mm-dd format for consistency
        const joiningDateStr = joiningDate.toISOString().split('T')[0]; // yyyy-mm-dd format
        const password = `${emp.employee_id}@${joiningDateStr}`;

        // Debug log to check password
        console.log(`Creating password for ${emp.employee_id}: ${password}`);

        // Validate password before hashing
        if (!password || password.includes('undefined') || password.includes('null')) {
          throw new Error(`Invalid password generated: ${password}`);
        }

        // Create user account
        const userId = await User.create({
          employee_id: emp.employee_id,
          email: emp.email,
          password: password,
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

        console.log("Processed job details data:", jobDetailsData);

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
          generatedPassword: password, // Include generated password in response for reference
          processedDates: {
            joining_date: formatDateToDDMMYYYY(joiningDate),
            hire_date: formatDateToDDMMYYYY(hireDate)
          }
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
  createJobDetails,
  excelDateToJSDate, // Export utility function
  formatDateToDDMMYYYY // Export formatting function
};