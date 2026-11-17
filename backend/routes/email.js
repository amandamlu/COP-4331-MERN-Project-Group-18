const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const { getForwardingAddress } = require('../controllers/emailForwardingController');

const router = express.Router();

router.get('/forwarding-address', verifyToken, getForwardingAddress);

module.exports = router;
