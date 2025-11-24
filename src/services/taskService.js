const logger = require('../config/logger');

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

      const task = {
        projectId: taskData.projectId || null,
        title: taskData.title,
        description: taskData.description || null,
        isDescriptionEncrypted: false,
        dueDate: taskData.dueDate ? admin.firestore.Timestamp.fromDate(new Date(taskData.dueDate)) : null,
        status: 'pending',
        reminderEnabled: false,
        assignees: taskData.assignees || [],
        assignedBy: taskData.assignees?.length > 0 ? taskData.createdBy : null,
        assignedAt: taskData.assignees?.length > 0 ? admin.firestore.FieldValue.serverTimestamp() : null,
        recurrencePattern: 'none',
        recurrenceInterval: 1,
        recurrenceEndDate: null,
        parentRecurringTaskId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: null
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
        query = query.where('status', '==', filters.status);
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

      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

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
