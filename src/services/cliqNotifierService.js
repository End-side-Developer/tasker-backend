/**
 * Cliq Notifier Service
 * 
 * Handles sending notifications to Zoho Cliq via webhooks
 * 
 * Webhook URL formats (per official docs):
 * - Bot Incoming: https://cliq.zoho.com/api/v2/bots/{bot-unique-name}/incoming?zapikey={token}
 * - Bot Message: https://cliq.zoho.com/api/v2/bots/{bot-unique-name}/message?zapikey={token}
 * - Channel: https://cliq.zoho.com/api/v2/channelsbyname/{channel-name}/message?zapikey={token}
 * 
 * Base URLs (from Cliq UI - these are WITHOUT the zapikey):
 * - API Endpoint: https://cliq.zoho.com/api/v2/bots/taskerbot/message
 * - Incoming Webhook: https://cliq.zoho.com/api/v2/bots/taskerbot/incoming
 * - Alert API: https://cliq.zoho.com/api/v2/bots/taskerbot/calls
 */

const axios = require('axios');
const logger = require('../config/logger');

class CliqNotifierService {
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
   * Get Cliq configuration from environment
   */
  getConfig() {
    return {
      webhookToken: process.env.CLIQ_WEBHOOK_TOKEN,
      botName: process.env.CLIQ_BOT_UNIQUE_NAME || 'taskerbot'
    };
  }

  /**
   * Build webhook URL based on target type
   */
  buildWebhookUrl(targetType, targetId = null) {
    const config = this.getConfig();
    const token = config.webhookToken;
    const botName = config.botName;

    if (!token) {
      logger.error('CLIQ_WEBHOOK_TOKEN not configured');
      return null;
    }

    switch (targetType) {
      case 'bot':
        return `https://cliq.zoho.com/api/v2/bots/${botName}/incoming?zapikey=${token}`;
      case 'bot_message':
        return `https://cliq.zoho.com/api/v2/bots/${botName}/message?zapikey=${token}`;
      case 'channel':
        if (!targetId) {
          logger.error('Channel name required for channel webhook');
          return null;
        }
        return `https://cliq.zoho.com/api/v2/channelsbyname/${targetId}/message?zapikey=${token}`;
      default:
        return `https://cliq.zoho.com/api/v2/bots/${botName}/incoming?zapikey=${token}`;
    }
  }

