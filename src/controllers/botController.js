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

      case 'edit_task':
        response = await handleEditTask(taskerId, intent.params);
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
        // Handle encrypted descriptions - show placeholder instead
        const displayDescription = task.isDescriptionEncrypted 
          ? '🔒 Encrypted content - open in Tasker app to view'
          : task.description;
        response = {
          success: true,
          task: {
            id: task.id,
            title: task.title,
            description: displayDescription,
            status: task.status,
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? nlpService.formatDate(task.dueDate) : null,
            isEncrypted: task.isDescriptionEncrypted || false,
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

/**
 * Link Cliq user to Tasker account
 * POST /api/cliq/bot/user/link
 */
exports.linkUserAccount = async (req, res) => {
  try {
    const { cliqUserId, cliqUserName, taskerEmail } = req.body;

    logger.info('Link user account request', { cliqUserId, cliqUserName, taskerEmail });

    if (!cliqUserId || !taskerEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: cliqUserId and taskerEmail' 
      });
    }

    // Link the user using cliqService
    const result = await cliqService.linkCliqUser(cliqUserId, cliqUserName, taskerEmail);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Account linked successfully',
        taskerId: result.taskerId,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Could not link account. Make sure you entered the correct email.',
      });
    }

  } catch (error) {
    logger.error('Link user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to link account. Please try again.' 
    });
  }
};

/**
 * Get user link status
 * GET /api/cliq/bot/user/:cliqUserId
 */
