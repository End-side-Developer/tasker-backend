const logger = require('../config/logger');

/**
 * Cliq Service - Handles Zoho Cliq integrations
 */
class CliqService {
  constructor() {
    this._db = null;
  }

  get db() {
    if (!this._db) {
      const { admin } = require('../config/firebase');
      this._db = admin.firestore();
    }
    return this._db;
  }
  /**
   * Map Cliq user to Tasker user
   * Only returns a user ID if there is an ACTIVE explicit mapping
   * Does NOT fall back to email - user must be explicitly linked
   */
  async mapCliqUserToTasker(cliqUserId, email = null) {
    try {
      const doc = await this.db.collection('cliq_user_mappings').doc(cliqUserId).get();

      if (!doc.exists) {
        logger.warn('Cliq user mapping not found', { cliqUserId });
        return null;
      }

      const mappingData = doc.data();
      
      // Check if the mapping is active (not unlinked)
      if (mappingData.is_active === false) {
        logger.info('Cliq user mapping exists but is inactive (unlinked)', { cliqUserId });
        return null;
      }

      return mappingData.tasker_user_id;
    } catch (error) {
      logger.error('Error mapping Cliq user:', error);
      throw error;
    }
  }

  /**
   * Get full user mapping details including linked date
   * Returns null if not linked, or full mapping object if linked
   */
  async getUserMappingDetails(cliqUserId) {
    try {
      const doc = await this.db.collection('cliq_user_mappings').doc(cliqUserId).get();

      if (!doc.exists) {
        return null;
      }

      const mappingData = doc.data();
      
      // Check if the mapping is active (not unlinked)
      if (mappingData.is_active === false) {
        return null;
      }

      // Format linkedAt date if it exists
      let linkedAt = null;
      if (mappingData.linked_at) {
        // Handle Firestore Timestamp
        const timestamp = mappingData.linked_at._seconds 
          ? new Date(mappingData.linked_at._seconds * 1000)
          : mappingData.linked_at.toDate ? mappingData.linked_at.toDate() : new Date(mappingData.linked_at);
        linkedAt = timestamp.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      }

      // Fetch user details from users collection to get email
      let taskerEmail = null;
      let taskerDisplayName = null;
      if (mappingData.tasker_user_id) {
        const userDoc = await this.db.collection('users').doc(mappingData.tasker_user_id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          taskerEmail = userData.email || null;
          taskerDisplayName = userData.displayName || userData.name || null;
        }
      }

      return {
        taskerId: mappingData.tasker_user_id,
        cliqUserName: mappingData.cliq_user_name,
        linkedAt: linkedAt,
        isActive: mappingData.is_active !== false,
        taskerEmail: taskerEmail,
        taskerDisplayName: taskerDisplayName,
      };
    } catch (error) {
      logger.error('Error getting user mapping details:', error);
      throw error;
    }
  }

