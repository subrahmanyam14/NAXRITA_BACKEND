const express = require('express');
const multer = require('multer');
const upload = multer();
const bulkEmployeeController = require('../controllers/bulkEmployeeController');
const { 
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
} = require('../controllers/employeeController');
const { auth, authorize } = require('../middleware/auth');


const router = express.Router();

// Standard RESTful routes authorize(['hr_write', 'employee_write'])
router.post('/', auth, createEmployee);

// Bulk employee upload
router.post('/bulk-upload', upload.single('file'), bulkEmployeeController.processBulkUpload);

router.get('/stats', auth, authorize(['admin', 'hr', 'manager']), getEmployeeStats);

router.get('/validate/:employeeId', auth, authorize(['admin', 'hr']), validateEmployeeId);

router.get('/', auth, authorize(['admin', 'hr', 'manager']), getAllEmployees);

router.get('/employee/:id', auth, getEmployeeById);

router.get('/employee', auth, getEmployeeByEmployeeId);

router.get('/department/:departmentId', auth, authorize(['admin', 'hr', 'manager']), getEmployeesByDepartment);

router.get('/manager/:managerId', auth, getEmployeesByManager);

router.get('/hierarchy', auth, getEmployeeHierarchy);

//authorize(['admin', 'hr']), 
router.put('/:id', auth, updateEmployee);

router.patch('/:id/status', auth, authorize(['admin', 'hr']), updateEmployeeStatus);

router.delete('/:id', auth, authorize(['admin']), deleteEmployee);

module.exports = router;