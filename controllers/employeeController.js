// controllers/employeeController.js
const IndividualData = require("../models/IndividualData");
const User = require("../models/User");
const { employeeRegisterationSchema } = require("../utils/validators");
const db = require('../config/database');
const createEmployee = async (req, res) => {
  try {
    const { error, value } = employeeRegisterationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    let managerId;
    // Get manager ID
    if(value.manager_id){
      managerId = await IndividualData.findByEmployeeId(value.manager_id);
    }

    // Get department ID
    const departmentId = await User.getDepartmentId(value.department_name);
    if (!departmentId) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Get role ID
    const roleId = await User.getRoleId(value.role_name);
    if (!roleId) {
      return res.status(400).json({ message: 'Role not found' });
    }

    // Prepare individual data
    const individualData = {
      employee_id: value.employee_id,
      employee_name: value.employee_name,
      employee_type: value.employee_type,
      email: value.email,
      time_type: value.time_type,
      default_weekly_hours: value.default_weekly_hours || 40.00,
      scheduled_weekly_hours: value.scheduled_weekly_hours || null,
      joining_date: value.joining_date,
      hire_date: value.hire_date,
      job_profile_progression_model_designation: value.job_profile_progression_model_designation || null,
      department_id: departmentId,
      manager_id: managerId?.id || null, 
      status: value.status || 'Active'
    };

    const individualId = await IndividualData.create(individualData);

    // Create user account
    const password = `${value.employee_id}@${value.joining_date}`;
    console.log("Pasword: ", password);
    const userId = await User.create({
      employee_id: value.employee_id,
      email: value.email,
      password: password,
      role_id: roleId,
      individual_data_id: individualId
    });

    res.status(201).json({
      message: 'Employee created successfully',
      userId
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    const employee = await IndividualData.findById(parseInt(id));
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      message: 'Employee retrieved successfully',
      data: employee
    });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEmployeeByEmployeeId = async (req, res) => {
  try {
    const { employee_id } = req.user;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const employee = await IndividualData.findByEmployeeId(employee_id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      message: 'Employee retrieved successfully',
      data: employee
    });
  } catch (error) {
    console.error('Get employee by employee ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    // Validate and parse input parameters
    let { page = 1, limit = 10, status } = req.query;
    
    // Convert to integers with fallbacks
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    
    // Enforce maximum limit
    limit = Math.min(limit, 100);
    
    // Ensure positive values
    page = Math.max(1, page);
    limit = Math.max(1, limit);

    // Get total count for pagination metadata
    let countQuery = 'SELECT COUNT(*) as total FROM individual_data';
    const countParams = [];
    
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const [[{ total }]] = await db.execute(countQuery, countParams);
    
    // Get paginated data
    const employees = await IndividualData.findAll({
      page,
      limit,
      status
    });
    
    res.status(200).json({
      message: 'Employees retrieved successfully',
      data: employees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEmployeesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    if (!departmentId || isNaN(departmentId)) {
      return res.status(400).json({ message: 'Valid department ID is required' });
    }

    const employees = await IndividualData.findByDepartment(parseInt(departmentId));
    
    res.status(200).json({
      message: 'Department employees retrieved successfully',
      data: employees,
      count: employees.length
    });
  } catch (error) {
    console.error('Get employees by department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEmployeesByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    if (!managerId || isNaN(managerId)) {
      return res.status(400).json({ message: 'Valid manager ID is required' });
    }

    const employees = await IndividualData.findByManager(parseInt(managerId));
    
    res.status(200).json({
      message: 'Manager subordinates retrieved successfully',
      data: employees,
      count: employees.length
    });
  } catch (error) {
    console.error('Get employees by manager error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    // Check if employee exists
    const existingEmployee = await IndividualData.findById(parseInt(id));
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // If manager_id is being updated, validate it exists
    if (updateData.manager_id) {
      const manager = await IndividualData.findByEmployeeId(updateData.manager_id);
      if (!manager) {
        return res.status(400).json({ message: 'Manager not found' });
      }
    }

    // Process date fields to remove time portion if present
    const dateFields = ['joining_date', 'hire_date']; // Add any other date fields here
    for (const field of dateFields) {
      if (updateData[field]) {
        // If the date comes as ISO string (e.g., '2023-01-01T00:00:00.000Z')
        if (typeof updateData[field] === 'string' && updateData[field].includes('T')) {
          updateData[field] = updateData[field].split('T')[0];
        }
        // If it's a Date object
        else if (updateData[field] instanceof Date) {
          updateData[field] = updateData[field].toISOString().split('T')[0];
        }
      }
    }

    const updated = await IndividualData.update(parseInt(id), updateData);
    
    if (!updated) {
      return res.status(400).json({ message: 'No changes made or invalid data provided' });
    }

    // Get updated employee data
    const updatedEmployee = await IndividualData.findById(parseInt(id));
    
    res.status(200).json({
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Validate status value
    const validStatuses = ['Active', 'Inactive', 'Terminated', 'On Leave'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Check if employee exists
    const existingEmployee = await IndividualData.findById(parseInt(id));
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updated = await IndividualData.updateStatus(parseInt(id), status);
    
    if (!updated) {
      return res.status(400).json({ message: 'Failed to update employee status' });
    }

    res.status(200).json({
      message: 'Employee status updated successfully',
      data: { id: parseInt(id), status }
    });
  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    // Check if employee exists
    const existingEmployee = await IndividualData.findById(parseInt(id));
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee has subordinates
    const subordinates = await IndividualData.findByManager(parseInt(id));
    if (subordinates.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete employee with active subordinates. Please reassign or remove subordinates first.',
        subordinates: subordinates.map(emp => ({ id: emp.id, employee_id: emp.employee_id, employee_name: emp.employee_name }))
      });
    }

    const deleted = await IndividualData.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(400).json({ message: 'Failed to delete employee' });
    }

    res.status(200).json({
      message: 'Employee deleted successfully (soft delete - status changed to Terminated)',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEmployeeHierarchy = async (req, res) => {
  try {
    const { employee_id } = req.user;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Check if employee exists
    const employee = await IndividualData.findByEmployeeId(employee_id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const hierarchy = await IndividualData.getHierarchy(employee_id);
    
    res.status(200).json({
      message: 'Employee hierarchy retrieved successfully',
      data: hierarchy,
      rootEmployee: employee_id
    });
  } catch (error) {
    console.error('Get employee hierarchy error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const validateEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const isAvailable = await IndividualData.validateEmployeeId(employeeId);
    
    res.status(200).json({
      message: 'Employee ID validation completed',
      data: {
        employeeId,
        isAvailable,
        status: isAvailable ? 'Available' : 'Already exists'
      }
    });
  } catch (error) {
    console.error('Validate employee ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEmployeeStats = async (req, res) => {
  try {
    const allEmployees = await IndividualData.findAll();
    
    const stats = {
      total: allEmployees.length,
      active: allEmployees.filter(emp => emp.status === 'Active').length,
      inactive: allEmployees.filter(emp => emp.status === 'Inactive').length,
      terminated: allEmployees.filter(emp => emp.status === 'Terminated').length,
      onLeave: allEmployees.filter(emp => emp.status === 'On Leave').length,
      byEmployeeType: {},
      byTimeType: {},
      byDepartment: {}
    };

    // Group by employee type
    allEmployees.forEach(emp => {
      stats.byEmployeeType[emp.employee_type] = (stats.byEmployeeType[emp.employee_type] || 0) + 1;
    });

    // Group by time type
    allEmployees.forEach(emp => {
      stats.byTimeType[emp.time_type] = (stats.byTimeType[emp.time_type] || 0) + 1;
    });

    // Group by department
    allEmployees.forEach(emp => {
      const dept = emp.department_name || 'Unassigned';
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
    });

    res.status(200).json({
      message: 'Employee statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createEmployee,
  getEmployeeById,
  getEmployeeByEmployeeId,
  getAllEmployees,
  getEmployeesByDepartment,
  getEmployeesByManager,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  getEmployeeHierarchy,
  validateEmployeeId,
  getEmployeeStats
};