const express = require('express'); 
const { updateProfile, changePassword, deleteProfile } = require('../controllers/userController'); 
const verifyToken = require('../middleware/verifyToken'); 

const router = express.Router(); 

// PATCH /api/users/me (Update Profile)
router.patch('/me', verifyToken, updateProfile); 

// PATCH /api/users/me/password (Change Password)
router.patch('/me/password', verifyToken, changePassword); 

// DELETE /api/users/me (Delete User)
router.delete('/me', verifyToken, deleteProfile); 

module.exports = router; 