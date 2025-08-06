// routes/auth.js
const express = require('express');
const { login, logout, getProfile, updatePassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', auth, logout);
router.get('/profile', auth, getProfile);
router.post('/update-password', auth, updatePassword);

module.exports = router;