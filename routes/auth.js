// routes/auth.js
const express = require('express');
const { login, logout, getProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', auth, logout);
router.get('/profile', auth, getProfile);

module.exports = router;