const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require("../utils/uploadImage")
const {
  createPersonalDetails,
  getPersonalDetailsByIndividualId,
  getDetailedPersonalDetails,
  getPersonalDetailsById,
  getAllPersonalDetails,
  updatePersonalDetailsByIndividualId,
  updatePersonalDetailsById,
  deletePersonalDetailsByIndividualId,
  deletePersonalDetailsById,
  searchPersonalDetails,
  checkPersonalDetailsExist
} = require('../controllers/personalDetailsController');

// Routes based on individual_data_id (main routes)
// CREATE - Create personal details for individual
router.post('/individual', auth, upload.single('profile_pic'), createPersonalDetails);

// READ - Get personal details by individual ID
router.get('/individual', auth, getPersonalDetailsByIndividualId);

// READ - Get detailed personal details with individual data
router.get('/individual/detailed', auth, getDetailedPersonalDetails);

// UPDATE - Update personal details by individual ID
router.put('/individual', auth, updatePersonalDetailsByIndividualId);
router.patch('/individual', auth, updatePersonalDetailsByIndividualId);

// DELETE - Delete personal details by individual ID
router.delete('/individual', auth, deletePersonalDetailsByIndividualId);

// CHECK - Check if personal details exist for individual
router.get('/individual/exists', auth, checkPersonalDetailsExist);

// Routes based on personal_details ID (alternative routes)
// READ - Get personal details by personal details ID
router.get('/:id', getPersonalDetailsById);

// UPDATE - Update personal details by personal details ID
router.put('/:id', auth, upload.single('profile_pic'), updatePersonalDetailsById);
router.patch('/:id', updatePersonalDetailsById);

// DELETE - Delete personal details by personal details ID
router.delete('/:id', auth, deletePersonalDetailsById);

// General routes
// READ - Get all personal details with pagination
router.get('/', getAllPersonalDetails);

// SEARCH - Search personal details
router.get('/search', searchPersonalDetails);

module.exports = router;