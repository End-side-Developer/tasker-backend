/**
 * Bot Controller - Handles TaskerBot API endpoints
 */

const logger = require('../config/logger');
const nlpService = require('../services/nlpService');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');

/**
 * Process bot message with NLP
 * POST /api/cliq/bot/message
 */
exports.processMessage = async (req, res) => {
  try {
    const { message, userId, userEmail, userName, context, channelId, channelName } = req.body;

    logger.info('Bot message received', { message, userId, userEmail, context });

    // Map Cliq user to Tasker user
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);

    if (!taskerId) {
      logger.warn('User not linked', { userId, userEmail });
      return res.json({
        success: true,
        ...nlpService.responses.not_linked,
      });
    }

    // Parse intent from message
    const intent = nlpService.parseIntent(message);
    logger.info('Intent parsed', { action: intent.action, params: intent.params });

    let response;

    switch (intent.action) {
      case 'help':
        response = nlpService.responses.help;
        break;

      case 'greeting':
        response = nlpService.responses.greeting;
        break;

      case 'get_briefing':
        response = await handleBriefing(taskerId);
        break;

      case 'list_tasks':
        response = await handleListTasks(taskerId, intent.params);
        break;

      case 'complete_task':
        response = await handleCompleteTask(taskerId, intent.params);
        break;

      case 'create_task':
        response = await handleCreateTask(taskerId, intent.params, userName);
        break;

      case 'list_projects':
        response = await handleListProjects(taskerId);
        break;

      case 'get_stats':
        response = await handleGetStats(taskerId);
        break;

      case 'assign_task':
        response = await handleAssignTask(taskerId, intent.params);
        break;

      default:
        response = nlpService.responses.unknown;
    }

    return res.json({ success: true, ...response });

  } catch (error) {
    logger.error('Bot message processing error:', error);
    return res.json({
      success: false,
      error: 'Something went wrong. Please try again.',
      text: "😅 Oops! I hit a snag. Please try again or use `/tasker` for manual commands.",
    });
  }
};

/**
 * Get daily briefing
 * GET /api/cliq/bot/briefing
 */
exports.getDailyBriefing = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);

    if (!taskerId) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const briefingData = await getBriefingData(taskerId);

    return res.json({
      success: true,
      briefing: briefingData,
    });

  } catch (error) {
    logger.error('Briefing error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get briefing' });
  }
};

/**
 * Handle context actions (button clicks, etc.)
 * POST /api/cliq/bot/context
 */
