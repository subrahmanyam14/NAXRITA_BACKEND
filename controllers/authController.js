// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginSession = require('../models/LoginSession');

const generateToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
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
      return res.status(400).json({ message: 'employeeId and password are required' });
    }

    const user = await User.findByEmployeeId(employeeId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({user_id: user.id, individual_data_id: user.individual_data_id, employee_id: user.employee_id});
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

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        individual_data_id: user.individual_data_id,
        email: user.email,
        role: user.role_name,
        permissions: user.permissions || '[]'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    await LoginSession.updateLogout(req.sessionToken);
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

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions: user.permissions || '[]'
      },
      recentSessions: sessions
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { login, logout, getProfile };
