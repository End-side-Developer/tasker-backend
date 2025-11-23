const { admin } = require('../config/firebase');
const { validateTaskData, validateProjectData } = require('../utils/validators');
const { formatTaskCard, formatProjectCard, formatListCard } = require('../utils/cardFormatter');
const logger = require('../config/logger');

// Get Firestore instance (lazy initialization)
const getDb = () => admin.firestore();

/**
 * Create Task Command
 * POST /api/cliq/commands/create-task
 */
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority = 'medium',
      projectId,
      tags = [],
      dueDate,
      assignedTo,
      cliqContext
    } = req.body;

    // Validate required fields
    if (!title || !cliqContext?.userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: title and user context',
        text: '❌ Please provide a task title'
      });
    }

    // Create task document
    const taskRef = getDb().collection('tasks').doc();
    const taskId = taskRef.id;

    const taskData = {
      taskId,
      title,
      description: description || '',
      status: 'pending',
      priority,
      projectId: projectId || null,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      createdBy: cliqContext.userId,
      createdByName: cliqContext.userName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cliqContext: {
        userId: cliqContext.userId,
        userName: cliqContext.userName,
        channelId: cliqContext.channelId || null,
        messageId: cliqContext.messageId || null
      }
    };

    await taskRef.set(taskData);

    logger.info(`Task created via Cliq: ${taskId} by ${cliqContext.userName}`);

    // Format response with rich card
    const card = formatTaskCard({
      ...taskData,
      taskId
    }, 'created');

    res.status(201).json({
      success: true,
      message: `✅ Task created successfully! 🎉`,
      data: {
        taskId,
        title,
        status: 'pending',
        priority,
        createdAt: new Date().toISOString()
      },
      card,
      text: `✅ Task created: "${title}"`
    });

  } catch (error) {
    logger.error('Error creating task via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to create task',
      error: error.message,
      text: '❌ Failed to create task. Please try again.'
    });
  }
};

/**
 * List Tasks Command
 * GET /api/cliq/commands/list-tasks?status=pending&priority=high&projectId=xyz&assignedTo=user123
 */
exports.listTasks = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      projectId, 
      assignedTo, 
      userId,
      limit = 10 
    } = req.query;

    let query = getDb().collection('tasks');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (priority) {
      query = query.where('priority', '==', priority);
    }
    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }
    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }
    if (userId && !assignedTo) {
      // If userId provided but not assignedTo, show user's tasks
      query = query.where('createdBy', '==', userId);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();
    
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({
        taskId: doc.id,
        ...doc.data()
      });
    });

    logger.info(`Listed ${tasks.length} tasks via Cliq`);

    // Format response
    const card = formatListCard(tasks, 'tasks', { status, priority, projectId });

    res.json({
      success: true,
      message: `Found ${tasks.length} task(s)`,
      data: tasks,
      card,
      text: `📋 Found ${tasks.length} task(s)`
    });

  } catch (error) {
    logger.error('Error listing tasks via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to list tasks',
      error: error.message,
      text: '❌ Failed to retrieve tasks. Please try again.'
    });
  }
};

/**
 * Assign Task Command
 * POST /api/cliq/commands/assign-task
 */
exports.assignTask = async (req, res) => {
  try {
    const { taskId, assignedTo, assignedToName, assignedBy, assignedByName } = req.body;

    if (!taskId || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: taskId and assignedTo',
        text: '❌ Please provide task ID and assignee'
      });
    }

    const taskRef = getDb().collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Task not found',
        text: `❌ Task ${taskId} not found`
      });
    }

    await taskRef.update({
      assignedTo,
      assignedToName: assignedToName || assignedTo,
      assignedBy: assignedBy || 'system',
      assignedByName: assignedByName || 'System',
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const taskData = taskDoc.data();

    logger.info(`Task ${taskId} assigned to ${assignedTo} via Cliq`);

    const card = formatTaskCard({
      ...taskData,
      taskId,
      assignedTo,
      assignedToName
    }, 'assigned');

    res.json({
      success: true,
      message: `✅ Task assigned to ${assignedToName || assignedTo}`,
      data: {
        taskId,
        assignedTo,
        assignedToName
      },
      card,
      text: `✅ Task "${taskData.title}" assigned to ${assignedToName || assignedTo}`
    });

  } catch (error) {
    logger.error('Error assigning task via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to assign task',
      error: error.message,
      text: '❌ Failed to assign task. Please try again.'
    });
  }
};

/**
 * Complete Task Command
 * POST /api/cliq/commands/complete-task
 */
exports.completeTask = async (req, res) => {
  try {
    const { taskId, completedBy, completedByName, notes } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required field: taskId',
        text: '❌ Please provide task ID'
      });
    }

    const taskRef = getDb().collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Task not found',
        text: `❌ Task ${taskId} not found`
      });
    }

    await taskRef.update({
      status: 'completed',
      completedBy: completedBy || 'unknown',
      completedByName: completedByName || 'User',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completionNotes: notes || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const taskData = taskDoc.data();

    logger.info(`Task ${taskId} completed via Cliq by ${completedByName}`);

    const card = formatTaskCard({
      ...taskData,
      taskId,
      status: 'completed'
    }, 'completed');

    res.json({
      success: true,
      message: `✅ Task completed! 🎉`,
      data: {
        taskId,
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      card,
      text: `✅ Task "${taskData.title}" marked as complete! 🎉`
    });

  } catch (error) {
    logger.error('Error completing task via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to complete task',
      error: error.message,
      text: '❌ Failed to complete task. Please try again.'
    });
  }
};

