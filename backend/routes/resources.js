const express = require('express'); 
const {getResources} = require('../controllers/resourceController'); 

const router = express.Router();

const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, getResources); 

module.exports = router; 