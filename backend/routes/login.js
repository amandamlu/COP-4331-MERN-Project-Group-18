const express = require('express');
const { logIn, getCurrentUser } = require('../controllers/loginController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// Mounted at /api/auth in server.js
router.post('/login', logIn);                    // POST /api/auth/login
router.get('/me', verifyToken, getCurrentUser);  // GET  /api/auth/me

module.exports = router;