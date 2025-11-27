const express = require('express');
const router = express.Router();
const cliqController = require('../controllers/cliqController');

/**
 * Cliq Routes
 */

// Bot routes (called from Flutter app)
router.post('/bot/generate-link-code', cliqController.generateLinkCode);
router.post('/bot/unlink', cliqController.unlinkAccount);

// Link user (called from Cliq command)
router.post('/link-user', cliqController.linkUser);

// Handle webhook
router.post('/webhook', cliqController.handleWebhook);

// Get user mapping
router.get('/user/:cliqUserId', cliqController.getUserMapping);

module.exports = router;
