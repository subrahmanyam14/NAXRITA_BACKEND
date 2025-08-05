// controllers/roleDepartmentController.js
const { Role, Department } = require('../models/RoleDepartmentModels');

// Role Controllers
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    // Check if role already exists
    const existingRole = await Role.findByName(name);
    if (existingRole) {
      return res.status(409).json({ message: 'Role with this name already exists' });
    }

    const roleId = await Role.create({
      name,
      description,
      permissions: permissions || []
    });

    const newRole = await Role.findById(roleId);

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        ...newRole,
        permissions: newRole.permissions || '[]'
      }
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRoles = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const roles = await Role.findAll(limit, offset);
    const totalCount = await Role.getCount();

    const rolesWithParsedPermissions = roles.map(role => ({
      ...role,
      permissions: role.permissions || '[]'
    }));

    res.json({
      roles: rolesWithParsedPermissions,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid role ID is required' });
    }

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      role: {
        ...role,
        permissions: role.permissions || '[]'
      }
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid role ID is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if another role with the same name exists (excluding current role)
    const roleWithSameName = await Role.findByName(name);
    if (roleWithSameName && roleWithSameName.id !== Number(id)) {
      return res.status(409).json({ message: 'Role with this name already exists' });
    }

    const updated = await Role.update(id, {
      name,
      description,
      permissions: permissions || []
    });

    if (!updated) {
      return res.status(404).json({ message: 'Role not found or no changes made' });
    }

    const updatedRole = await Role.findById(id);

    res.json({
      message: 'Role updated successfully',
      role: {
        ...updatedRole,
        permissions: updatedRole.permissions || '[]'
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid role ID is required' });
    }

    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const deleted = await Role.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Department Controllers
const createDepartment = async (req, res) => {
  try {
    const { name, description, head_employee_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    // Check if department already exists
    const existingDepartment = await Department.findByName(name);
    if (existingDepartment) {
      return res.status(409).json({ message: 'Department with this name already exists' });
    }

    const departmentId = await Department.create({
      name,
      description,
      head_employee_id: head_employee_id || null
    });

    const newDepartment = await Department.findById(departmentId);

    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getDepartments = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const departments = await Department.findAll(limit, offset);
    const totalCount = await Department.getCount();

    res.json({
      departments,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid department ID is required' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({
      department
    });
  } catch (error) {
    console.error('Get department by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, head_employee_id } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid department ID is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const existingDepartment = await Department.findById(id);
    if (!existingDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if another department with the same name exists (excluding current department)
    const departmentWithSameName = await Department.findByName(name);
    if (departmentWithSameName && departmentWithSameName.id !== Number(id)) {
      return res.status(409).json({ message: 'Department with this name already exists' });
    }

    const updated = await Department.update(id, {
      name,
      description,
      head_employee_id: head_employee_id || null
    });

    if (!updated) {
      return res.status(404).json({ message: 'Department not found or no changes made' });
    }

    const updatedDepartment = await Department.findById(id);

    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid department ID is required' });
    }

    const existingDepartment = await Department.findById(id);
    if (!existingDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const deleted = await Department.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getDepartmentEmployees = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid department ID is required' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const employees = await Department.getDepartmentEmployees(id, limit, offset);

    res.json({
      department: {
        id: department.id,
        name: department.name
      },
      employees,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: employees.length === Number(limit)
      }
    });
  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  // Role functions
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  // Department functions
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentEmployees
};