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

// NOTE: Old email-based linking removed for security
// Use /api/cliq/link-with-code instead (requires code from Tasker app)

/**
 * Get user link status
 * GET /api/cliq/bot/user/:cliqUserId
 */
router.get('/user/:cliqUserId', botController.getUserLinkStatus);

/**
 * Get user's projects for form dropdown
 * GET /api/cliq/bot/projects
 * Query: { userId, userEmail }
 */
router.get('/projects', botController.getUserProjects);

/**
 * Update task (from Cliq form)
 * POST /api/cliq/bot/update-task
 * Body: { taskId, userId, userEmail, dueDate?, priority?, description? }
 */
router.post('/update-task', botController.updateTask);

module.exports = router;
