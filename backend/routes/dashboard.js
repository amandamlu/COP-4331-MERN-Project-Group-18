const express = require('express'); 
const router = express.Router(); 

const verifyToken = require('../middleware/verifyToken'); 

const {
    getUpcomingFollowUps
} = require('../controllers/dashboardController'); 

// All dashboard routes require authentication 
router.use(verifyToken); 

// GET /api/dashboard/followups
router.get('/followups', getUpcomingFollowUps); 

module.exports = router; 