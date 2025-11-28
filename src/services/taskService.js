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

      const task = {
        projectId: taskData.projectId || null,
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
  async updateTask(taskId, updates) {
    try {
      const { admin } = require('../config/firebase');
      const taskRef = this.db.collection('tasks').doc(taskId);
      const doc = await taskRef.get();

      if (!doc.exists) {
        throw new Error('Task not found');
      }

      const updateData = { ...updates };

      if (updateData.status !== undefined) {
        updateData.status = normalizeStatus(updateData.status);
      }

      if (updateData.priority !== undefined) {
        updateData.priority = normalizePriority(updateData.priority);
      }

      if (updateData.tags !== undefined) {
        updateData.tags = sanitizeStringArray(updateData.tags);
      }

      if (updateData.reminderEnabled !== undefined) {
        updateData.reminderEnabled = parseBoolean(updateData.reminderEnabled, true);
      }

      if (updateData.assignees !== undefined) {
        const assignees = sanitizeStringArray(updateData.assignees);
        updateData.assignees = assignees;
        if (assignees.length > 0 && !updateData.assignedAt) {
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
        }
      }

      if (updateData.recurrencePattern !== undefined) {
        updateData.recurrencePattern = normalizeRecurrencePattern(updateData.recurrencePattern);
      }

      if (updateData.recurrenceInterval !== undefined) {
        updateData.recurrenceInterval = clampRecurrenceInterval(updateData.recurrenceInterval);
      }

      if (updateData.dueDate !== undefined) {
        updateData.dueDate = toTimestampOrNull(admin, updateData.dueDate);
      }

      if (updateData.recurrenceEndDate !== undefined) {
        updateData.recurrenceEndDate = toTimestampOrNull(admin, updateData.recurrenceEndDate);
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await taskRef.update(updateData);
      logger.info('Task updated', { taskId, updates: Object.keys(updates) });

      return { id: taskId, ...doc.data(), ...updateData };
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
}

module.exports = new TaskService();