  /**
   * Send notification to a specific user via Cliq
   */
  async notifyUser(userId, notification) {
    try {
      const mapping = await this.getCliqMapping(userId);
      if (!mapping || !mapping.cliq_user_id) {
        logger.debug(`No Cliq mapping for user: ${userId}`);
        return { success: false, reason: 'no_mapping' };
      }

      const prefs = await this.getUserPreferences(userId);
      if (!this.shouldNotify(prefs, notification.type)) {
        logger.debug(`User ${userId} has disabled ${notification.type} notifications`);
        return { success: false, reason: 'disabled_by_user' };
      }

      const message = this.formatNotification(notification);
      const payload = {
        ...message,
        target_user: {
          id: mapping.cliq_user_id,
          tasker_id: userId
        },
        notification_type: notification.type
      };

      await this.sendToCliq(payload, 'bot');
      await this.logNotification(userId, notification);

      return { success: true };
    } catch (error) {
      logger.error('Error notifying user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to a project channel
   */
  async notifyProjectChannel(projectId, notification) {
    try {
      const channel = await this.getProjectChannel(projectId);
      if (!channel || !channel.channelName) {
        logger.debug(`No Cliq channel linked for project: ${projectId}`);
        return { success: false, reason: 'no_channel' };
      }

      const message = this.formatNotification(notification);
      await this.sendToCliq(message, 'channel', channel.channelName);

      return { success: true };
    } catch (error) {
      logger.error('Error notifying channel:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to Cliq via webhook
   */
  async sendToCliq(payload, targetType = 'bot', targetId = null) {
    const webhookUrl = this.buildWebhookUrl(targetType, targetId);

    if (!webhookUrl) {
      logger.warn('Cliq webhook URL not configured');
      return { success: false, reason: 'no_webhook_url' };
    }

    try {
      logger.info(`Sending to Cliq (${targetType}): ${webhookUrl.split('?')[0]}...`);

      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      logger.info('Cliq notification sent:', response.status);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Cliq webhook error:', error.message);

      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response data:', JSON.stringify(error.response.data));
      }

      // Retry once on server errors
      if (error.response && error.response.status >= 500) {
        logger.info('Retrying webhook...');
        await this.delay(1000);

        const retryResponse = await axios.post(webhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        return { success: true, data: retryResponse.data, retried: true };
      }

      throw error;
    }
  }

  /**
   * Format notification based on type
   */
  formatNotification(notification) {
    const formatters = {
      task_assigned: this.formatTaskAssigned.bind(this),
      task_completed: this.formatTaskCompleted.bind(this),
      task_due_soon: this.formatTaskDueSoon.bind(this),
      task_overdue: this.formatTaskOverdue.bind(this),
      task_created: this.formatTaskCreated.bind(this),
      task_updated: this.formatTaskUpdated.bind(this),
      task_deleted: this.formatTaskDeleted.bind(this),
      comment_added: this.formatCommentAdded.bind(this),
      project_created: this.formatProjectCreated.bind(this),
      project_invite: this.formatProjectInvite.bind(this),
      member_joined: this.formatMemberJoined.bind(this),
      member_left: this.formatMemberLeft.bind(this)
    };

    const formatter = formatters[notification.type];
    if (!formatter) {
      logger.warn(`Unknown notification type: ${notification.type}`);
      return { text: '🔔 Notification from Tasker' };
    }

    return formatter(notification);
  }

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATION FORMATTERS
  // ═══════════════════════════════════════════════════════════════════

  formatTaskAssigned(notification) {
    const { task, assignedBy } = notification;
    const priorityIcon = this.getPriorityIcon(task.priority);

    return {
      text: `📋 New task assigned to you!`,
      card: { title: `${priorityIcon} ${task.title}`, theme: 'modern-inline' },
      slides: [
        { type: 'text', title: 'Description', data: task.description || 'No description' },
        { type: 'label', title: 'Details', data: [
          { 'Priority': this.getPriorityText(task.priority) },
          { 'Due': this.formatDate(task.dueDate) }
        ]}
      ],
      buttons: [
        { label: '👁 View Task', type: '+', action: { type: 'open.url', data: { web: `tasker://task/${task.id}` }}},
        { label: '✓ Complete', type: '+', action: { type: 'invoke.function', data: { name: 'completeTaskFromNotification', taskId: task.id }}}
      ]
    };
  }

  formatTaskCompleted(notification) {
    const { task, completedBy } = notification;
    return {
      text: `✅ Task completed!`,
      card: { title: `✅ ${task.title}`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: `Completed by ${completedBy || 'a team member'}` }]
    };
  }

  formatTaskDueSoon(notification) {
    const { task, hoursUntilDue } = notification;
    let urgencyIcon = hoursUntilDue <= 1 ? '⚠️' : hoursUntilDue <= 3 ? '⏰' : '📅';
    let urgencyText = hoursUntilDue <= 1 ? 'Due in less than 1 hour!' : `Due in ${hoursUntilDue} hours`;

    return {
      text: `${urgencyIcon} ${urgencyText}`,
      card: { title: `${urgencyIcon} ${task.title}`, theme: 'modern-inline' },
      buttons: [
        { label: '👁 View', type: '+', action: { type: 'open.url', data: { web: `tasker://task/${task.id}` }}},
        { label: '✓ Complete Now', type: '+', action: { type: 'invoke.function', data: { name: 'completeTaskFromNotification', taskId: task.id }}},
        { label: '⏰ Snooze 1h', type: '+', action: { type: 'invoke.function', data: { name: 'snoozeReminder', taskId: task.id, hours: 1 }}}
      ]
    };
  }

  formatTaskOverdue(notification) {
    const { task, daysOverdue } = notification;
    return {
      text: `🔥 Task is ${daysOverdue} day(s) overdue!`,
      card: { title: `🔥 OVERDUE: ${task.title}`, theme: 'modern-inline' },
      slides: [{ type: 'label', data: [
        { 'Originally Due': this.formatDate(task.dueDate) },
        { 'Days Overdue': daysOverdue.toString() }
      ]}],
      buttons: [
        { label: '✓ Complete Now', type: '+', action: { type: 'invoke.function', data: { name: 'completeTaskFromNotification', taskId: task.id }}},
        { label: '📅 Extend Deadline', type: '+', action: { type: 'invoke.function', data: { name: 'extendDeadline', taskId: task.id }}}
      ]
    };
  }

  formatTaskCreated(notification) {
    const { task, createdBy } = notification;
    return {
      text: `📋 New task created in project`,
      card: { title: `${this.getPriorityIcon(task.priority)} ${task.title}`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: `Created by ${createdBy || 'a team member'}` }]
    };
  }

  formatTaskUpdated(notification) {
    const { task, changes } = notification;
    let changesText = changes?.length > 0 ? `Updated: ${changes.join(', ')}` : 'Task was updated';
    return {
      text: `📝 Task updated: ${task.title}`,
      card: { title: `📝 ${task.title}`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: changesText }]
    };
  }

  formatTaskDeleted(notification) {
    const { task, deletedBy } = notification;
    return {
      text: `🗑️ Task deleted: ${task.title}`,
      card: { title: `🗑️ ${task.title}`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: `Deleted by ${deletedBy || 'a team member'}` }]
    };
  }

  formatCommentAdded(notification) {
    const { task, comment, author } = notification;
    const preview = comment.text?.substring(0, 150) + (comment.text?.length > 150 ? '...' : '');
    return {
      text: `💬 New comment on "${task.title}"`,
      card: { title: `💬 ${author || 'Someone'} commented`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: preview }],
      buttons: [
        { label: '👁 View Task', type: '+', action: { type: 'open.url', data: { web: `tasker://task/${task.id}` }}},
        { label: '💬 Reply', type: '+', action: { type: 'invoke.function', data: { name: 'replyToComment', taskId: task.id }}}
      ]
    };
  }

  formatProjectCreated(notification) {
    const { project } = notification;
    return {
      text: `📁 New project created!`,
      card: { title: `📁 ${project.name}`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: project.description || 'No description' }]
    };
  }

