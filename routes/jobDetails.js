// routes/jobDetailsRoutes.js
const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();
const {
  createJobDetails,
  getJobDetailsById,
  getJobDetailsByIndividualDataId,
  getJobDetailsByEmployeeId,
  getAllJobDetails,
  getJobDetailsByJobProfile,
  getJobDetailsByManagementLevel,
  getJobDetailsByJobFamily,
  getJobDetailsByLocation,
  searchJobDetailsBySkills,
  updateJobDetails,
  updateJobDetailsByIndividualDataId,
  deleteJobDetails,
  deleteJobDetailsByIndividualDataId,
  getJobDetailsStats,
  validateIndividualDataId,
  bulkUpdateJobDetails,
  getJobDetailsAnalytics
} = require('../controllers/jobDetailsController');

// Base routes
router.post('/', createJobDetails);
router.get('/', getAllJobDetails);

// Stats and analytics routes (should come before parameterized routes)
router.get('/stats', getJobDetailsStats);
router.get('/analytics', getJobDetailsAnalytics);

// Validation routes
router.get('/validate/individual-data/:individualDataId', validateIndividualDataId);

// Search routes
router.post('/search/skills', searchJobDetailsBySkills);

// Bulk operations
router.put('/bulk-update', bulkUpdateJobDetails);

// Get by various parameters
router.get('/job-profile/:jobProfile', getJobDetailsByJobProfile);
router.get('/management-level/:managementLevel', getJobDetailsByManagementLevel);
router.get('/job-family/:jobFamily', getJobDetailsByJobFamily);
router.get('/location/:location', getJobDetailsByLocation);

// Get by IDs (these should come after more specific routes)
router.get('/individual-data/:individualDataId', getJobDetailsByIndividualDataId);
router.get('/employee', auth, getJobDetailsByEmployeeId);
router.get('/:id', getJobDetailsById);

// Update routes
router.patch('/individual-data/:individualDataId', updateJobDetailsByIndividualDataId);
router.patch('/:id', updateJobDetails);

// Delete routes
router.delete('/individual-data/:individualDataId', deleteJobDetailsByIndividualDataId);
router.delete('/:id', deleteJobDetails);

module.exports = router;