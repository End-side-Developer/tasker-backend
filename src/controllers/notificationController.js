/**
 * Notification Controller
 * 
 * Handles notification preferences and management
 */

const logger = require('../config/logger');
const { admin } = require('../config/firebase');
const cliqService = require('../services/cliqService');

const db = admin.firestore();

// Default notification preferences
const DEFAULT_PREFERENCES = {
  enabled: true,
  
  // Task notifications
  task_assigned: true,
  task_completed: true,
  task_due_soon: true,
  task_overdue: true,
  task_updated: false,
  
  // Comment notifications
  comment_added: true,
  
  // Project notifications
  project_invite: true,
  member_joined: true,
  member_left: false,
  project_archived: true,
  
  // Quiet hours
  quiet_hours: {
    enabled: false,
    start: 22,  // 10 PM
    end: 8      // 8 AM
  },
  
  // Do Not Disturb
  doNotDisturb: {
    enabled: false,
    until: null
  },
  
  // Project-specific overrides
  projectOverrides: {}
};

/**
 * Get notification settings for a user
 */
exports.getSettings = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId or userEmail required'
      });
    }
    
    // Map Cliq user to Tasker user
    const taskerUserId = userId ? 
      await cliqService.mapCliqUserToTasker(userId, userEmail) : 
      null;
    
    if (!taskerUserId) {
      // Return default settings for unlinked users
      return res.json({
        success: true,
        data: {
          settings: DEFAULT_PREFERENCES,
          linked: false
        }
      });
    }
    
    // Get user's notification settings
    const settingsDoc = await db.collection('users')
      .doc(taskerUserId)
      .collection('settings')
      .doc('notifications')
      .get();
    
    const settings = settingsDoc.exists 
      ? { ...DEFAULT_PREFERENCES, ...settingsDoc.data() }
      : DEFAULT_PREFERENCES;
    
    // Check if DND has expired
    if (settings.doNotDisturb?.enabled && settings.doNotDisturb?.until) {
      const until = new Date(settings.doNotDisturb.until);
      if (new Date() >= until) {
        settings.doNotDisturb.enabled = false;
        settings.doNotDisturb.until = null;
        
        // Update in Firestore
        await db.collection('users')
          .doc(taskerUserId)
          .collection('settings')
          .doc('notifications')
          .update({
            'doNotDisturb.enabled': false,
            'doNotDisturb.until': null
          });
      }
    }
    
    res.json({
      success: true,
      data: {
        settings,
        linked: true
      }
    });
    
  } catch (error) {
    logger.error('Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification settings'
    });
  }
};

/**
 * Update notification settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { userId, userEmail, settings } = req.body;
    
    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId or userEmail required'
      });
    }
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'settings object required'
      });
    }
    
    // Map Cliq user to Tasker user
    const taskerUserId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerUserId) {
      return res.status(404).json({
        success: false,
        error: 'User not linked to Tasker account'
      });
    }
    
    // Validate settings object
    const validKeys = Object.keys(DEFAULT_PREFERENCES);
    const sanitizedSettings = {};
    
    for (const key of validKeys) {
      if (settings[key] !== undefined) {
        sanitizedSettings[key] = settings[key];
      }
    }
    
    // Update settings
    await db.collection('users')
      .doc(taskerUserId)
      .collection('settings')
      .doc('notifications')
      .set(sanitizedSettings, { merge: true });
    
    logger.info('Notification settings updated', { taskerUserId });
    
    res.json({
      success: true,
      data: {
        message: 'Settings updated successfully',
        settings: sanitizedSettings
      }
    });
    
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings'
    });
  }
};

/**
 * Mute/unmute notifications for a specific project
 */
exports.muteProject = async (req, res) => {
  try {
    const { userId, userEmail, projectId, muted } = req.body;
    
    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId or userEmail required'
      });
    }
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId required'
      });
    }
    
    // Map Cliq user to Tasker user
    const taskerUserId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerUserId) {
      return res.status(404).json({
        success: false,
        error: 'User not linked to Tasker account'
      });
    }
    
    // Update project override
    const updateData = {};
    updateData[`projectOverrides.${projectId}`] = {
      enabled: !muted,
      mutedAt: muted ? admin.firestore.FieldValue.serverTimestamp() : null
    };
    
    await db.collection('users')
      .doc(taskerUserId)
      .collection('settings')
      .doc('notifications')
      .set(updateData, { merge: true });
    
    logger.info('Project notification muted/unmuted', { 
      taskerUserId, 
      projectId, 
      muted 
    });
    
    res.json({
      success: true,
      data: {
        message: muted ? 'Project muted' : 'Project unmuted',
        projectId,
        muted
      }
    });
    
  } catch (error) {
    logger.error('Error muting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project notification settings'
    });
  }
};

/**
 * Enable/disable Do Not Disturb mode
 */
exports.setDoNotDisturb = async (req, res) => {
  try {
    const { userId, userEmail, enabled, durationHours } = req.body;
    
    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId or userEmail required'
      });
    }
    
    // Map Cliq user to Tasker user
    const taskerUserId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerUserId) {
      return res.status(404).json({
        success: false,
        error: 'User not linked to Tasker account'
      });
    }
    
    // Calculate DND end time
    let until = null;
    if (enabled && durationHours) {
      until = new Date();
      until.setHours(until.getHours() + durationHours);
    }
    
    // Update DND settings
    await db.collection('users')
      .doc(taskerUserId)
      .collection('settings')
      .doc('notifications')
      .set({
        doNotDisturb: {
          enabled: enabled,
          until: until ? until.toISOString() : null,
          startedAt: enabled ? new Date().toISOString() : null
        }
      }, { merge: true });
    
    logger.info('DND mode updated', { 
      taskerUserId, 
      enabled, 
      until 
    });
    
    let message = enabled 
      ? (durationHours ? `Do Not Disturb enabled for ${durationHours} hour(s)` : 'Do Not Disturb enabled')
      : 'Do Not Disturb disabled';
    
    res.json({
      success: true,
      data: {
        message,
        doNotDisturb: {
          enabled,
          until
        }
      }
    });
    
  } catch (error) {
    logger.error('Error setting DND:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Do Not Disturb settings'
    });
  }
};

/**
 * Get notification history for a user
 */
exports.getHistory = async (req, res) => {
  try {
    const { userId, userEmail, limit = 20, after } = req.query;
    
    if (!userId && !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId or userEmail required'
      });
    }
    
    // Map Cliq user to Tasker user
    const taskerUserId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerUserId) {
      return res.status(404).json({
        success: false,
        error: 'User not linked to Tasker account'
      });
    }
    
    // Build query
    let query = db.collection('notification_logs')
      .where('userId', '==', taskerUserId)
      .orderBy('sentAt', 'desc')
      .limit(parseInt(limit));
    
    // Add pagination cursor if provided
    if (after) {
      const afterDoc = await db.collection('notification_logs').doc(after).get();
      if (afterDoc.exists) {
        query = query.startAfter(afterDoc);
      }
    }
    
    const snapshot = await query.get();
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || null
    }));
    
    res.json({
      success: true,
      data: {
        notifications,
        hasMore: notifications.length === parseInt(limit),
        lastId: notifications.length > 0 ? notifications[notifications.length - 1].id : null
      }
    });
    
  } catch (error) {
    logger.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
};
