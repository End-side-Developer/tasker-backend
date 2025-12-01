const logger = require('../config/logger');

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const VALID_STATUSES = new Set(['pending', 'inProgress', 'completed']);
const VALID_RECURRENCE = new Set(['none', 'daily', 'weekly', 'monthly']);

const normalizePriority = (value) => {
  if (!value) return 'medium';
  const candidate = value.toString().trim().toLowerCase();
  const normalized = candidate === 'medium'
    ? 'medium'
    : candidate === 'low'
      ? 'low'
      : candidate === 'high'
        ? 'high'
        : candidate === 'urgent'
          ? 'urgent'
          : null;
  return normalized ?? 'medium';
};

const normalizeStatus = (value) => {
  if (!value) return 'pending';
  const candidate = value.toString().trim();
  if (VALID_STATUSES.has(candidate)) {
    return candidate;
  }
  const lower = candidate.toLowerCase();
  if (lower === 'in_progress' || lower === 'in-progress' || lower === 'inprogress') {
    return 'inProgress';
  }
  if (lower === 'completed') return 'completed';
  if (lower === 'pending') return 'pending';
  return 'pending';
};

const normalizeRecurrencePattern = (value) => {
  if (!value) return 'none';
  const candidate = value.toString().trim().toLowerCase();
  const normalized =
    candidate === 'daily'
      ? 'daily'
      : candidate === 'weekly'
        ? 'weekly'
        : candidate === 'monthly'
          ? 'monthly'
          : 'none';
  return VALID_RECURRENCE.has(normalized) ? normalized : 'none';
};

const sanitizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const clampRecurrenceInterval = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, 999999);
};

const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return fallback;
};

const toTimestampOrNull = (admin, value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return admin.firestore.Timestamp.fromDate(date);
};

/**
 * Task Service - Handles all task-related operations
 */
class TaskService {
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
   * Create a new task
   */
  async createTask(taskData) {
    try {
      const { admin } = require('../config/firebase');
      const taskRef = this.db.collection('tasks').doc();
      const taskId = taskRef.id;

      const assignees = sanitizeStringArray(taskData.assignees);
      const assignedBy = taskData.assignedBy ?? (assignees.length > 0 ? taskData.createdBy ?? null : null);

      // Treat 'personal', 'none', empty string as null (personal task)
      const projectId = taskData.projectId && taskData.projectId !== 'personal' && taskData.projectId !== 'none'
        ? taskData.projectId
        : null;

      const task = {
        projectId,
        title: taskData.title,
        description: taskData.description ?? null,
        isDescriptionEncrypted: Boolean(taskData.isDescriptionEncrypted),
        dueDate: toTimestampOrNull(admin, taskData.dueDate),
        status: normalizeStatus(taskData.status),
        priority: normalizePriority(taskData.priority),
        tags: sanitizeStringArray(taskData.tags),
        reminderEnabled: parseBoolean(taskData.reminderEnabled, true),
        assignees,
        assignedBy,
        assignedAt: assignees.length > 0
          ? admin.firestore.FieldValue.serverTimestamp()
          : null,
        recurrencePattern: normalizeRecurrencePattern(taskData.recurrencePattern),
        recurrenceInterval: clampRecurrenceInterval(taskData.recurrenceInterval ?? 1),
        recurrenceEndDate: toTimestampOrNull(admin, taskData.recurrenceEndDate),
        parentRecurringTaskId: taskData.parentRecurringTaskId ?? null,
        createdBy: taskData.createdBy ?? null,  // WHO created the task
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: null,
      };

      await taskRef.set(task);
      logger.info('Task created', { taskId, title: task.title });

      return { id: taskId, ...task };
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId) {
    try {
      const doc = await this.db.collection('tasks').doc(taskId).get();

      if (!doc.exists) {
        throw new Error('Task not found');
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error('Error getting task:', error);
      throw error;
    }
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters = {}) {
    try {
      let query = this.db.collection('tasks');

      // Apply filters
      if (filters.assignee) {
        query = query.where('assignees', 'array-contains', filters.assignee);
      }

      if (filters.projectId) {
        query = query.where('projectId', '==', filters.projectId);
      }

      if (filters.status) {
        query = query.where('status', '==', normalizeStatus(filters.status));
      }

      // Limit results
      const limit = filters.limit || 50;
      query = query.limit(limit);

      const snapshot = await query.get();
      const tasks = [];

      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });

      logger.info('Tasks listed', { count: tasks.length, filters });
      return tasks;
    } catch (error) {
      logger.error('Error listing tasks:', error);
      throw error;
    }
  }

