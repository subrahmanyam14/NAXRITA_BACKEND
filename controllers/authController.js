// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginSession = require('../models/LoginSession');
const bcrypt = require('bcryptjs');

const generateToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

const getDeviceInfo = (req) => {
  return {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    platform: req.get('User-Agent')?.includes('Mobile') ? 'Mobile' : 'Desktop'
  };
};

const login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required' });
    }

    const user = await User.findByEmployeeId(employeeId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({
      user_id: user.id, 
      individual_data_id: user.individual_data_id, 
      employee_id: user.employee_id,
      employee_name: user.employee_name
    });

    const deviceInfo = getDeviceInfo(req);

    // Create login session
    await LoginSession.create({
      user_id: user.id,
      device_info: deviceInfo,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      session_token: token
    });

    await User.updateLastLogin(user.id);

    // Parse permissions if it's a JSON string
    let permissions = [];
    try {
      permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions || [];
    } catch (e) {
      permissions = [];
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        employeeId: user.employee_id, // Fixed: was user.employeeId
        individual_data_id: user.individual_data_id,
        email: user.email,
        role: user.name, // This is the role name from the JOIN
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    if (req.sessionToken) {
      await LoginSession.updateLogout(req.sessionToken);
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const sessions = await LoginSession.getUserSessions(user.id, 5);
    
    // Parse permissions if it's a JSON string
    let permissions = [];
    try {
      permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions || [];
    } catch (e) {
      permissions = [];
    }

    res.json({
      user: {
        id: user.id,
        employeeId: user.employee_id,
        email: user.email,
        role: user.role_name || user.name,
        permissions: permissions
      },
      recentSessions: sessions
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// New password update method
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const EmployeeId = req.user.employee_id; // From JWT middleware

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Current password, new password, and confirm password are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'New password and confirm password do not match' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Get current user
    const user = await User.findByEmployeeId(EmployeeId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidCurrentPassword = await User.validatePassword(currentPassword, user.password_hash);
    if (!isValidCurrentPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is different from current
    const isSamePassword = await User.validatePassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Update password
    const success = await User.updatePassword(user.id, newPassword);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    // Log the password change (optional)
    console.log(`Password updated for Employee ID: ${EmployeeId} at ${new Date().toISOString()}`);

    res.json({ 
      message: 'Password updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin method to reset user password to default
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    // Check if the requesting user has admin permissions
    let permissions = [];
    try {
      permissions = typeof adminUser.permissions === 'string' 
        ? JSON.parse(adminUser.permissions) 
        : adminUser.permissions || [];
    } catch (e) {
      permissions = [];
    }

    if (!permissions.includes('all') && !permissions.includes('user_management')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Reset password to default
    const success = await User.resetPasswordToDefault(userId);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to reset password' });
    }

    // Get user details for logging
    const user = await User.findById(userId);
    console.log(`Password reset to default for user: ${user.employee_id} by admin: ${adminUser.employee_id}`);

    res.json({ 
      message: 'Password reset to default successfully',
      defaultPasswordFormat: 'employee_id@joining_date'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Method to change password (for first-time login or forced password change)
const changePassword = async (req, res) => {
  try {
    const { employeeId, currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!employeeId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'New password and confirm password do not match' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Find user
    const user = await User.findByEmployeeId(employeeId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidCurrentPassword = await User.validatePassword(currentPassword, user.password_hash);
    if (!isValidCurrentPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    const success = await User.updatePassword(user.id, newPassword);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to change password' });
    }

    res.json({ 
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { 
  login, 
  logout, 
  getProfile, 
  updatePassword, 
  resetUserPassword, 
  changePassword 
};