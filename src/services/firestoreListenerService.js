/**
 * Firestore Listeners Service
 * 
 * Sets up real-time listeners on Firestore collections to trigger
 * notifications when documents are created, updated, or deleted.
 * 
 * This replaces Firebase Cloud Functions with Node.js backend listeners.
 */

const logger = require('../config/logger');
const cliqNotifier = require('./cliqNotifierService');

class FirestoreListenerService {
  constructor() {
    this._db = null;
    this._listeners = [];
    this._initialized = false;
  }

  get db() {
    if (!this._db) {
      const { admin } = require('../config/firebase');
      this._db = admin.firestore();
    }
    return this._db;
  }

  /**
   * Initialize all Firestore listeners
   */
  initialize() {
    if (this._initialized) {
      logger.warn('Firestore listeners already initialized');
      return;
    }

    logger.info('🔔 Initializing Firestore notification listeners...');

    try {
      // Task collection listeners
      this.setupTaskListeners();
      
      // Project collection listeners
      this.setupProjectListeners();

      this._initialized = true;
      logger.info('✅ Firestore notification listeners initialized');
    } catch (error) {
      logger.error('Failed to initialize Firestore listeners:', error);
    }
  }

  /**
   * Setup listeners for tasks collection
   */
  setupTaskListeners() {
    const tasksRef = this.db.collection('tasks');

    // Listen for task changes
    const unsubscribe = tasksRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const taskId = change.doc.id;
          const task = change.doc.data();

          try {
            if (change.type === 'added') {
              // Skip if this is initial load (task created before listener started)
              if (task.createdAt && this.isOlderThan(task.createdAt, 30)) {
                return;
              }
              await this.handleTaskCreated(taskId, task);
            } else if (change.type === 'modified') {
              // Get previous data from cache or compare
              await this.handleTaskUpdated(taskId, task, change.doc);
            } else if (change.type === 'removed') {
              await this.handleTaskDeleted(taskId, task);
            }
          } catch (error) {
            logger.error(`Error handling task ${change.type}:`, error);
          }
        });
      },
      (error) => {
        logger.error('Tasks listener error:', error);
      }
    );

    this._listeners.push(unsubscribe);
    logger.info('📋 Task listener active');
  }

  /**
   * Setup listeners for projects collection
   */
  setupProjectListeners() {
    const projectsRef = this.db.collection('projects');

    const unsubscribe = projectsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const projectId = change.doc.id;
          const project = change.doc.data();

          try {
            if (change.type === 'added') {
              if (project.createdAt && this.isOlderThan(project.createdAt, 30)) {
                return;
              }
              await this.handleProjectCreated(projectId, project);
            }
          } catch (error) {
            logger.error(`Error handling project ${change.type}:`, error);
          }
        });
      },
      (error) => {
        logger.error('Projects listener error:', error);
      }
    );

    this._listeners.push(unsubscribe);
    logger.info('📁 Project listener active');
  }

  // ═══════════════════════════════════════════════════════════════════
  // TASK EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  async handleTaskCreated(taskId, task) {
    logger.info(`Task created: ${taskId} - ${task.title}`);

    const creatorName = await cliqNotifier.getUserName(task.createdBy);

    // Notify assignees (except creator)
    if (task.assignees?.length > 0) {
      for (const assigneeId of task.assignees) {
        if (assigneeId === task.createdBy) continue;

        await cliqNotifier.notifyUser(assigneeId, {
          type: 'task_assigned',
          task: { id: taskId, ...task },
          assignedBy: creatorName
        });
      }
    }

    // Notify project channel
    if (task.projectId) {
      await cliqNotifier.notifyProjectChannel(task.projectId, {
        type: 'task_created',
        task: { id: taskId, ...task },
        createdBy: creatorName
      });
    }
  }

  async handleTaskUpdated(taskId, task, docSnapshot) {
    logger.info(`Task updated: ${taskId}`);

    // Check for completion
    if (task.status === 'completed' && task.completedAt) {
      // Only notify if recently completed (within last minute)
      if (!this.isOlderThan(task.completedAt, 1)) {
        const completedBy = await cliqNotifier.getUserName(task.completedBy || task.updatedBy);

        // Notify creator
        if (task.createdBy && task.createdBy !== (task.completedBy || task.updatedBy)) {
          await cliqNotifier.notifyUser(task.createdBy, {
            type: 'task_completed',
            task: { id: taskId, ...task },
            completedBy
          });
        }

        // Notify project channel
        if (task.projectId) {
          await cliqNotifier.notifyProjectChannel(task.projectId, {
            type: 'task_completed',
            task: { id: taskId, ...task },
            completedBy
          });
        }
      }
    }

    // Note: For detecting field changes, we'd need to store previous state
    // This is a simplified version that handles completion
  }

  async handleTaskDeleted(taskId, task) {
    logger.info(`Task deleted: ${taskId}`);

    if (task.projectId) {
      await cliqNotifier.notifyProjectChannel(task.projectId, {
        type: 'task_deleted',
        task: { id: taskId, title: task.title }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROJECT EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  async handleProjectCreated(projectId, project) {
    logger.info(`Project created: ${projectId} - ${project.name}`);

    const creatorName = await cliqNotifier.getUserName(project.createdBy);

    if (project.createdBy) {
      await cliqNotifier.notifyUser(project.createdBy, {
        type: 'project_created',
        project: { id: projectId, ...project },
        createdBy: creatorName
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCHEDULED CHECKS (called by cron/scheduler)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check for overdue tasks and send notifications
   * Call this from a scheduler (e.g., node-cron) daily
   */
  async checkOverdueTasks() {
    logger.info('Checking for overdue tasks...');

    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const snapshot = await this.db.collection('tasks')
        .where('status', '!=', 'completed')
        .where('dueDate', '<', startOfToday)
        .get();

      logger.info(`Found ${snapshot.size} overdue tasks`);

      for (const doc of snapshot.docs) {
        const task = doc.data();
        const taskId = doc.id;

        // Skip if already notified today
        if (task.lastOverdueNotification) {
          const lastNotified = task.lastOverdueNotification.toDate();
          if (lastNotified.toDateString() === now.toDateString()) continue;
        }

        const dueDate = task.dueDate.toDate();
        const daysOverdue = Math.floor((startOfToday - dueDate) / (1000 * 60 * 60 * 24));

        for (const assigneeId of (task.assignees || [])) {
          await cliqNotifier.notifyUser(assigneeId, {
            type: 'task_overdue',
            task: { id: taskId, ...task },
            daysOverdue
          });
        }

        // Update last notification timestamp
        const { admin } = require('../config/firebase');
        await this.db.collection('tasks').doc(taskId).update({
          lastOverdueNotification: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info('Overdue task check complete');
    } catch (error) {
      logger.error('Error checking overdue tasks:', error);
    }
  }

  /**
   * Check for tasks due soon and send notifications
   * Call this from a scheduler (e.g., node-cron) hourly
   */
  async checkDueSoonTasks() {
    logger.info('Checking for tasks due soon...');

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const snapshot = await this.db.collection('tasks')
        .where('status', '!=', 'completed')
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', in24Hours)
        .get();

      logger.info(`Found ${snapshot.size} tasks due soon`);

      for (const doc of snapshot.docs) {
        const task = doc.data();
        const taskId = doc.id;

        if (task.dueSoonNotificationSent) continue;

        const dueDate = task.dueDate.toDate();
        const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));

        for (const assigneeId of (task.assignees || [])) {
          await cliqNotifier.notifyUser(assigneeId, {
            type: 'task_due_soon',
            task: { id: taskId, ...task },
            hoursUntilDue
          });
        }

        // Mark as notified
        await this.db.collection('tasks').doc(taskId).update({
          dueSoonNotificationSent: true
        });
      }

      logger.info('Due soon check complete');
    } catch (error) {
      logger.error('Error checking due soon tasks:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check if a timestamp is older than X minutes
   */
  isOlderThan(timestamp, minutes) {
    if (!timestamp) return true;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return date < cutoff;
  }

  /**
   * Stop all listeners (for graceful shutdown)
   */
  shutdown() {
    logger.info('Shutting down Firestore listeners...');
    this._listeners.forEach(unsubscribe => unsubscribe());
    this._listeners = [];
    this._initialized = false;
  }
}

module.exports = new FirestoreListenerService();
