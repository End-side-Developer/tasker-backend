const cliqService = require('../services/cliqService');
const logger = require('../config/logger');
const { admin } = require('../config/firebase');
const crypto = require('crypto');

// Lazy-loaded Firestore instance
let _db = null;
const getDb = () => {
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
};

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
      
      await getDb().collection('cliq_linking_codes').doc(code).set({
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
      const mappingsRef = getDb().collection('cliq_user_mappings');
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
      const batch = getDb().batch();
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
   * Link Cliq account using a code from Flutter app
   * POST /api/cliq/link-with-code
   */
  async linkWithCode(req, res, next) {
    try {
      const { code, cliqUserId, cliqUserName, cliqUserEmail } = req.body;

      if (!code || !cliqUserId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Code and Cliq user ID are required' },
        });
      }

      // Look up the code in Firestore
      const codeDoc = await getDb().collection('cliq_linking_codes').doc(code.toUpperCase()).get();

      if (!codeDoc.exists) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid linking code. Please generate a new code from the Tasker app.' },
        });
      }

      const codeData = codeDoc.data();

      // Check if code is expired
      const expiresAt = codeData.expires_at.toDate ? codeData.expires_at.toDate() : new Date(codeData.expires_at);
      if (new Date() > expiresAt) {
        // Delete expired code
        await codeDoc.ref.delete();
        return res.status(400).json({
          success: false,
          error: { message: 'This code has expired. Please generate a new code from the Tasker app.' },
        });
      }

      // Check if code is already used
      if (codeData.used) {
        return res.status(400).json({
          success: false,
          error: { message: 'This code has already been used. Please generate a new code.' },
        });
      }

      // Check if this Cliq user is already linked
      const existingMapping = await getDb().collection('cliq_user_mappings')
        .where('cliq_user_id', '==', cliqUserId)
        .where('is_active', '==', true)
        .get();

      if (!existingMapping.empty) {
        return res.status(400).json({
          success: false,
          error: { message: 'This Cliq account is already linked to a Tasker account. Unlink first to link to a different account.' },
        });
      }

      // Create the user mapping
      const mappingId = `${cliqUserId}_${codeData.tasker_user_id}`;
      await getDb().collection('cliq_user_mappings').doc(mappingId).set({
        cliq_user_id: cliqUserId,
        cliq_user_name: cliqUserName || 'Unknown',
        cliq_user_email: cliqUserEmail || null,
        tasker_user_id: codeData.tasker_user_id,
        tasker_email: codeData.tasker_email,
        linked_at: new Date(),
        is_active: true,
      });

      // Mark the code as used
      await codeDoc.ref.update({
        used: true,
        used_at: new Date(),
        used_by_cliq_user: cliqUserId,
      });

      logger.info(`Linked Cliq user ${cliqUserId} to Tasker user ${codeData.tasker_user_id}`);

      res.json({
        success: true,
        message: 'Account linked successfully',
        data: {
          taskerUserId: codeData.tasker_user_id,
          taskerEmail: codeData.tasker_email,
        },
      });
    } catch (error) {
      logger.error('Error in linkWithCode controller:', error);
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
