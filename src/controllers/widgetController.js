/**
 * Widget Controller - Handles Tasker Home Widget API endpoints
 */

const logger = require('../config/logger');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');

/**
 * Get dashboard data for widget
 * GET /api/cliq/widget/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.json({
        success: true,
        data: {
          isLinked: false,
          message: 'Please link your Tasker account first',
        },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all user's tasks
    const allTasks = await taskService.listTasks({ assignee: taskerId });

    // Calculate stats
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const pendingTasks = allTasks.filter(t => t.status !== 'completed');
    
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate._seconds * 1000);
      return dueDate < today;
    });

    const stats = {
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
    };

    // Get today's tasks
    const todaysTasks = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate._seconds * 1000);
      return dueDate >= today && dueDate < tomorrow;
    }).slice(0, 5);

    // Get focus task (overdue first, then highest priority due soonest)
    let focusTask = null;
    
    if (overdueTasks.length > 0) {
      // Get most overdue high priority task
      focusTask = overdueTasks
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const aPriority = priorityOrder[a.priority] ?? 3;
          const bPriority = priorityOrder[b.priority] ?? 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          
          // Then by due date (oldest first)
          const aDate = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate?._seconds * 1000);
          const bDate = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate?._seconds * 1000);
          return aDate - bDate;
        })[0];
    } else if (todaysTasks.length > 0) {
      focusTask = todaysTasks
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
        })[0];
    }

    // Format focus task for response
    const formattedFocusTask = focusTask ? {
      id: focusTask.id,
      title: focusTask.title,
      priority: focusTask.priority || 'medium',
      dueDate: formatDueDate(focusTask.dueDate),
      dueTime: formatDueTime(focusTask.dueDate),
      isOverdue: isOverdue(focusTask.dueDate),
    } : null;

    // Format today's tasks
    const formattedTodaysTasks = todaysTasks.map(task => ({
      id: task.id,
      title: task.title,
      priority: task.priority || 'medium',
      dueDate: formatDueDate(task.dueDate),
      dueTime: formatDueTime(task.dueDate),
    }));

    logger.info('Widget dashboard loaded', { userId, stats });

    return res.json({
      success: true,
      data: {
        isLinked: true,
        focusTask: formattedFocusTask,
        todaysTasks: formattedTodaysTasks,
        stats,
        streak: { current: 0, best: 0 }, // Placeholder for gamification
      },
    });

  } catch (error) {
    logger.error('Widget dashboard error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
};

/**
 * Get tasks for widget
 * GET /api/cliq/widget/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { userId, userEmail, filter, limit = 100, personal, projectId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.json({
        success: true,
        data: { tasks: [], total: 0, isLinked: false },
      });
    }

    let tasks = await taskService.listTasks({ assignee: taskerId });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Filter by personal (no projectId) or specific project
    if (personal === 'true') {
      tasks = tasks.filter(t => !t.projectId || t.projectId === 'personal');
    } else if (projectId && projectId !== '') {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    // Apply filter
    switch (filter) {
      case 'today':
        tasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate._seconds * 1000);
          return dueDate >= today && dueDate < tomorrow;
        });
        break;
      case 'overdue':
        tasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'completed') return false;
          const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate._seconds * 1000);
          return dueDate < today;
        });
        break;
      case 'pending':
        tasks = tasks.filter(t => t.status !== 'completed');
        break;
      case 'completed':
        tasks = tasks.filter(t => t.status === 'completed');
        break;
      case 'high':
        tasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed');
        break;
      default:
        // All tasks - no filter
        break;
    }

    // Sort by due date (overdue first, then upcoming)
    tasks.sort((a, b) => {
      // Completed tasks at the end
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // No due date at the end
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && !b.dueDate) return 0;

      const aDate = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate._seconds * 1000);
      const bDate = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate._seconds * 1000);
      return aDate - bDate;
    });

    const total = tasks.length;
    tasks = tasks.slice(0, parseInt(limit));

    // Get project names for tasks
    const { admin } = require('../config/firebase');
    const db = admin.firestore();
    const projectIds = [...new Set(tasks.filter(t => t.projectId).map(t => t.projectId))];
    const projectMap = {};

    if (projectIds.length > 0) {
      const projectPromises = projectIds.map(id => db.collection('projects').doc(id).get());
      const projectDocs = await Promise.all(projectPromises);
      projectDocs.forEach(doc => {
        if (doc.exists) {
          projectMap[doc.id] = doc.data().name || 'Unnamed Project';
        }
      });
    }

    // Format tasks for response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      priority: task.priority || 'medium',
      status: task.status,
      dueDate: formatDueDate(task.dueDate),
      isOverdue: task.status !== 'completed' && isOverdue(task.dueDate),
      projectId: task.projectId,
      projectName: task.projectId ? (projectMap[task.projectId] || null) : null,
    }));

    logger.info('Widget tasks loaded', { userId, filter, count: formattedTasks.length });

    return res.json({
      success: true,
      data: {
        tasks: formattedTasks,
        total,
        isLinked: true,
      },
    });

  } catch (error) {
    logger.error('Widget tasks error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load tasks' });
  }
};

/**
 * Get projects for widget
 * GET /api/cliq/widget/projects
 */
