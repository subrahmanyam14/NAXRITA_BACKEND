// routes/roleDepartmentRoutes.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/roleDepartmentController');

// Middleware for authentication (assuming you have this)
// const authenticateToken = require('../middleware/auth');

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// ========== ROLE ROUTES ==========
// GET /api/roles - Get all roles with pagination
router.get('/roles', getRoles);

// GET /api/roles/:id - Get specific role by ID
router.get('/roles/:id', getRoleById);

// POST /api/roles - Create new role
router.post('/roles', createRole);

// PUT /api/roles/:id - Update existing role
router.put('/roles/:id', updateRole);

// DELETE /api/roles/:id - Delete role
router.delete('/roles/:id', deleteRole);

// ========== DEPARTMENT ROUTES ==========
// GET /api/departments - Get all departments with pagination
router.get('/departments', getDepartments);

// GET /api/departments/:id - Get specific department by ID
router.get('/departments/:id', getDepartmentById);

// GET /api/departments/:id/employees - Get employees in a specific department
router.get('/departments/:id/employees', getDepartmentEmployees);

// POST /api/departments - Create new department
router.post('/departments', createDepartment);

// PUT /api/departments/:id - Update existing department
router.put('/departments/:id', updateDepartment);

// DELETE /api/departments/:id - Delete department
router.delete('/departments/:id', deleteDepartment);

module.exports = router;