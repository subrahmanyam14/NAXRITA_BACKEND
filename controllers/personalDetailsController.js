const fs = require("fs");
const path = require("path");
const PersonalDetails = require('../models/PersonalDetails');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';


// CREATE - Create new personal details
const createPersonalDetails = async (req, res) => {
  try {
    const { individual_data_id } = req.user;

    // Validate required field
    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    // Check if personal details already exist
    const exists = await PersonalDetails.existsForIndividual(individual_data_id);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Personal details already exist for this individual'
      });
    }

    // Handle uploaded file
    let uploadedFile = null;
    if (req.file) {
      uploadedFile = path.relative(path.join(__dirname, '../'), req.file.path).replace(/\\/g, '/');
    }

    const personalData = {
      individual_data_id: parseInt(individual_data_id),
      ...req.body,
      profile_pic: uploadedFile // Include file information in the data
    };
    // console.log(personalData);
    const result = await PersonalDetails.create(personalData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create personal details error:', error);
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create personal details'
    });
  }
};


// READ - Get personal details by individual ID
const getPersonalDetailsByIndividualId = async (req, res) => {
  try {
    const { individual_data_id } = req.user;

    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    const result = await PersonalDetails.getByIndividualId(individual_data_id);

    if (!result.success) {
      return res.status(404).json(result);
    }
    // console.log(`${BASE_URL}/${result.data.profile_pic}`)
    result.data.profile_pic = `${BASE_URL}/${result.data.profile_pic}`;

    res.status(200).json(result);

  } catch (error) {
    console.error('Get personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve personal details'
    });
  }
};

// READ - Get detailed personal details with individual data
const getDetailedPersonalDetails = async (req, res) => {
  try {
    const { individual_data_id } = req.user;

    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    const result = await PersonalDetails.getDetailedByIndividualId(individual_data_id);

    if (!result.success) {
      return res.status(404).json(result);
    }
    result.profile_pic = `${BASE_URL}/${result.profile_pic}`;

    res.status(200).json(result);

  } catch (error) {
    console.error('Get detailed personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve detailed personal details'
    });
  }
};

// READ - Get personal details by ID
const getPersonalDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Personal details ID is required'
      });
    }

    const result = await PersonalDetails.getById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }
    result.profile_pic = `${BASE_URL}/${result.profile_pic}`;

    res.status(200).json(result);

  } catch (error) {
    console.error('Get personal details by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve personal details'
    });
  }
};

// READ - Get all personal details with pagination
const getAllPersonalDetails = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
      });
    }

    const result = await PersonalDetails.getAll(pageNum, limitNum);
    res.status(200).json(result);

  } catch (error) {
    console.error('Get all personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve personal details'
    });
  }
};

// UPDATE - Update personal details by individual ID
const updatePersonalDetailsByIndividualId = async (req, res) => {
  try {
    const { individual_data_id } = req.user;
    const updateData = req.body;

    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Update data is required'
      });
    }

    const result = await PersonalDetails.updateByIndividualId(individual_data_id, updateData);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Update personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update personal details'
    });
  }
};

// UPDATE - Update personal details by ID
const updatePersonalDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(updateData)

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Personal details ID is required'
      });
    }

    // Handle uploaded file
    if (req.file) {
      let uploadedFile = path
        .relative(path.join(__dirname, '../'), req.file.path)
        .replace(/\\/g, '/'); // ensure forward slashes

      // Ensure only uploads/... path (without leading slash)
      const match = uploadedFile.match(/(?:^|\/)uploads\/.*/);
      if (match) {
        uploadedFile = match[0].replace(/^\//, ''); // Remove leading slash if present
      }
      updateData.profile_pic = uploadedFile;
    }

    // Check if any update data is provided
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Update data is required'
      });
    }

    // Format date_of_birth for MySQL DATE column
    if (updateData.date_of_birth) {
      const dob = new Date(updateData.date_of_birth);
      updateData.date_of_birth = dob.toISOString().split('T')[0]; // "YYYY-MM-DD"
    }

    // Clean profile_pic if sent via body (string)
    if (updateData.profile_pic && typeof updateData.profile_pic === 'string') {
      // Extract only uploads/... part (without leading slash)
      const match = updateData.profile_pic.match(/(?:^|\/)uploads\/.*/);
      if (match) {
        updateData.profile_pic = match[0].replace(/^\//, ''); // Remove leading slash if present
      } else {
        // If no uploads/ found, set to null or empty string as needed
        updateData.profile_pic = null;
      }
    }

    // Update in DB
    const result = await PersonalDetails.updateById(id, updateData);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Update personal details by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update personal details'
    });
  }
};

// DELETE - Delete personal details by individual ID
const deletePersonalDetailsByIndividualId = async (req, res) => {
  try {
    const { individual_data_id } = req.params;

    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    const result = await PersonalDetails.deleteByIndividualId(individual_data_id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Delete personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete personal details'
    });
  }
};

// DELETE - Delete personal details by ID
const deletePersonalDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Personal details ID is required'
      });
    }

    const result = await PersonalDetails.deleteById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Delete personal details by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete personal details'
    });
  }
};

// SEARCH - Search personal details
const searchPersonalDetails = async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 10 } = req.query;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
      });
    }

    const result = await PersonalDetails.search(searchTerm.trim(), pageNum, limitNum);
    res.status(200).json(result);

  } catch (error) {
    console.error('Search personal details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search personal details'
    });
  }
};

// CHECK - Check if personal details exist for individual
const checkPersonalDetailsExist = async (req, res) => {
  try {
    const { individual_data_id } = req.user;

    if (!individual_data_id) {
      return res.status(400).json({
        success: false,
        message: 'Individual data ID is required'
      });
    }

    const exists = await PersonalDetails.existsForIndividual(individual_data_id);

    res.status(200).json({
      success: true,
      exists,
      message: exists ? 'Personal details exist' : 'Personal details do not exist'
    });

  } catch (error) {
    console.error('Check personal details existence error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check personal details existence'
    });
  }
};

module.exports = {
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
};