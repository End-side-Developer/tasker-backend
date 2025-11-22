const cliqService = require('../services/cliqService');
const logger = require('../config/logger');

/**
 * Cliq Controller - Handles Cliq-specific operations
 */
class CliqController {
  /**
   * Link Cliq user to Tasker account
   * POST /api/cliq/link-user
   */
  async linkUser(req, res, next) {
    try {
      const { cliqUserId, cliqUserName, taskerUserId } = req.body;

      if (!cliqUserId || !taskerUserId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cliq user ID and Tasker user ID are required' },
        });
      }

      await cliqService.createUserMapping(cliqUserId, cliqUserName, taskerUserId);

      res.json({
        success: true,
        message: 'User linked successfully',
      });
    } catch (error) {
      logger.error('Error in linkUser controller:', error);
      next(error);
    }
  }

  /**
   * Handle incoming webhook from Cliq
   * POST /api/cliq/webhook
   */
  async handleWebhook(req, res, next) {
    try {
      const payload = req.body;
      logger.info('Received webhook from Cliq', { event: payload.event });

      // Process webhook based on event type
      // This will be expanded based on requirements

      res.json({
        success: true,
        message: 'Webhook received',
      });
    } catch (error) {
      logger.error('Error in handleWebhook controller:', error);
      next(error);
    }
  }

  /**
   * Get user mapping status
   * GET /api/cliq/user/:cliqUserId
   */
  async getUserMapping(req, res, next) {
    try {
      const { cliqUserId } = req.params;
      const taskerUserId = await cliqService.mapCliqUserToTasker(cliqUserId);

      res.json({
        success: true,
        linked: !!taskerUserId,
        taskerUserId,
      });
    } catch (error) {
      logger.error('Error in getUserMapping controller:', error);
      next(error);
    }
  }
}

module.exports = new CliqController();
