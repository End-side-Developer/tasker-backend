/**
 * Bot Routes - TaskerBot API endpoints
 */

const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

/**
 * Bot message processing
 * POST /api/cliq/bot/message
 * Body: { message, userId, userEmail, userName, context, channelId?, channelName? }
 */
router.post('/message', botController.processMessage);

/**
 * Get daily briefing
 * GET /api/cliq/bot/briefing
 * Query: { userId, userEmail }
 */
router.get('/briefing', botController.getDailyBriefing);

/**
 * Handle context actions (button clicks, task actions)
 * POST /api/cliq/bot/context
 * Body: { action, taskId, userId, userEmail }
 */
router.post('/context', botController.handleContext);

/**
 * Handle channel unlink notification
 * POST /api/cliq/bot/channel-unlink
 * Body: { channelId, channelName }
 */
router.post('/channel-unlink', botController.handleChannelUnlink);

module.exports = router;
