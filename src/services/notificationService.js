const { admin } = require('../config/firebase');
const logger = require('../config/logger');

class NotificationService {
  constructor() {
    this._messaging = null;
    this._firestore = null;
  }

  get messaging() {
    if (!this._messaging) {
      this._messaging = admin.messaging();
    }
    return this._messaging;
  }

  get firestore() {
    if (!this._firestore) {
      this._firestore = admin.firestore();
    }
    return this._firestore;
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      logger.info(`[Notification] Sending to user: ${userId}`);

      // Get user's FCM tokens from Firestore
      const tokensSnapshot = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('fcmTokens')
        .get();

      if (tokensSnapshot.empty) {
        logger.warn(`[Notification] No FCM tokens found for user: ${userId}`);
        return {
          success: false,
          error: 'User has no FCM tokens registered',
        };
      }

      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
      logger.info(`[Notification] Found ${tokens.length} token(s) for user: ${userId}`);

      // Prepare the message
      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens: tokens,
        android: {
          priority: 'high',
          notification: {
            channelId: 'tasker_notifications',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      // Send the notification
      const response = await this.messaging.sendEachForMulticast(message);

      logger.info(
        `[Notification] Sent successfully: ${response.successCount}/${tokens.length}`
      );

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this._cleanupInvalidTokens(userId, tokens, response.responses);
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length,
      };
    } catch (error) {
      logger.error('[Notification] Send error:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(userIds, title, body, data = {}) {
    try {
      logger.info(`[Notification] Sending to ${userIds.length} users`);

      const results = await Promise.allSettled(
        userIds.map(userId => this.sendToUser(userId, title, body, data))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(
        `[Notification] Batch send completed: ${successful} succeeded, ${failed} failed`
      );

      return {
        success: true,
        successCount: successful,
        failureCount: failed,
        total: userIds.length,
      };
    } catch (error) {
      logger.error('[Notification] Batch send error:', error);
      throw error;
    }
  }

  /**
   * Remove invalid FCM tokens
   */
  async _cleanupInvalidTokens(userId, tokens, responses) {
    try {
      const invalidTokens = [];

      responses.forEach((response, index) => {
        if (!response.success) {
          const error = response.error;
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      if (invalidTokens.length === 0) return;

      logger.info(
        `[Notification] Cleaning up ${invalidTokens.length} invalid token(s) for user: ${userId}`
      );

      // Remove invalid tokens from Firestore
      const batch = this.firestore.batch();
      const tokensCollection = this.firestore
        .collection('users')
        .doc(userId)
        .collection('fcmTokens');

      for (const token of invalidTokens) {
        const tokenDocs = await tokensCollection.where('token', '==', token).get();
        tokenDocs.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      logger.info('[Notification] Invalid tokens removed successfully');
    } catch (error) {
      logger.error('[Notification] Token cleanup error:', error);
      // Don't throw - cleanup is non-critical
    }
  }
}

module.exports = new NotificationService();
