const cliqService = require('../services/cliqService');
const logger = require('../config/logger');
const { db } = require('../config/firebase');
const crypto = require('crypto');

/**
 * Cliq Controller - Handles Cliq-specific operations
 */
class CliqController {
  /**
   * Generate a linking code for Flutter app
   * POST /api/cliq/bot/generate-link-code
   */
  async generateLinkCode(req, res, next) {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and email are required' },
        });
      }

      // Generate a 6-character alphanumeric code
      const code = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Store the code in Firestore with 10-minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await db.collection('cliq_linking_codes').doc(code).set({
        code,
        tasker_user_id: userId,
        tasker_email: email,
        created_at: new Date(),
        expires_at: expiresAt,
        used: false,
      });

      logger.info(`Generated linking code ${code} for user ${userId}`);

      res.json({
        success: true,
        data: {
          code,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error in generateLinkCode controller:', error);
      next(error);
    }
  }

  /**
   * Unlink Cliq account from Flutter app
   * POST /api/cliq/bot/unlink
   */
  async unlinkAccount(req, res, next) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' },
        });
      }

      // Find and deactivate the user mapping
      const mappingsRef = db.collection('cliq_user_mappings');
      const snapshot = await mappingsRef
        .where('tasker_user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      if (snapshot.empty) {
        return res.json({
          success: true,
          message: 'No active Cliq link found',
        });
      }

      // Deactivate all active mappings for this user
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          is_active: false,
          unlinked_at: new Date(),
        });
      });
      await batch.commit();

      logger.info(`Unlinked Cliq account for user ${userId}`);

      res.json({
        success: true,
        message: 'Cliq account unlinked successfully',
      });
    } catch (error) {
      logger.error('Error in unlinkAccount controller:', error);
      next(error);
    }
  }

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
