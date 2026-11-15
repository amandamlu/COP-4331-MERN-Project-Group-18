const express = require('express'); 
const router = express.Router(); 

const verifyToken = require('../middleware/verifyToken'); 
const {getAllContacts} = require('../controllers/contactController'); 

router.use(verifyToken); 

// GET /api/contacts
router.get('/', getAllContacts);

module.exports = router; 