exports.getProjects = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.json({
        success: true,
        data: { projects: [], isLinked: false },
      });
    }

    // Get user's projects
    const { admin } = require('../config/firebase');
    const db = admin.firestore();

    const projectsSnapshot = await db.collection('projects')
      .where('members', 'array-contains', taskerId)
      .limit(10)
      .get();

    const projects = [];
    
    for (const doc of projectsSnapshot.docs) {
      const projectData = doc.data();
      
      // Get task count for project
      const tasksSnapshot = await db.collection('tasks')
        .where('projectId', '==', doc.id)
        .get();

      const tasks = tasksSnapshot.docs.map(d => d.data());
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const pendingCount = tasks.filter(t => t.status !== 'completed').length;
      const totalCount = tasks.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      projects.push({
        id: doc.id,
        name: projectData.name || 'Unnamed Project',
        description: projectData.description || null,
        memberCount: (projectData.members || []).length,
        dueDate: projectData.dueDate ? formatDueDate(projectData.dueDate) : null,
        taskStats: {
          total: totalCount,
          completed: completedCount,
          pending: pendingCount,
          progress,
        },
      });
    }

    // Sort by progress (lowest first - needs attention)
    projects.sort((a, b) => a.taskStats.progress - b.taskStats.progress);

    logger.info('Widget projects loaded', { userId, count: projects.length });

    return res.json({
      success: true,
      data: {
        projects,
        isLinked: true,
      },
    });

  } catch (error) {
    logger.error('Widget projects error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load projects' });
  }
};

/**
 * Quick task creation from widget
 * POST /api/cliq/widget/quick-task
 */
exports.createQuickTask = async (req, res) => {
  try {
    const { userId, userEmail, title, projectId, dueDate, priority } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ success: false, error: 'userId and title are required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ success: false, error: 'User not linked' });
    }

    const task = await taskService.createTask({
      title: title.trim(),
      projectId: projectId && projectId !== 'personal' ? projectId : null,
      dueDate: dueDate || null,
      priority: priority || 'medium',
      assignees: [taskerId],
      createdBy: taskerId,
    });

    logger.info('Quick task created from widget', { userId, taskId: task.id });

    return res.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        priority: task.priority || 'medium',
      },
    });

  } catch (error) {
    logger.error('Quick task error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create task' });
  }
};

/**
 * Complete task from widget
 * POST /api/cliq/widget/complete-task
 */
exports.completeTask = async (req, res) => {
  try {
    const { userId, userEmail, taskId } = req.body;

    if (!userId || !taskId) {
      return res.status(400).json({ success: false, error: 'userId and taskId are required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ success: false, error: 'User not linked' });
    }

    await taskService.completeTask(taskId, taskerId);

    logger.info('Task completed from widget', { userId, taskId });

    return res.json({
      success: true,
      message: 'Task completed!',
    });

  } catch (error) {
    logger.error('Complete task error:', error);
    return res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
};

/**
 * Get task details for widget
 * GET /api/cliq/widget/task-details
 */
exports.getTaskDetails = async (req, res) => {
  try {
    const { userId, userEmail, taskId } = req.query;

    if (!userId || !taskId) {
      return res.status(400).json({ success: false, error: 'userId and taskId are required' });
    }

    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ success: false, error: 'User not linked' });
    }

    // Get task
    const task = await taskService.getTask(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Get project name if task has projectId
    let projectName = null;
    if (task.projectId) {
      const { admin } = require('../config/firebase');
      const db = admin.firestore();
      const projectDoc = await db.collection('projects').doc(task.projectId).get();
      if (projectDoc.exists) {
        projectName = projectDoc.data().name || 'Unnamed Project';
      }
    }

    // Format task for response
    // Handle encrypted descriptions
    const displayDescription = task.isDescriptionEncrypted 
      ? '🔒 Encrypted - view in app'
      : (task.description || null);
    
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: displayDescription,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: formatDueDate(task.dueDate),
      dueTime: formatDueTime(task.dueDate),
      isOverdue: task.status !== 'completed' && isOverdue(task.dueDate),
      projectId: task.projectId || null,
      projectName: projectName,
      createdAt: task.createdAt ? formatDueDate(task.createdAt) : null,
      isEncrypted: task.isDescriptionEncrypted || false,
    };

    logger.info('Task details loaded from widget', { userId, taskId });

    return res.json({
      success: true,
      data: {
        task: formattedTask,
      },
    });

  } catch (error) {
    logger.error('Task details error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load task details' });
  }
};

// ==================== Helper Functions ====================

function formatDueDate(timestamp) {
  if (!timestamp) return null;

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = taskDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDueTime(timestamp) {
  if (!timestamp) return 'EOD';

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function isOverdue(timestamp) {
  if (!timestamp) return false;

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}
