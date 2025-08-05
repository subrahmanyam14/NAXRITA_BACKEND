// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginSession = require('../models/LoginSession');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is still active
    const session = await LoginSession.getActiveSession(token);
    if (!session) {
      return res.status(401).json({ message: 'Session expired or invalid.' });
    }

    const user = await User.findById(decoded.user_id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const authorize = (permissions) => {
  return (req, res, next) => {
    const userPermissions = JSON.parse(req.user.permissions || '[]');
    
    if (userPermissions.includes('all')) {
      return next();
    }

    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = { auth, authorize };
