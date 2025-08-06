// utils/validators.js
const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

const employeeRegisterationSchema = Joi.object({
  employee_id: Joi.string().max(20).required(),
  employee_name: Joi.string().max(255).required(),
  email: Joi.string().max(200).required(),
  employee_type: Joi.string().valid('Permanent', 'Contract', 'Temporary', 'Intern').required(),
  time_type: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Intern').required(),
  default_weekly_hours: Joi.number().precision(2).default(40.00),
  scheduled_weekly_hours: Joi.number().precision(2),
  joining_date: Joi.string().required(),
  hire_date: Joi.string().required(),
  job_profile_progression_model_designation: Joi.string().max(100).optional(),
  department_name: Joi.string().max(100).required(),
  role_name: Joi.string().max(100).required(),
  manager_id: Joi.string().max(20).optional(),
  status: Joi.string().valid('Active', 'Inactive', 'Terminated', 'On Leave').optional(),

});

const jobDetailsSchema = Joi.object({
  individual_data_id: Joi.string().max(20).required()
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

  skills: Joi.array().items(Joi.string().trim().max(100)).min(0).max(50).optional()
    .messages({
      'array.min': 'Skills array cannot be empty if provided',
      'array.max': 'Skills array cannot have more than 50 items',
      'string.max': 'Each skill must not exceed 100 characters'
    })
});

const jobDetailsUpdateSchema = Joi.object({
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

  job_profile: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Job profile must not exceed 255 characters'
    }),

  job_family: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Job family must not exceed 255 characters'
    }),

  management_level: Joi.string().valid(
    'Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'
  ).optional()
    .messages({
      'any.only': 'Management level must be one of: Entry, Junior, Mid, Senior, Lead, Manager, Director, VP, C-Level'
    }),

  time_type: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern').optional()
    .messages({
      'any.only': 'Time type must be one of: Full-time, Part-time, Contract, Temporary, Intern'
    }),

  location: Joi.string().trim().max(255).optional()
    .messages({
      'string.max': 'Location must not exceed 255 characters'
    }),

  phone: Joi.string().trim().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),

  email: Joi.string().email().max(255).optional()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email must not exceed 255 characters',
      'any.required': 'Email is required'
    }),

  work_address: Joi.string().trim().max(500).optional()
    .messages({
      'string.max': 'Work address must not exceed 500 characters'
    }),

  skills: Joi.array().items(Joi.string().trim().max(100)).min(0).max(50).optional()
    .messages({
      'array.min': 'Skills array cannot be empty if provided',
      'array.max': 'Skills array cannot have more than 50 items',
      'string.max': 'Each skill must not exceed 100 characters'
    })
  });

module.exports = {
  loginSchema,
  employeeRegisterationSchema,
  jobDetailsSchema,
  jobDetailsUpdateSchema
};
