const express = require('express');
const { receiveEmail } = require('../controllers/emailWebhookController');

const router = express.Router();

router.post('/', express.raw({ type: 'application/json', inflate: false }), receiveEmail);

module.exports = router;
