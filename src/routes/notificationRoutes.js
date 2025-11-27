/**
 * Notification Routes - Notification preferences and management
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

/**
 * Get notification settings
 * GET /api/cliq/notifications/settings
 * Query: { userId, userEmail }
 */
router.get('/settings', notificationController.getSettings);

/**
 * Update notification settings
 * PUT /api/cliq/notifications/settings
 * Body: { userId, userEmail, settings }
 */
router.put('/settings', notificationController.updateSettings);

/**
 * Mute/unmute a specific project
 * POST /api/cliq/notifications/mute-project
 * Body: { userId, userEmail, projectId, muted }
 */
router.post('/mute-project', notificationController.muteProject);

/**
 * Enable Do Not Disturb mode
 * POST /api/cliq/notifications/dnd
 * Body: { userId, userEmail, enabled, durationHours? }
 */
router.post('/dnd', notificationController.setDoNotDisturb);

/**
 * Get notification history
 * GET /api/cliq/notifications/history
 * Query: { userId, userEmail, limit?, after? }
 */
router.get('/history', notificationController.getHistory);

/**
 * Send a notification to a user (from Flutter app)
 * POST /api/cliq/notifications/send
 * Body: { userId, type, data }
 */
router.post('/send', notificationController.sendNotification);

/**
 * Test webhook - sends a test notification to Cliq
 * POST /api/cliq/notifications/test
 * Body: { message? }
 */
router.post('/test', notificationController.testWebhook);

module.exports = router;
