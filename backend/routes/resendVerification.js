const express = require('express'); 
const router = express.Router(); 

const {resendVerification} = require('../controllers/resendVerificationController');

router.post('/', resendVerification); 

module.exports = router; 