  formatProjectInvite(notification) {
    const { project, invitedBy, role } = notification;
    return {
      text: `📨 You've been invited to join a project!`,
      card: { title: `📁 ${project.name}`, theme: 'modern-inline' },
      slides: [
        { type: 'text', data: `Invited by ${invitedBy} as ${role || 'member'}` },
        { type: 'text', data: project.description || 'No description' }
      ],
      buttons: [
        { label: '✓ Accept', type: '+', action: { type: 'invoke.function', data: { name: 'acceptProjectInvite', projectId: project.id }}},
        { label: '✗ Decline', type: '-', action: { type: 'invoke.function', data: { name: 'declineProjectInvite', projectId: project.id }}}
      ]
    };
  }

  formatMemberJoined(notification) {
    const { project, member } = notification;
    return {
      text: `👋 New member joined ${project.name}`,
      card: { title: `👋 ${member.name || member.email} joined`, theme: 'modern-inline' },
      slides: [{ type: 'text', data: `Joined as ${member.role || 'member'}` }]
    };
  }

  formatMemberLeft(notification) {
    const { project, member } = notification;
    return {
      text: `👋 Member left ${project.name}`,
      card: { title: `👋 ${member.name || member.email} left`, theme: 'modern-inline' }
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  async getCliqMapping(userId) {
    const snapshot = await this.db.collection('cliq_user_mappings')
      .where('tasker_user_id', '==', userId)
      .limit(1)
      .get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async getUserPreferences(userId) {
    const doc = await this.db.collection('users').doc(userId)
      .collection('settings').doc('notifications').get();
    return doc.exists ? doc.data() : this.getDefaultPreferences();
  }

  getDefaultPreferences() {
    return {
      enabled: true,
      task_assigned: true,
      task_completed: true,
      task_due_soon: true,
      task_overdue: true,
      comment_added: true,
      project_invite: true,
      member_joined: true,
      member_left: false,
      quiet_hours: null
    };
  }

  shouldNotify(prefs, type) {
    if (prefs.enabled === false) return false;
    if (prefs[type] === false) return false;

    if (prefs.quiet_hours?.enabled) {
      const hour = new Date().getHours();
      const { start, end } = prefs.quiet_hours;
      if (start <= end) {
        if (hour >= start && hour < end) return false;
      } else {
        if (hour >= start || hour < end) return false;
      }
    }

    if (prefs.doNotDisturb?.enabled) {
      if (prefs.doNotDisturb.until) {
        if (new Date() < new Date(prefs.doNotDisturb.until)) return false;
      } else {
        return false;
      }
    }

    return true;
  }

  async getProjectChannel(projectId) {
    const doc = await this.db.collection('project_channels').doc(projectId).get();
    return doc.exists ? doc.data() : null;
  }

  async logNotification(userId, notification) {
    try {
      const { admin } = require('../config/firebase');
      await this.db.collection('notification_logs').add({
        userId,
        type: notification.type,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        data: notification
      });
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  async getUserName(userId) {
    if (!userId) return 'Someone';
    const doc = await this.db.collection('users').doc(userId).get();
    if (!doc.exists) return 'Someone';
    const data = doc.data();
    return data.displayName || data.name || data.email || 'Someone';
  }

  getPriorityIcon(priority) {
    return { high: '🔴', medium: '🟡', low: '🟢' }[priority] || '📋';
  }

  getPriorityText(priority) {
    return { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[priority] || 'Normal';
  }

  formatDate(timestamp) {
    if (!timestamp) return 'No due date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CliqNotifierService();
