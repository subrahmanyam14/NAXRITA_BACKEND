// controllers/jobDetailsController.js
const JobDetails = require("../models/JobDetails");
const IndividualData = require("../models/IndividualData");
const { jobDetailsSchema } = require("../utils/validators");

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

const getJobDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid job details ID is required' });
    }

    const jobDetails = await JobDetails.findById(parseInt(id));
    
    if (!jobDetails) {
      return res.status(404).json({ message: 'Job details not found' });
    }

    res.status(200).json({
      message: 'Job details retrieved successfully',
      data: jobDetails
    });
  } catch (error) {
    console.error('Get job details by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByIndividualDataId = async (req, res) => {
  try {
    const { individualDataId } = req.params;
    
    if (!individualDataId || isNaN(individualDataId)) {
      return res.status(400).json({ message: 'Valid individual data ID is required' });
    }

    const jobDetails = await JobDetails.findByIndividualDataId(parseInt(individualDataId));
    
    if (!jobDetails) {
      return res.status(404).json({ message: 'Job details not found for this employee' });
    }

    res.status(200).json({
      message: 'Job details retrieved successfully',
      data: jobDetails
    });
  } catch (error) {
    console.error('Get job details by individual data ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByEmployeeId = async (req, res) => {
  try {
    const { employee_id } = req.user;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const jobDetails = await JobDetails.findByEmployeeId(employee_id);
    
    if (!jobDetails) {
      return res.status(404).json({ message: 'Job details not found for this employee' });
    }

    res.status(200).json({
      message: 'Job details retrieved successfully',
      data: jobDetails
    });
  } catch (error) {
    console.error('Get job details by employee ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllJobDetails = async (req, res) => {
  try {
    const { page = 1, limit = 10, job_profile, management_level, job_family, location } = req.query;
    
    let jobDetails = await JobDetails.findAll();
    
    // Apply filters
    if (job_profile) {
      jobDetails = jobDetails.filter(jd => 
        jd.job_profile && jd.job_profile.toLowerCase().includes(job_profile.toLowerCase())
      );
    }
    
    if (management_level) {
      jobDetails = jobDetails.filter(jd => 
        jd.management_level && jd.management_level.toLowerCase() === management_level.toLowerCase()
      );
    }
    
    if (job_family) {
      jobDetails = jobDetails.filter(jd => 
        jd.job_family && jd.job_family.toLowerCase().includes(job_family.toLowerCase())
      );
    }
    
    if (location) {
      jobDetails = jobDetails.filter(jd => 
        jd.location && jd.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedJobDetails = jobDetails.slice(startIndex, endIndex);
    
    res.status(200).json({
      message: 'Job details retrieved successfully',
      data: paginatedJobDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(jobDetails.length / limit),
        totalRecords: jobDetails.length,
        hasNext: endIndex < jobDetails.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Get all job details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByJobProfile = async (req, res) => {
  try {
    const { jobProfile } = req.params;
    
    if (!jobProfile) {
      return res.status(400).json({ message: 'Job profile is required' });
    }

    const jobDetails = await JobDetails.findByJobProfile(jobProfile);
    
    res.status(200).json({
      message: 'Job details by job profile retrieved successfully',
      data: jobDetails,
      count: jobDetails.length
    });
  } catch (error) {
    console.error('Get job details by job profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByManagementLevel = async (req, res) => {
  try {
    const { managementLevel } = req.params;
    
    const validLevels = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'];
    if (!validLevels.includes(managementLevel)) {
      return res.status(400).json({ 
        message: `Invalid management level. Must be one of: ${validLevels.join(', ')}` 
      });
    }

    const jobDetails = await JobDetails.findByManagementLevel(managementLevel);
    
    res.status(200).json({
      message: 'Job details by management level retrieved successfully',
      data: jobDetails,
      count: jobDetails.length
    });
  } catch (error) {
    console.error('Get job details by management level error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByJobFamily = async (req, res) => {
  try {
    const { jobFamily } = req.params;
    
    if (!jobFamily) {
      return res.status(400).json({ message: 'Job family is required' });
    }

    const jobDetails = await JobDetails.findByJobFamily(jobFamily);
    
    res.status(200).json({
      message: 'Job details by job family retrieved successfully',
      data: jobDetails,
      count: jobDetails.length
    });
  } catch (error) {
    console.error('Get job details by job family error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    
    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const jobDetails = await JobDetails.findByLocation(location);
    
    res.status(200).json({
      message: 'Job details by location retrieved successfully',
      data: jobDetails,
      count: jobDetails.length
    });
  } catch (error) {
    console.error('Get job details by location error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const searchJobDetailsBySkills = async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ message: 'Skills array is required' });
    }

    const jobDetails = await JobDetails.searchBySkills(skills);
    
    res.status(200).json({
      message: 'Job details by skills retrieved successfully',
      data: jobDetails,
      count: jobDetails.length,
      searchedSkills: skills
    });
  } catch (error) {
    console.error('Search job details by skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateJobDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid job details ID is required' });
    }

    // Check if job details exist
    const existingJobDetails = await JobDetails.findById(parseInt(id));
    if (!existingJobDetails) {
      return res.status(404).json({ message: 'Job details not found' });
    }

    // Validate update data if validator exists
    if (updateData.skills && !Array.isArray(updateData.skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const updated = await JobDetails.update(parseInt(id), updateData);
    
    if (!updated) {
      return res.status(400).json({ message: 'No changes made or invalid data provided' });
    }

    // Get updated job details
    const updatedJobDetails = await JobDetails.findById(parseInt(id));
    
    res.status(200).json({
      message: 'Job details updated successfully',
      data: updatedJobDetails
    });
  } catch (error) {
    console.error('Update job details error:', error);
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateJobDetailsByIndividualDataId = async (req, res) => {
  try {
    const { individualDataId } = req.params;
    const updateData = req.body;
    
    if (!individualDataId || isNaN(individualDataId)) {
      return res.status(400).json({ message: 'Valid individual data ID is required' });
    }

    // Check if job details exist
    const existingJobDetails = await JobDetails.findByIndividualDataId(parseInt(individualDataId));
    if (!existingJobDetails) {
      return res.status(404).json({ message: 'Job details not found for this employee' });
    }

    // Validate update data
    if (updateData.skills && !Array.isArray(updateData.skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const updated = await JobDetails.updateByIndividualDataId(parseInt(individualDataId), updateData);
    
    if (!updated) {
      return res.status(400).json({ message: 'No changes made or invalid data provided' });
    }

    // Get updated job details
    const updatedJobDetails = await JobDetails.findByIndividualDataId(parseInt(individualDataId));
    
    res.status(200).json({
      message: 'Job details updated successfully',
      data: updatedJobDetails
    });
  } catch (error) {
    console.error('Update job details by individual data ID error:', error);
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteJobDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Valid job details ID is required' });
    }

    // Check if job details exist
    const existingJobDetails = await JobDetails.findById(parseInt(id));
    if (!existingJobDetails) {
      return res.status(404).json({ message: 'Job details not found' });
    }

    const deleted = await JobDetails.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(400).json({ message: 'Failed to delete job details' });
    }

    res.status(200).json({
      message: 'Job details deleted successfully',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Delete job details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteJobDetailsByIndividualDataId = async (req, res) => {
  try {
    const { individualDataId } = req.params;
    
    if (!individualDataId || isNaN(individualDataId)) {
      return res.status(400).json({ message: 'Valid individual data ID is required' });
    }

    // Check if job details exist
    const existingJobDetails = await JobDetails.findByIndividualDataId(parseInt(individualDataId));
    if (!existingJobDetails) {
      return res.status(404).json({ message: 'Job details not found for this employee' });
    }

    const deleted = await JobDetails.deleteByIndividualDataId(parseInt(individualDataId));
    
    if (!deleted) {
      return res.status(400).json({ message: 'Failed to delete job details' });
    }

    res.status(200).json({
      message: 'Job details deleted successfully',
      data: { individual_data_id: parseInt(individualDataId) }
    });
  } catch (error) {
    console.error('Delete job details by individual data ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsStats = async (req, res) => {
  try {
    const stats = await JobDetails.getJobDetailsStats();
    const managementLevelDistribution = await JobDetails.getManagementLevelDistribution();
    const jobFamilyDistribution = await JobDetails.getJobFamilyDistribution();
    const locationDistribution = await JobDetails.getLocationDistribution();

    res.status(200).json({
      message: 'Job details statistics retrieved successfully',
      data: {
        overview: stats,
        managementLevelDistribution,
        jobFamilyDistribution,
        locationDistribution
      }
    });
  } catch (error) {
    console.error('Get job details stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const validateIndividualDataId = async (req, res) => {
  try {
    const { individualDataId } = req.params;
    const { excludeId } = req.query;
    
    if (!individualDataId || isNaN(individualDataId)) {
      return res.status(400).json({ message: 'Valid individual data ID is required' });
    }

    // Check if individual data exists
    const individual = await IndividualData.findById(parseInt(individualDataId));
    if (!individual) {
      return res.status(404).json({ 
        message: 'Individual data not found',
        isValid: false
      });
    }

    // Check if job details already exist for this individual
    const isUnique = await JobDetails.validateUniqueIndividualDataId(
      parseInt(individualDataId), 
      excludeId ? parseInt(excludeId) : null
    );

    if (!isUnique) {
      return res.status(200).json({
        message: 'Job details already exist for this individual data ID',
        isValid: false,
        isUnique: false
      });
    }

    res.status(200).json({
      message: 'Individual data ID is valid and available',
      isValid: true,
      isUnique: true,
      individualData: {
        id: individual.id,
        employee_id: individual.employee_id,
        employee_name: individual.employee_name,
        status: individual.status
      }
    });
  } catch (error) {
    console.error('Validate individual data ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const bulkUpdateJobDetails = async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Updates array is required' });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, individual_data_id, ...updateData } = update;
        
        if (!id && !individual_data_id) {
          errors.push({
            update,
            error: 'Either id or individual_data_id is required'
          });
          continue;
        }

        let updated;
        if (id) {
          const existingJobDetails = await JobDetails.findById(parseInt(id));
          if (!existingJobDetails) {
            errors.push({
              update,
              error: 'Job details not found for ID: ' + id
            });
            continue;
          }
          updated = await JobDetails.update(parseInt(id), updateData);
        } else {
          const existingJobDetails = await JobDetails.findByIndividualDataId(parseInt(individual_data_id));
          if (!existingJobDetails) {
            errors.push({
              update,
              error: 'Job details not found for individual_data_id: ' + individual_data_id
            });
            continue;
          }
          updated = await JobDetails.updateByIndividualDataId(parseInt(individual_data_id), updateData);
        }

        if (updated) {
          results.push({
            id: id || null,
            individual_data_id: individual_data_id || null,
            status: 'updated'
          });
        } else {
          errors.push({
            update,
            error: 'No changes made or invalid data provided'
          });
        }
      } catch (error) {
        errors.push({
          update,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: 'Bulk update completed',
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk update job details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getJobDetailsAnalytics = async (req, res) => {
  try {
    const { groupBy = 'management_level', limit = 10 } = req.query;
    
    const validGroupBy = ['management_level', 'job_family', 'location', 'job_profile'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({ 
        message: `Invalid groupBy parameter. Must be one of: ${validGroupBy.join(', ')}` 
      });
    }

    let analytics;
    switch (groupBy) {
      case 'management_level':
        analytics = await JobDetails.getManagementLevelDistribution();
        break;
      case 'job_family':
        analytics = await JobDetails.getJobFamilyDistribution();
        break;
      case 'location':
        analytics = await JobDetails.getLocationDistribution();
        break;
      case 'job_profile':
        const [rows] = await require('../config/database').execute(`
          SELECT 
            jd.job_profile,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM job_details)), 2) as percentage
          FROM job_details jd
          LEFT JOIN individual_data i ON jd.individual_data_id = i.id
          WHERE i.status = 'Active'
          GROUP BY jd.job_profile
          ORDER BY count DESC
          LIMIT ?
        `, [parseInt(limit)]);
        analytics = rows;
        break;
    }

    res.status(200).json({
      message: `Job details analytics by ${groupBy} retrieved successfully`,
      data: analytics,
      groupBy,
      count: analytics.length
    });
  } catch (error) {
    console.error('Get job details analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
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
};