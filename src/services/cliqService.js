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
   */
  async mapCliqUserToTasker(cliqUserId) {
    try {
      const doc = await this.db.collection('cliq_user_mappings').doc(cliqUserId).get();

      if (!doc.exists) {
        logger.warn('Cliq user mapping not found', { cliqUserId });
        return null;
      }

      return doc.data().tasker_user_id;
    } catch (error) {
      logger.error('Error mapping Cliq user:', error);
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
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('Cliq user mapping created', { cliqUserId, taskerUserId });
      return { success: true };
    } catch (error) {
      logger.error('Error creating user mapping:', error);
      throw error;
    }
  }

  /**
   * Store Cliq task mapping
   */
  async storeTaskMapping(taskId, cliqContext) {
    try {
      const { admin } = require('../config/firebase');
      await this.db.collection('cliq_task_mappings').doc(taskId).set({
        task_id: taskId,
        cliq_user_id: cliqContext.userId,
        cliq_channel_id: cliqContext.channelId,
        cliq_message_id: cliqContext.messageId,
        source: cliqContext.source,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

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
      high: '🔥',
      medium: '📋',
      low: '📝',
    };
    return emojiMap[priority] || '✅';
  }

  _getThemeColor(priority) {
    const colorMap = {
      high: 'red',
      medium: 'orange',
      low: 'blue',
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