exports.handleContext = async (req, res) => {
  try {
    const { action, taskId, userId, userEmail } = req.body;

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);

    if (!taskerId) {
      return res.json({ success: false, error: 'User not found' });
    }

    let response;

    switch (action) {
      case 'view_task':
        const task = await taskService.getTaskById(taskId);
        response = {
          success: true,
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? nlpService.formatDate(task.dueDate) : null,
          },
        };
        break;

      case 'complete_task':
        await taskService.completeTask(taskId, taskerId);
        response = {
          success: true,
          message: 'Task completed!',
        };
        break;

      default:
        response = { success: false, error: 'Unknown action' };
    }

    return res.json(response);

  } catch (error) {
    logger.error('Context action error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle channel unlink notification
 * POST /api/cliq/bot/channel-unlink
 */
exports.handleChannelUnlink = async (req, res) => {
  try {
    const { channelId, channelName } = req.body;

    logger.info('Channel unlink notification', { channelId, channelName });

    // TODO: Remove channel-project mapping if exists
    // This would be implemented when Feature 6 (Project Channels) is built

    return res.json({ success: true });

  } catch (error) {
    logger.error('Channel unlink error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== Intent Handlers ====================

/**
 * Handle list tasks intent
 */
async function handleListTasks(taskerId, params = {}) {
  try {
    const filters = { assignee: taskerId };

    // Apply time filter if specified
    if (params.timeFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (params.timeFilter) {
        case 'today':
          filters.dueBefore = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'tomorrow':
          filters.dueAfter = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          filters.dueBefore = new Date(today.getTime() + 48 * 60 * 60 * 1000);
          break;
        case 'this week':
          const endOfWeek = new Date(today);
          endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
          filters.dueBefore = endOfWeek;
          break;
      }
    }

    const tasks = await taskService.listTasks(filters);

    // Filter out completed tasks for the list view
    const pendingTasks = tasks.filter(t => t.status !== 'completed');

    return nlpService.formatTaskList(pendingTasks);

  } catch (error) {
    logger.error('Error listing tasks:', error);
    return {
      text: "😅 I couldn't fetch your tasks. Please try again!",
    };
  }
}

/**
 * Handle complete task intent
 */
async function handleCompleteTask(taskerId, params) {
  try {
    if (!params.taskName) {
      return {
        text: "🤔 Which task did you complete?\n\nTry: \"I'm done with [task name]\"",
      };
    }

    // Get user's tasks
    const tasks = await taskService.listTasks({ assignee: taskerId });
    const pendingTasks = tasks.filter(t => t.status !== 'completed');

    // Find matching task
    const matchedTask = nlpService.findMatchingTask(pendingTasks, params.taskName);

    if (!matchedTask) {
      return {
        text: `🔍 I couldn't find a task matching "${params.taskName}"\n\n` +
          `Your pending tasks:\n` +
          pendingTasks.slice(0, 5).map(t => `• ${t.title}`).join('\n') +
          `\n\nTry the exact task name!`,
      };
    }

    // Complete the task
    await taskService.completeTask(matchedTask.id, taskerId);

    const remainingTasks = pendingTasks.filter(t => t.id !== matchedTask.id);

    let responseText = `✅ **"${matchedTask.title}"** marked as complete! 🎉`;

    if (remainingTasks.length > 0) {
      responseText += `\n\n📋 ${remainingTasks.length} tasks remaining.`;
    } else {
      responseText += `\n\n🌟 All tasks complete! You're a productivity champion!`;
    }

    return {
      text: responseText,
      buttons: remainingTasks.length > 0 ? [
        {
          label: '📋 Show Remaining',
          type: '+',
          action: { type: 'invoke.function', name: 'botListTasks' },
        },
      ] : [
        {
          label: '➕ New Task',
          type: '+',
          action: { type: 'invoke.function', name: 'showCreateTaskForm' },
        },
      ],
    };

  } catch (error) {
    logger.error('Error completing task:', error);
    return {
      text: "😅 I couldn't complete that task. Please try again!",
    };
  }
}

/**
 * Handle create task intent
 */
async function handleCreateTask(taskerId, params, userName) {
  try {
    if (!params.taskTitle) {
      return {
        text: "📝 What task would you like to create?\n\nTry: \"Create a task Review presentation\"",
        buttons: [
          {
            label: '📝 Create Task Form',
            type: '+',
            action: { type: 'invoke.function', name: 'showCreateTaskForm' },
          },
        ],
      };
    }

    // Create the task
    const newTask = await taskService.createTask({
      title: params.taskTitle,
      createdBy: taskerId,
      assignees: [taskerId],
    });

    return {
      text: `✅ **Task created!**\n\n📋 "${params.taskTitle}"\n\n` +
        `Would you like to add more details?`,
      buttons: [
        {
          label: '📅 Set Due Date',
          type: '+',
          action: {
            type: 'invoke.function',
            name: 'editTaskForm',
            params: { taskId: newTask.id },
          },
        },
        {
          label: '📋 View Tasks',
          type: '+',
          action: { type: 'invoke.function', name: 'botListTasks' },
        },
      ],
    };

  } catch (error) {
    logger.error('Error creating task:', error);
    return {
      text: "😅 I couldn't create that task. Please try again!",
    };
  }
}

/**
 * Handle briefing intent
 */
async function handleBriefing(taskerId) {
  try {
    const briefingData = await getBriefingData(taskerId);
    return nlpService.formatBriefing(briefingData);

  } catch (error) {
    logger.error('Error getting briefing:', error);
    return {
      text: "😅 I couldn't get your briefing. Please try again!",
    };
  }
}

/**
 * Get briefing data
 */
async function getBriefingData(taskerId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await taskService.listTasks({ assignee: taskerId });
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  const overdue = [];
  const dueToday = [];

  pendingTasks.forEach(task => {
    if (!task.dueDate) return;

    let dueDate;
    if (task.dueDate.toDate) {
      dueDate = task.dueDate.toDate();
    } else if (task.dueDate._seconds) {
      dueDate = new Date(task.dueDate._seconds * 1000);
    } else {
      dueDate = new Date(task.dueDate);
    }

    if (dueDate < today) {
      overdue.push(task);
    } else if (dueDate < tomorrow) {
      dueToday.push(task);
    }
  });

  return {
    dueToday,
    overdue,
    totalPending: pendingTasks.length,
  };
}

/**
 * Handle list projects intent
 */
async function handleListProjects(taskerId) {
  try {
    // Get projects - would need projectService
    // For now, return a placeholder
    return {
      text: "📁 **Your Projects**\n\n" +
        "_Project listing coming soon!_\n\n" +
        "Use `/taskerproject list` to see your projects.",
      buttons: [
        {
          label: '📁 View Projects',
          type: '+',
          action: {
            type: 'system.api',
            name: '/taskerproject list',
          },
        },
      ],
    };

  } catch (error) {
    logger.error('Error listing projects:', error);
    return {
      text: "😅 I couldn't fetch your projects. Please try again!",
    };
  }
}

/**
 * Handle get stats intent
 */
async function handleGetStats(taskerId) {
  try {
    const tasks = await taskService.listTasks({ assignee: taskerId });

    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status !== 'completed').length;
    const total = tasks.length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      text: `📊 **Your Stats**\n\n` +
        `✅ Completed: ${completed}\n` +
        `⏳ Pending: ${pending}\n` +
        `📈 Completion Rate: ${completionRate}%\n\n` +
        `_Keep up the great work!_ 💪`,
    };

  } catch (error) {
    logger.error('Error getting stats:', error);
    return {
      text: "😅 I couldn't fetch your stats. Please try again!",
    };
  }
}

/**
 * Handle assign task intent
 */
async function handleAssignTask(taskerId, params) {
  // This would need additional user lookup functionality
  return {
    text: "👥 **Task Assignment**\n\n" +
      "To assign tasks, use the `/taskertask` command:\n" +
      "`/taskertask assign`\n\n" +
      "_Natural language assignment coming soon!_",
  };
}
