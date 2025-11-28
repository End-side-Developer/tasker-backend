const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');
const logger = require('../config/logger');

/**
 * Task Controller - Handles HTTP requests for tasks
 */
class TaskController {
  /**
   * Create a new task
   * POST /api/tasks
   */
  async createTask(req, res, next) {
    try {
      const {
        title,
        description,
        projectId,
        dueDate,
        priority,
        tags,
        reminderEnabled,
        recurrencePattern,
        recurrenceInterval,
        recurrenceEndDate,
        parentRecurringTaskId,
        assignees,
        assignedBy,
        isDescriptionEncrypted,
        status,
        cliqContext = {},
      } = req.body;

      if (!cliqContext.userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_CONTEXT',
            message: 'Cliq user context is required to create tasks.',
          },
        });
      }

      // Map Cliq user to Tasker user
      let taskerUserId = await cliqService.mapCliqUserToTasker(cliqContext.userId);

      // If no mapping exists, create a temporary one (or require setup first)
      if (!taskerUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_NOT_LINKED',
            message: 'User not linked. Please connect your Tasker account first.',
          },
        });
      }

      // Create task
      const resolvedAssignees = Array.isArray(assignees) && assignees.length > 0
        ? assignees
        : [taskerUserId];

      const task = await taskService.createTask({
        title,
        description,
        projectId,
        dueDate,
        priority,
        tags,
        reminderEnabled,
        recurrencePattern,
        recurrenceInterval,
        recurrenceEndDate,
        parentRecurringTaskId,
        assignees: resolvedAssignees,
        assignedBy: assignedBy ?? taskerUserId,
        isDescriptionEncrypted,
        status,
        createdBy: taskerUserId,
      });

      // Store Cliq mapping
      await cliqService.storeTaskMapping(task.id, cliqContext);

      // Format response for Cliq
      const card = cliqService.formatTaskCard(task);

      res.status(201).json({
        success: true,
        message: '✅ Task created successfully!',
        task: {
          id: task.id,
          title: task.title,
          status: task.status,
          createdAt: task.createdAt,
        },
        card,
      });
    } catch (error) {
      logger.error('Error in createTask controller:', error);
      next(error);
    }
  }

  /**
   * Get task by ID
   * GET /api/tasks/:id
   */
  async getTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);

      res.json({
        success: true,
        task,
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Task not found' },
        });
      }
      logger.error('Error in getTask controller:', error);
      next(error);
    }
  }

  /**
   * List tasks
   * GET /api/tasks
   */
  async listTasks(req, res, next) {
    try {
      const { cliqUserId, projectId, status, limit } = req.query;

      // Map Cliq user to Tasker user
      let assignee = null;
      if (cliqUserId) {
        assignee = await cliqService.mapCliqUserToTasker(cliqUserId);
      }

      const tasks = await taskService.listTasks({
        assignee,
        projectId,
        status,
        limit: limit ? parseInt(limit) : 50,
      });

      res.json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      logger.error('Error in listTasks controller:', error);
      next(error);
    }
  }

  /**
   * Update task
   * PUT /api/tasks/:id
   */
  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const task = await taskService.updateTask(id, updates);

      res.json({
        success: true,
        message: 'Task updated successfully',
        task,
      });
    } catch (error) {
      if (error.message === 'Task not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Task not found' },
        });
      }
      logger.error('Error in updateTask controller:', error);
      next(error);
    }
  }

  /**
   * Complete task
   * POST /api/tasks/:id/complete
   */
  async completeTask(req, res, next) {
    try {
      const { id } = req.params;
      const { completedBy } = req.body;

      const task = await taskService.completeTask(id, completedBy);

      // Send webhook to Cliq
      await cliqService.sendWebhook({
        event: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          taskId: task.id,
          title: task.title,
          completedBy,
        },
      });

      res.json({
        success: true,
        message: '✅ Task completed!',
        task,
      });
    } catch (error) {
      logger.error('Error in completeTask controller:', error);
      next(error);
    }
  }

  /**
   * Delete task
   * DELETE /api/tasks/:id
   */
  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      await taskService.deleteTask(id);

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteTask controller:', error);
      next(error);
    }
  }
}

module.exports = new TaskController();
