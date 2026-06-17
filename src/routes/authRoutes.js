const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// PUT /api/auth/profile
router.put('/profile', authController.updateProfile);

module.exports = router;
