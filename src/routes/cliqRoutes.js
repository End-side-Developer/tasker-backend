const express = require('express');
const router = express.Router();
const cliqController = require('../controllers/cliqController');

/**
 * Cliq Routes
 */

// Link user
router.post('/link-user', cliqController.linkUser);

// Handle webhook
router.post('/webhook', cliqController.handleWebhook);

// Get user mapping
router.get('/user/:cliqUserId', cliqController.getUserMapping);

module.exports = router;