/**
 * Search Tasks Command
 * GET /api/cliq/commands/search?query=keyword&userId=user123
 */
exports.searchTasks = async (req, res) => {
  try {
    const { query: searchQuery, userId } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing search query',
        text: '❌ Please provide a search keyword'
      });
    }

    // Search in title and description
    const tasksRef = getDb().collection('tasks');
    let queryRef = tasksRef;

    if (userId) {
      queryRef = queryRef.where('createdBy', '==', userId);
    }

    const snapshot = await queryRef.get();
    
    const tasks = [];
    const searchLower = searchQuery.toLowerCase();

    snapshot.forEach(doc => {
      const data = doc.data();
      const titleMatch = data.title?.toLowerCase().includes(searchLower);
      const descMatch = data.description?.toLowerCase().includes(searchLower);
      const tagsMatch = data.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      if (titleMatch || descMatch || tagsMatch) {
        tasks.push({
          taskId: doc.id,
          ...data
        });
      }
    });

    logger.info(`Search found ${tasks.length} tasks for query: ${searchQuery}`);

    const card = formatListCard(tasks, 'search', { query: searchQuery });

    res.json({
      success: true,
      message: `Found ${tasks.length} task(s) matching "${searchQuery}"`,
      data: tasks,
      card,
      text: `🔍 Found ${tasks.length} task(s) for "${searchQuery}"`
    });

  } catch (error) {
    logger.error('Error searching tasks via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to search tasks',
      error: error.message,
      text: '❌ Search failed. Please try again.'
    });
  }
};

/**
 * Create Project Command
 * POST /api/cliq/commands/create-project
 */
exports.createProject = async (req, res) => {
  try {
    const { name, description, color, icon, createdBy, createdByName } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: name and user context',
        text: '❌ Please provide a project name'
      });
    }

    const projectRef = getDb().collection('projects').doc();
    const projectId = projectRef.id;

    const projectData = {
      projectId,
      name,
      description: description || '',
      color: color || 'blue',
      icon: icon || '📁',
      ownerId: createdBy,
      ownerName: createdByName || 'User',
      members: [createdBy],
      memberRoles: {
        [createdBy]: 'owner'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await projectRef.set(projectData);

    logger.info(`Project created via Cliq: ${projectId} by ${createdByName}`);

    const card = formatProjectCard({
      ...projectData,
      projectId
    }, 'created');

    res.status(201).json({
      success: true,
      message: `✅ Project "${name}" created successfully! 🎉`,
      data: {
        projectId,
        name,
        createdAt: new Date().toISOString()
      },
      card,
      text: `✅ Project "${name}" created`
    });

  } catch (error) {
    logger.error('Error creating project via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to create project',
      error: error.message,
      text: '❌ Failed to create project. Please try again.'
    });
  }
};

/**
 * List Projects Command
 * GET /api/cliq/commands/list-projects?userId=user123
 */
exports.listProjects = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing userId',
        text: '❌ User context required'
      });
    }

    const snapshot = await getDb().collection('projects')
      .where('members', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const projects = [];
    snapshot.forEach(doc => {
      projects.push({
        projectId: doc.id,
        ...doc.data()
      });
    });

    logger.info(`Listed ${projects.length} projects for user ${userId}`);

    const card = formatListCard(projects, 'projects');

    res.json({
      success: true,
      message: `Found ${projects.length} project(s)`,
      data: projects,
      card,
      text: `📁 You have ${projects.length} project(s)`
    });

  } catch (error) {
    logger.error('Error listing projects via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to list projects',
      error: error.message,
      text: '❌ Failed to retrieve projects. Please try again.'
    });
  }
};

/**
 * Invite Member Command
 * POST /api/cliq/commands/invite-member
 */
exports.inviteMember = async (req, res) => {
  try {
    const { projectId, email, role = 'editor', invitedBy, invitedByName } = req.body;

    if (!projectId || !email || !invitedBy) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Please provide project ID, email, and inviter context'
      });
    }

    // Check if project exists
    const projectDoc = await getDb().collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Project not found',
        text: `❌ Project not found`
      });
    }

    const projectData = projectDoc.data();

    // Create invitation
    const invitationRef = getDb().collection('invitations').doc();
    const invitationData = {
      invitationId: invitationRef.id,
      projectId,
      projectName: projectData.name,
      invitedEmail: email,
      invitedBy,
      invitedByName: invitedByName || 'User',
      role,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await invitationRef.set(invitationData);

    logger.info(`Invitation sent to ${email} for project ${projectId}`);

    res.status(201).json({
      success: true,
      message: `✅ Invitation sent to ${email}`,
      data: {
        invitationId: invitationRef.id,
        email,
        projectName: projectData.name,
        role
      },
      text: `✅ Invitation sent to ${email} for project "${projectData.name}"`
    });

  } catch (error) {
    logger.error('Error sending invitation via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to send invitation',
      error: error.message,
      text: '❌ Failed to send invitation. Please try again.'
    });
  }
};