  /**
   * Create Cliq user mapping
   */
  async createUserMapping(cliqUserId, cliqUserName, taskerUserId) {
    try {
      const { admin } = require('../config/firebase');
      await this.db.collection('cliq_user_mappings').doc(cliqUserId).set({
        cliq_user_id: cliqUserId,
        cliq_user_name: cliqUserName,
        tasker_user_id: taskerUserId,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        linked_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('Cliq user mapping created', { cliqUserId, taskerUserId });
      return { success: true };
    } catch (error) {
      logger.error('Error creating user mapping:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use code-based linking via cliqController.linkWithCode instead
   * Link Cliq user to Tasker account by email - INSECURE
   * Anyone could link any email without verification
   * Kept for reference only
   */
  async linkCliqUser(cliqUserId, cliqUserName, taskerEmail) {
    // This method is deprecated - use the secure 3-step verification flow
    logger.warn('DEPRECATED: linkCliqUser called - use code-based linking instead');
    return {
      success: false,
      error: 'Email-based linking is deprecated. Please use the secure code-based flow from the Tasker app.',
    };
  }

  /**
   * Store Cliq task mapping
   */
  async storeTaskMapping(taskId, cliqContext) {
    try {
      const { admin } = require('../config/firebase');
      
      // Build mapping data, only including defined values
      const mappingData = {
        task_id: taskId,
        cliq_user_id: cliqContext.userId || null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Only add optional fields if they exist
      if (cliqContext.channelId) {
        mappingData.cliq_channel_id = cliqContext.channelId;
      }
      if (cliqContext.messageId) {
        mappingData.cliq_message_id = cliqContext.messageId;
      }
      if (cliqContext.source) {
        mappingData.source = cliqContext.source;
      }
      
      await this.db.collection('cliq_task_mappings').doc(taskId).set(mappingData);

      logger.info('Cliq task mapping stored', { taskId });
      return { success: true };
    } catch (error) {
      logger.error('Error storing task mapping:', error);
      throw error;
    }
  }

  /**
   * Send webhook to Cliq
   */
  async sendWebhook(payload) {
    try {
      const axios = require('axios');
      const webhookUrl = process.env.CLIQ_WEBHOOK_URL;

      if (!webhookUrl) {
        logger.warn('Cliq webhook URL not configured');
        return { success: false };
      }

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info('Webhook sent to Cliq', { event: payload.event });
      return { success: true, response: response.data };
    } catch (error) {
      logger.error('Error sending webhook to Cliq:', error);
      throw error;
    }
  }

  /**
   * Get Tasker email for a given Cliq email
   * If the Cliq user has linked their account, returns the Tasker email
   * Otherwise returns null (caller should use the original Cliq email)
   * 
   * @param {string} cliqEmail - The email from Zoho Cliq
   * @returns {Promise<{taskerEmail: string|null, taskerId: string|null, isLinked: boolean}>}
   */
  async getTaskerEmailByCliqEmail(cliqEmail) {
    try {
      if (!cliqEmail) {
        return { taskerEmail: null, taskerId: null, isLinked: false };
      }

      // Query cliq_user_mappings where cliq_user_email matches
      const mappingSnapshot = await this.db.collection('cliq_user_mappings')
        .where('cliq_user_email', '==', cliqEmail.toLowerCase())
        .where('is_active', '==', true)
        .limit(1)
        .get();

      if (mappingSnapshot.empty) {
        logger.debug('No linked Tasker account found for Cliq email', { cliqEmail });
        return { taskerEmail: null, taskerId: null, isLinked: false };
      }

      const mappingData = mappingSnapshot.docs[0].data();
      
      logger.info('Found linked Tasker account for Cliq email', { 
        cliqEmail, 
        taskerEmail: mappingData.tasker_email 
      });

      return {
        taskerEmail: mappingData.tasker_email || null,
        taskerId: mappingData.tasker_user_id || null,
        isLinked: true
      };
    } catch (error) {
      logger.error('Error looking up Tasker email by Cliq email:', error);
      return { taskerEmail: null, taskerId: null, isLinked: false };
    }
  }

  /**
   * Format task card for Cliq
   */
  formatTaskCard(task) {
    const emoji = this._getTaskEmoji(task.priority);
    const dueText = task.dueDate ? `Due: ${this._formatDate(task.dueDate)}` : 'No due date';

    return {
      theme: this._getThemeColor(task.priority),
      title: `${emoji} ${task.title}`,
      subtitle: dueText,
      buttons: [
        {
          label: 'View Details',
          action: 'view_task',
          actionData: { taskId: task.id },
        },
        {
          label: 'Mark Complete',
          action: 'complete_task',
          actionData: { taskId: task.id },
        },
      ],
      data: {
        taskId: task.id,
        status: task.status,
        priority: task.priority,
      },
    };
  }

  _getTaskEmoji(priority) {
    const emojiMap = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emojiMap[priority] || '📋';
  }

  _getThemeColor(priority) {
    const colorMap = {
      urgent: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green',
    };
    return colorMap[priority] || 'gray';
  }

  _formatDate(timestamp) {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = taskDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;

    return date.toLocaleDateString();
  }
}

module.exports = new CliqService();