exports.getUserLinkStatus = async (req, res) => {
  try {
    const { cliqUserId } = req.params;

    const taskerId = await cliqService.mapCliqUserToTasker(cliqUserId, null);

    return res.json({
      success: true,
      isLinked: !!taskerId,
      taskerId: taskerId || null,
    });

  } catch (error) {
    logger.error('Get user link status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get user's projects for form dropdown
 * GET /api/cliq/bot/projects
 */
exports.getUserProjects = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    // Map Cliq user to Tasker user
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);

    if (!taskerId) {
      return res.json({
        success: true,
        projects: [{ id: 'personal', name: '📁 Personal (No Project)' }],
      });
    }

    // Get Firebase admin
    const { admin } = require('../config/firebase');
    const db = admin.firestore();

    // Query projects where user is a member
    const snapshot = await db.collection('projects')
      .where('members', 'array-contains', taskerId)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = [
      { id: 'personal', name: '📁 Personal (No Project)' }
    ];

    snapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: `📂 ${data.name || 'Unnamed Project'}`,
      });
    });

    logger.info(`Fetched ${projects.length} projects for user ${userId}`);

    return res.json({
      success: true,
      projects,
    });

  } catch (error) {
    logger.error('Get user projects error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update task from Cliq form
 * POST /api/cliq/bot/update-task
 */
exports.updateTask = async (req, res) => {
  try {
    const { 
      taskId, 
      userId, 
      userEmail, 
      dueDate, 
      priority, 
      description,
      tags,
      reminderEnabled,
      recurrencePattern,
      recurrenceInterval,
      recurrenceEndDate,
      isDescriptionEncrypted
    } = req.body;

    logger.info('Update task request', { taskId, userId, body: req.body });

    if (!taskId) {
      return res.json({ success: false, error: 'Task ID is required' });
    }

    // Map Cliq user to Tasker user
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);

    if (!taskerId) {
      return res.json({ success: false, error: 'Account not linked. Use /tasker link first.' });
    }

    // Build updates object
    const updates = {};
    
    if (dueDate) {
      // Parse date string to ISO format
      updates.dueDate = new Date(dueDate).toISOString();
    }
    
    if (priority) {
      updates.priority = priority.toLowerCase();
    }
    
    if (description !== undefined) {
      updates.description = description;
    }

    if (tags !== undefined) {
      updates.tags = Array.isArray(tags) ? tags : [];
    }

    if (reminderEnabled !== undefined) {
      updates.reminderEnabled = reminderEnabled === true || reminderEnabled === 'true';
    }

    if (recurrencePattern) {
      updates.recurrencePattern = recurrencePattern.toLowerCase();
    }

    if (recurrenceInterval !== undefined) {
      const interval = parseInt(recurrenceInterval, 10);
      if (!isNaN(interval) && interval > 0) {
        updates.recurrenceInterval = interval;
      }
    }

    if (recurrenceEndDate) {
      updates.recurrenceEndDate = new Date(recurrenceEndDate).toISOString();
    }

    if (isDescriptionEncrypted !== undefined) {
      updates.isDescriptionEncrypted = isDescriptionEncrypted === true || isDescriptionEncrypted === 'true';
    }

    // Check if any updates
    if (Object.keys(updates).length === 0) {
      return res.json({ success: false, error: 'No updates provided' });
    }

    // Update the task
    const updatedTask = await taskService.updateTask(taskId, updates);

    logger.info('Task updated successfully', { taskId, updates });

    return res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
    });

  } catch (error) {
    logger.error('Update task error:', error);
    return res.json({ success: false, error: error.message });
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
    } else if (params.dueDate) {
      // Handle specific date from NLP entity extraction
      const targetDate = new Date(params.dueDate);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      
      filters.dueAfter = targetDate;
      filters.dueBefore = nextDay;
    }

    const tasks = await taskService.listTasks(filters);

    // Filter out completed tasks for the list view
    const pendingTasks = tasks.filter(t => t.status !== 'completed');

    // Fetch project names for tasks with projectId
    const { admin } = require('../config/firebase');
    const db = admin.firestore();
    const projectIds = [...new Set(pendingTasks.filter(t => t.projectId).map(t => t.projectId))];
    const projectMap = {};

    if (projectIds.length > 0) {
      // Fetch all projects in parallel
      const projectPromises = projectIds.map(id => db.collection('projects').doc(id).get());
      const projectDocs = await Promise.all(projectPromises);
      
      projectDocs.forEach(doc => {
        if (doc.exists) {
          projectMap[doc.id] = doc.data().name || 'Unnamed Project';
        }
      });
    }

    // Add project names to tasks
    const tasksWithProjects = pendingTasks.map(task => ({
      ...task,
      projectName: task.projectId ? (projectMap[task.projectId] || 'Unknown Project') : null,
    }));

    return nlpService.formatTaskList(tasksWithProjects);

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
          action: { type: 'invoke.function', data: { name: 'botListTasks' } },
        },
      ] : [
        {
          label: '➕ New Task',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
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
 * Handle edit task intent - find task by name and return edit form trigger
 */
async function handleEditTask(taskerId, params) {
  try {
    if (!params.taskName) {
      return {
        text: "🤔 Which task would you like to edit?\n\nTry: \"edit [task name]\"",
      };
    }

    // Get user's tasks
    const tasks = await taskService.listTasks({ assignee: taskerId });

    // Find matching task using fuzzy search
    const matchedTask = nlpService.findMatchingTask(tasks, params.taskName);

    if (!matchedTask) {
      const taskList = tasks.slice(0, 5).map(t => `• ${t.title}`).join('\n');
      return {
        text: `🔍 I couldn't find a task matching "${params.taskName}"\n\n` +
          `Your tasks:\n${taskList}\n\nTry the exact task name!`,
      };
    }

    // Return response with edit form button - task found!
    return {
      text: `📝 **Edit Task: "${matchedTask.title}"**\n\n` +
        `Current details:\n` +
        `• Status: ${matchedTask.status || 'pending'}\n` +
        `• Priority: ${matchedTask.priority || 'medium'}\n` +
        (matchedTask.dueDate ? `• Due: ${nlpService.formatDate(matchedTask.dueDate)}\n` : '') +
        `\nClick below to edit:`,
      buttons: [
        {
          label: '✏️ Edit Task',
          type: '+',
          action: {
            type: 'invoke.function',
            data: { name: 'editTaskForm', taskId: matchedTask.id, taskName: matchedTask.title },
          },
        },
        {
          label: '✅ Mark Complete',
          type: '+',
          action: {
            type: 'invoke.function',
            data: { name: 'botCompleteTask', taskId: matchedTask.id },
          },
        },
      ],
    };

  } catch (error) {
    logger.error('Error handling edit task:', error);
    return {
      text: "😅 I couldn't find that task. Please try again!",
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
            action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
          },
        ],
      };
    }

    // Create the task
    const newTask = await taskService.createTask({
      title: params.taskTitle,
      createdBy: taskerId,
      assignees: [taskerId],
      dueDate: params.dueDate || null,
      priority: params.priority || 'medium',
    });

    let responseText = `✅ **Task created!**\n\n📋 "${params.taskTitle}"`;
    
    if (params.dueDate) {
      responseText += `\n📅 Due: ${nlpService.formatDate(params.dueDate)}`;
    }
    
    if (params.priority && params.priority !== 'medium') {
      responseText += `\n🔥 Priority: ${params.priority}`;
    }

    responseText += `\n\n💡 To edit this task, type:\n\`edit ${params.taskTitle}\``;

    return {
      text: responseText,
      buttons: [
        {
          label: '📋 View Tasks',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'botListTasks' } },
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