  /**
   * Update task
   */
  /**
   * Update task
   */
  async updateTask(taskId, updates) {
    try {
      const { admin } = require('../config/firebase');
      const cliqNotifier = require('./cliqNotifierService');

      const taskRef = this.db.collection('tasks').doc(taskId);
      const doc = await taskRef.get();

      if (!doc.exists) {
        throw new Error('Task not found');
      }

      const oldTask = doc.data();
      const updateData = { ...updates };
      const changes = [];

      if (updateData.status !== undefined) {
        updateData.status = normalizeStatus(updateData.status);
        if (updateData.status !== oldTask.status) {
          changes.push(`Status: ${oldTask.status} ➔ ${updateData.status}`);
        }
      }

      if (updateData.priority !== undefined) {
        updateData.priority = normalizePriority(updateData.priority);
        if (updateData.priority !== oldTask.priority) {
          changes.push(`Priority: ${oldTask.priority} ➔ ${updateData.priority}`);
        }
      }

      if (updateData.tags !== undefined) {
        updateData.tags = sanitizeStringArray(updateData.tags);
      }

      if (updateData.reminderEnabled !== undefined) {
        updateData.reminderEnabled = parseBoolean(updateData.reminderEnabled, true);
      }

      // Track new assignees for notifications
      let newAssigneeIds = [];
      
      if (updateData.assignees !== undefined) {
        const assignees = sanitizeStringArray(updateData.assignees);
        updateData.assignees = assignees;
        if (assignees.length > 0 && !updateData.assignedAt) {
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Detect newly added assignees
        const oldAssignees = new Set(oldTask.assignees || []);
        newAssigneeIds = assignees.filter(id => !oldAssignees.has(id));
        
        if (newAssigneeIds.length > 0) {
          changes.push(`Assigned to ${newAssigneeIds.length} new user(s)`);
        }
      }

      if (updateData.recurrencePattern !== undefined) {
        updateData.recurrencePattern = normalizeRecurrencePattern(updateData.recurrencePattern);
      }

      if (updateData.recurrenceInterval !== undefined) {
        updateData.recurrenceInterval = clampRecurrenceInterval(updateData.recurrenceInterval);
      }

      if (updateData.dueDate !== undefined) {
        const newDueDate = toTimestampOrNull(admin, updateData.dueDate);
        updateData.dueDate = newDueDate;

        // Check if due date changed
        const oldTime = oldTask.dueDate ? oldTask.dueDate.toMillis() : 0;
        const newTime = newDueDate ? newDueDate.toMillis() : 0;

        if (oldTime !== newTime) {
          changes.push('Due Date updated');
          // RESET FLAG: If due date changes, we must allow "Due Soon" to fire again
          updateData.dueSoonNotificationSent = false;
          updateData.lastOverdueNotification = null;
        }
      }

      if (updateData.recurrenceEndDate !== undefined) {
        updateData.recurrenceEndDate = toTimestampOrNull(admin, updateData.recurrenceEndDate);
      }

      if (updateData.description !== undefined && updateData.description !== oldTask.description) {
        changes.push('Description updated');
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await taskRef.update(updateData);
      logger.info('Task updated', { taskId, updates: Object.keys(updates) });

      // TRIGGER NOTIFICATION
      // Only notify if there are meaningful changes and it's not just a status completion (handled elsewhere)
      if (changes.length > 0 && updateData.status !== 'completed') {
        const newTask = { ...oldTask, ...updateData, id: taskId };

        // Send task_assigned notification to NEWLY added assignees
        if (newAssigneeIds.length > 0) {
          const assignerName = await cliqNotifier.getUserName(oldTask.createdBy);
          for (const assigneeId of newAssigneeIds) {
            await cliqNotifier.notifyUser(assigneeId, {
              type: 'task_assigned',
              task: newTask,
              assignedBy: assignerName
            });
          }
        }

        // Send task_updated notification to existing assignees (not new ones)
        const existingAssigneeIds = (newTask.assignees || []).filter(id => !newAssigneeIds.includes(id));
        for (const assigneeId of existingAssigneeIds) {
          await cliqNotifier.notifyUser(assigneeId, {
            type: 'task_updated',
            task: newTask,
            changes: changes
          });
        }

        // Notify project channel
        if (newTask.projectId) {
          await cliqNotifier.notifyProjectChannel(newTask.projectId, {
            type: 'task_updated',
            task: newTask,
            changes: changes
          });
        }
      }

      return { id: taskId, ...oldTask, ...updateData };
    } catch (error) {
      logger.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId, completedBy) {
    try {
      return await this.updateTask(taskId, {
        status: 'completed'
        // Note: completedAt and completedBy don't exist in schema
        // updatedAt will be set by updateTask
      });
    } catch (error) {
      logger.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    try {
      await this.db.collection('tasks').doc(taskId).delete();
      logger.info('Task deleted', { taskId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Add note to task
   * Stores notes in a subcollection under the task
   */
  async addNoteToTask(taskId, noteData) {
    try {
      const { admin } = require('../config/firebase');

      // First verify task exists
      const taskRef = this.db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new Error('Task not found');
      }

      // Create note in subcollection
      const noteRef = taskRef.collection('notes').doc();
      const noteId = noteRef.id;

      const note = {
        content: noteData.content,
        addedBy: noteData.addedBy || null,
        source: noteData.source || 'cliq',
        messageId: noteData.messageId || null,
        channelId: noteData.channelId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await noteRef.set(note);

      // Update task's updatedAt timestamp
      await taskRef.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('Note added to task', { taskId, noteId });

      return { id: noteId, ...note };
    } catch (error) {
      logger.error('Error adding note to task:', error);
      throw error;
    }
  }
}

module.exports = new TaskService();
