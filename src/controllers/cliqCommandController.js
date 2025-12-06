const { admin } = require('../config/firebase');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');
const { validateTaskData, validateProjectData } = require('../utils/validators');
const { formatTaskCard, formatProjectCard, formatListCard } = require('../utils/cardFormatter');
const logger = require('../config/logger');

// Get Firestore instance (lazy initialization)
const getDb = () => admin.firestore();

/**
 * Check if user is a member of a project (any role)
 * In Cliq, all project members have full access regardless of role
 * @param {string} projectId - Project document ID
 * @param {string} cliqUserId - Cliq user ID
 * @param {string} cliqEmail - Cliq user email (optional)
 * @returns {Promise<{isMember: boolean, firebaseUserId: string|null, projectData: object|null}>}
 */
const checkProjectMembership = async (projectId, cliqUserId, cliqEmail = null) => {
  if (!projectId) {
    return { isMember: true, firebaseUserId: null, projectData: null }; // Personal task, no project
  }

  const projectRef = getDb().collection('projects').doc(projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    return { isMember: false, firebaseUserId: null, projectData: null, error: 'Project not found' };
  }

  const projectData = projectDoc.data();
  
  // Get Firebase user ID from Cliq mapping
  let firebaseUserId = await cliqService.mapCliqUserToTasker(cliqUserId, cliqEmail);
  
  // Check membership with both IDs
  const memberIds = new Set(projectData.members || []);
  const isMember = memberIds.has(cliqUserId) || (firebaseUserId && memberIds.has(firebaseUserId));

  return { isMember, firebaseUserId, projectData, projectId };
};

const normalizeStatusFilter = (status) => {
  if (!status) return undefined;
  const lower = status.toString().toLowerCase();
  if (lower === 'pending') return 'pending';
  if (lower === 'completed') return 'completed';
  if (lower === 'in_progress' || lower === 'in-progress' || lower === 'inprogress') {
    return 'inProgress';
  }
  return status;
};

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
      reminderEnabled = true,
      recurrencePattern = 'none',
      recurrenceInterval = 1,
      recurrenceEndDate,
      parentRecurringTaskId,
      isDescriptionEncrypted = false,
      status,
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

    // Check project membership if creating task in a project
    if (projectId) {
      const membership = await checkProjectMembership(projectId, cliqContext.userId, cliqContext.userEmail);
      if (membership.error) {
        return res.status(404).json({
          success: false,
          message: `❌ ${membership.error}`,
          text: `❌ ${membership.error}`
        });
      }
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: '❌ You must be a project member to create tasks',
          text: '❌ You are not a member of this project'
        });
      }
    }

    // Try to get mapped Firebase user ID first
    let firebaseUserId = await cliqService.mapCliqUserToTasker(cliqContext.userId);
    
    // If no mapping exists and email provided, try to find by email
    if (!firebaseUserId && cliqContext.userEmail) {
      const userSnapshot = await getDb().collection('users')
        .where('email', '==', cliqContext.userEmail)
        .limit(1)
        .get();
      
      if (!userSnapshot.empty) {
        firebaseUserId = userSnapshot.docs[0].id;
        logger.info(`Found Firebase user by email for task creation: ${cliqContext.userEmail} -> ${firebaseUserId}`);
      }
    }

    // Use Firebase user ID if found, otherwise fall back to Cliq user ID
    const actualUserId = firebaseUserId || cliqContext.userId;

    const assignees = assignedTo ? [assignedTo] : [actualUserId];

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
      assignees,
      assignedBy: actualUserId,
      isDescriptionEncrypted,
      status,
      createdBy: actualUserId,
    });

    logger.info(`Task created via Cliq: ${task.id} by ${cliqContext.userName} (Firebase ID: ${actualUserId})`);

    const card = formatTaskCard(task, 'created');

    res.status(201).json({
      success: true,
      message: `✅ Task created successfully! 🎉`,
      data: {
        id: task.id,
        title,
        status: task.status,
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
 * GET /api/cliq/commands/list-tasks?status=pending&priority=high&projectId=xyz
 */
exports.listTasks = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      projectId, 
      userId,
      email,
      limit = 10 
    } = req.query;

    // Require user context to avoid leaking all tasks
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing userId',
        text: '❌ User context required'
      });
    }

    const safeLimit = Math.min(parseInt(limit) || 10, 50);

    // Map Cliq user to Tasker user (if linked); fall back to Cliq ID
    const mappedUserId = await cliqService.mapCliqUserToTasker(userId, email);
    const userIdsToMatch = Array.from(new Set([mappedUserId, userId].filter(Boolean)));

    let query = getDb().collection('tasks');
    const normalizedStatus = normalizeStatusFilter(status);

    // Apply filters
    if (normalizedStatus) {
      query = query.where('status', '==', normalizedStatus);
    }
    if (priority) {
      // Priority is stored as enum string: low, medium, high, urgent
      query = query.where('priority', '==', priority);
    }
    if (projectId) {
      // Ensure caller is a member before listing project tasks
      const membership = await checkProjectMembership(projectId, userId, email);
      if (membership.error) {
        return res.status(404).json({
          success: false,
          message: `❌ ${membership.error}`,
          text: `❌ ${membership.error}`
        });
      }
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: '❌ You must be a project member to view tasks',
          text: '❌ You are not a member of this project'
        });
      }

      query = query.where('projectId', '==', projectId);
    }

    // Scoped retrieval: tasks assigned to the user OR created by the user
    const fetchTasks = async () => {
      const taskMap = new Map();

      for (const id of userIdsToMatch) {
        // Assigned to user
        let assignedQuery = query.where('assignees', 'array-contains', id).orderBy('createdAt', 'desc').limit(safeLimit);
        const assignedSnapshot = await assignedQuery.get();
        assignedSnapshot.forEach(doc => taskMap.set(doc.id, { id: doc.id, ...doc.data() }));

        // Created by user
        let createdQuery = query.where('createdBy', '==', id).orderBy('createdAt', 'desc').limit(safeLimit);
        const createdSnapshot = await createdQuery.get();
        createdSnapshot.forEach(doc => taskMap.set(doc.id, { id: doc.id, ...doc.data() }));
      }

      // Sort by createdAt desc and apply final limit
      const tasks = Array.from(taskMap.values()).sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate - aDate;
      });

      return tasks.slice(0, safeLimit);
    };

    const tasks = await fetchTasks();

    logger.info(`Listed ${tasks.length} tasks via Cliq`);

    // Priority emoji helper
    const getPriorityEmoji = (p) => {
      const emojis = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
      return emojis[p] || '⚪';
    };

    // Build text response
    let filterInfo = '';
    if (priority) filterInfo += `Priority: ${priority} `;
    if (normalizedStatus) filterInfo += `Status: ${normalizedStatus} `;
    
    let textResponse = `📋 *Tasks${filterInfo ? ' (' + filterInfo.trim() + ')' : ''} - ${tasks.length} found*\n\n`;
    
    if (tasks.length === 0) {
      textResponse = priority 
        ? `📋 No ${priority} priority tasks found.`
        : normalizedStatus === 'pending' 
          ? '✅ Great! You have no pending tasks.' 
          : '📋 No tasks found matching your criteria.';
    } else {
      const displayTasks = tasks.slice(0, 10);
      displayTasks.forEach((task, index) => {
        const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'inProgress' ? '🔄' : '📌';
        const priorityEmoji = getPriorityEmoji(task.priority);
        textResponse += `${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.title}\n`;
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
          textResponse += `   Due: ${dueDate.toLocaleDateString()}\n`;
        }
        textResponse += `\n`;
      });
      
      if (tasks.length > 10) {
        textResponse += `\n... and ${tasks.length - 10} more tasks`;
      }
    }

    res.json({
      success: true,
      message: `Found ${tasks.length} task(s)`,
      data: tasks,
      text: textResponse
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
    const { taskId, assignedTo, assignedToName, assignedBy, assignedByName, assignedByEmail } = req.body;

    if (!taskId || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: taskId and assignedTo',
        text: '❌ Please provide task ID and assignee'
      });
    }

    // Map Cliq user IDs to Tasker user IDs
    // assignedTo is a Cliq user ID, we need the Tasker user ID
    const taskerAssigneeId = await cliqService.mapCliqUserToTasker(assignedTo);
    const taskerAssignerId = assignedBy ? await cliqService.mapCliqUserToTasker(assignedBy) : null;

    if (!taskerAssigneeId) {
      logger.warn(`Cannot assign task: Cliq user ${assignedTo} is not linked to Tasker`);
      return res.status(400).json({
        success: false,
        message: '❌ User not linked to Tasker',
        text: `❌ ${assignedToName || 'This user'} has not linked their Tasker account. They need to link first using /tasker link`
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

    const taskData = taskDoc.data();

    // Check project membership if task belongs to a project
    if (taskData.projectId && assignedBy) {
      const membership = await checkProjectMembership(taskData.projectId, assignedBy, assignedByEmail);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: '❌ You must be a project member to assign tasks',
          text: '❌ You are not a member of this project'
        });
      }
    }

    // Use Tasker user ID (not Cliq ID) for assignees
    await taskRef.update({
      assignees: admin.firestore.FieldValue.arrayUnion(taskerAssigneeId),
      assignedBy: taskerAssignerId || assignedBy || 'system',
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Task ${taskId} assigned to Tasker user ${taskerAssigneeId} (Cliq: ${assignedTo}) via Cliq`);

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
    const { taskId, completedBy, completedByName, completedByEmail, notes } = req.body;

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

    const taskData = taskDoc.data();

    // Check project membership if task belongs to a project
    if (taskData.projectId && completedBy) {
      const membership = await checkProjectMembership(taskData.projectId, completedBy, completedByEmail);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: '❌ You must be a project member to complete tasks',
          text: '❌ You are not a member of this project'
        });
      }
    }

    await taskRef.update({
      status: 'completed',
      completedBy: completedBy || 'unknown',
      completedByName: completedByName || 'User',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completionNotes: notes || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Task ${taskId} completed via Cliq by ${completedByName}`);

    const card = formatTaskCard({
      id: taskId,
      ...taskData,
      status: 'completed'
    }, 'completed');

    res.json({
      success: true,
      message: `✅ Task completed! 🎉`,
      data: {
        id: taskId,
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

    // Search in title and description - fetch all tasks first
    // (Same approach as listTasks - no user filtering since tasks may not have assignees)
    const tasksRef = getDb().collection('tasks');
    const snapshot = await tasksRef.orderBy('createdAt', 'desc').limit(100).get();
    
    const tasks = [];
    const searchLower = searchQuery.toLowerCase();

    snapshot.forEach(doc => {
      const data = doc.data();
      const titleMatch = data.title?.toLowerCase().includes(searchLower);
      const descMatch = data.description?.toLowerCase().includes(searchLower);

      if (titleMatch || descMatch) {
        tasks.push({
          id: doc.id,
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
    const { name, description, color, icon, createdBy, createdByName, email } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields: name and user context',
        text: '❌ Please provide a project name'
      });
    }

    // Try to get mapped Firebase user ID first
    const cliqService = require('../services/cliqService');
    let firebaseUserId = await cliqService.mapCliqUserToTasker(createdBy);
    
    // If no mapping exists and email provided, try to find by email
    if (!firebaseUserId && email) {
      const userSnapshot = await getDb().collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!userSnapshot.empty) {
        firebaseUserId = userSnapshot.docs[0].id;
        logger.info(`Found Firebase user by email for project creation: ${email} -> ${firebaseUserId}`);
      }
    }

    // Use Firebase user ID if found, otherwise fall back to Cliq user ID
    const actualUserId = firebaseUserId || createdBy;

    const projectRef = getDb().collection('projects').doc();
    const projectId = projectRef.id;

    const projectData = {
      name,
      description: description || null,
      members: [actualUserId],
      ownerId: actualUserId,
      memberRoles: {
        [actualUserId]: 'owner'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null
    };

    await projectRef.set(projectData);

    logger.info(`Project created via Cliq: ${projectId} by ${createdByName} (Firebase ID: ${actualUserId})`);

    // Create owner as first member in subcollection
    await getDb().collection('projects').doc(projectId).collection('members').doc(actualUserId).set({
      userId: actualUserId,
      email: email || cliqContext.userEmail || 'unknown@example.com',
      displayName: createdByName || 'User',
      photoUrl: null,
      role: 'owner',
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: actualUserId
    });

    const card = formatProjectCard({
      id: projectId,
      ...projectData
    }, 'created');

    res.status(201).json({
      success: true,
      message: `✅ Project "${name}" created successfully! 🎉`,
      data: {
        id: projectId,
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
 * GET /api/cliq/commands/list-projects?userId=user123&email=user@example.com
 */
exports.listProjects = async (req, res) => {
  try {
    const { userId, email } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing userId',
        text: '❌ User context required'
      });
    }

    // Try to get mapped Firebase user ID first
    const cliqService = require('../services/cliqService');
    let firebaseUserId = await cliqService.mapCliqUserToTasker(userId);
    
    // If no mapping exists and email provided, try to find by email
    if (!firebaseUserId && email) {
      const userSnapshot = await getDb().collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!userSnapshot.empty) {
        firebaseUserId = userSnapshot.docs[0].id;
        logger.info(`Found Firebase user by email: ${email} -> ${firebaseUserId}`);
      }
    }

    // Query with both IDs to get all projects
    const queries = [userId];
    if (firebaseUserId && firebaseUserId !== userId) {
      queries.push(firebaseUserId);
    }

    const allProjects = new Map();
    
    for (const queryUserId of queries) {
      const snapshot = await getDb().collection('projects')
        .where('members', 'array-contains', queryUserId)
        .orderBy('createdAt', 'desc')
        .get();
      
      snapshot.forEach(doc => {
        if (!allProjects.has(doc.id)) {
          allProjects.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        }
      });
    }

    const projects = Array.from(allProjects.values());

    logger.info(`Listed ${projects.length} projects for user ${userId} (Firebase: ${firebaseUserId})`);

    const card = formatListCard(projects, 'projects');

    // Build formatted text with project names
    let textResponse = `📁 You have ${projects.length} project(s)\n\n`;
    if (projects.length > 0) {
      const displayProjects = projects.slice(0, 10);
      displayProjects.forEach((project, index) => {
        const memberCount = project.members?.length || 0;
        textResponse += `${index + 1}. ${project.name} - ${memberCount} member${memberCount !== 1 ? 's' : ''}\n`;
      });
      if (projects.length > 10) {
        textResponse += `\n... and ${projects.length - 10} more projects`;
      }
    }

    res.json({
      success: true,
      message: `Found ${projects.length} project(s)`,
      data: projects,
      card,
      text: textResponse.trim()
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
 * 
 * Smart email resolution:
 * - If invitee has linked their Cliq to Tasker → use their Tasker email
 * - If invitee is NOT linked → use their Cliq email as-is
 */
exports.inviteMember = async (req, res) => {
  try {
    const { projectId, email: cliqEmail, role = 'editor', invitedBy, invitedByName, invitedByEmail, message } = req.body;

    if (!projectId || !cliqEmail || !invitedBy) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Please provide project ID, email, and inviter context'
      });
    }

    // Check project membership - only members can invite
    const membership = await checkProjectMembership(projectId, invitedBy, invitedByEmail);
    if (membership.error) {
      return res.status(404).json({
        success: false,
        message: `❌ ${membership.error}`,
        text: `❌ ${membership.error}`
      });
    }
    if (!membership.isMember) {
      return res.status(403).json({
        success: false,
        message: '❌ You must be a project member to invite others',
        text: '❌ You are not a member of this project'
      });
    }

    // Smart email resolution: Check if invitee has linked their Cliq to Tasker
    const linkedAccount = await cliqService.getTaskerEmailByCliqEmail(cliqEmail);
    
    // Use Tasker email if linked, otherwise use Cliq email
    const email = linkedAccount.isLinked && linkedAccount.taskerEmail 
      ? linkedAccount.taskerEmail 
      : cliqEmail;
    
    logger.info('Invite member - email resolution', {
      cliqEmail,
      resolvedEmail: email,
      isLinked: linkedAccount.isLinked
    });

    const projectData = membership.projectData;

    // Check if invited user exists (using the resolved email)
    const userSnapshot = await getDb().collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    const invitedUserId = !userSnapshot.empty ? userSnapshot.docs[0].id : null;

    // Create invitation
    const invitationRef = getDb().collection('invitations').doc();
    const invitationData = {
      projectId,
      projectName: projectData.name,
      invitedByUserId: invitedBy,
      invitedByUserName: invitedByName || 'User',
      invitedEmail: email.toLowerCase(),
      cliqEmail: cliqEmail.toLowerCase(), // Store original Cliq email for reference
      invitedUserId: invitedUserId,
      status: 'pending',
      role,
      message: message || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      respondedAt: null
    };

    await invitationRef.set(invitationData);

    // If user exists, add to their pendingInvitations subcollection
    if (invitedUserId) {
      await getDb().collection('users')
        .doc(invitedUserId)
        .collection('pendingInvitations')
        .doc(invitationRef.id)
        .set({
          invitationId: invitationRef.id,
          projectId,
          projectName: projectData.name,
          invitedBy: invitedByName || 'User',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    logger.info(`Invitation sent to ${email} for project ${projectId}`, {
      cliqEmail,
      resolvedEmail: email,
      wasLinked: linkedAccount.isLinked
    });

    // Build response message
    let responseText = `✅ Invitation sent to ${email} for project "${projectData.name}"`;
    
    // If email was resolved from linked account, mention it
    if (linkedAccount.isLinked && linkedAccount.taskerEmail && cliqEmail.toLowerCase() !== email.toLowerCase()) {
      responseText = `✅ Invitation sent to *${email}* (Tasker account linked to ${cliqEmail}) for project "${projectData.name}"`;
    }

    res.status(201).json({
      success: true,
      message: `✅ Invitation sent to ${email}`,
      data: {
        id: invitationRef.id,
        email,
        cliqEmail,
        projectName: projectData.name,
        role,
        wasLinked: linkedAccount.isLinked
      },
      text: responseText
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

/**
 * Get Project Details Command
 * GET /api/cliq/commands/project-details?projectId=xyz&userId=user123&email=user@example.com
 */
exports.getProjectDetails = async (req, res) => {
  try {
    const { projectId, userId, email } = req.query;

    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Project ID and user ID required'
      });
    }

    // Map Cliq user ID to Firebase user ID (with email fallback)
    const cliqService = require('../services/cliqService');
    const firebaseUserId = await cliqService.mapCliqUserToTasker(userId, email);
    
    if (!firebaseUserId) {
      return res.status(403).json({
        success: false,
        message: '❌ User not found',
        text: '❌ Could not find your user account'
      });
    }

    // Get project document
    const projectDoc = await getDb().collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Project not found',
        text: `❌ Project not found`
      });
    }

    const projectData = projectDoc.data();

    // Check if user has access to this project (using Firebase ID)
    const hasAccess = projectData.members?.includes(firebaseUserId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '❌ Access denied',
        text: '❌ You do not have access to this project'
      });
    }

    // Get members from subcollection
    const membersSnapshot = await getDb().collection('projects')
      .doc(projectId)
      .collection('members')
      .get();
    
    const members = [];
    membersSnapshot.forEach(doc => {
      const memberData = doc.data();
      members.push({
        userId: doc.id,
        name: memberData.displayName || memberData.email,
        email: memberData.email,
        role: memberData.role || projectData.memberRoles?.[doc.id] || 'viewer',
        addedAt: memberData.addedAt?.toDate().toISOString()
      });
    });

    // Get task statistics
    const tasksSnapshot = await getDb().collection('tasks')
      .where('projectId', '==', projectId)
      .get();
    
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    
    tasksSnapshot.forEach(doc => {
      const taskData = doc.data();
      totalTasks++;
      if (taskData.status === 'completed') {
        completedTasks++;
      } else {
        pendingTasks++;
      }
    });

    // Get owner info
    const ownerId = projectData.ownerId;
    const ownerDoc = await getDb().collection('users').doc(ownerId).get();
    const ownerData = ownerDoc.exists ? ownerDoc.data() : null;

    const projectDetails = {
      id: projectId,
      name: projectData.name,
      description: projectData.description || 'No description',
      createdBy: ownerData?.displayName || ownerData?.email || 'Unknown',
      createdAt: projectData.createdAt?.toDate().toISOString() || 'Unknown',
      memberCount: members.length,
      members: members,
      totalTasks,
      completedTasks,
      pendingTasks
    };

    logger.info(`Retrieved details for project ${projectId}`);

    res.json({
      success: true,
      message: `Project details retrieved`,
      data: projectDetails,
      text: `📋 Project: ${projectData.name}`
    });

  } catch (error) {
    logger.error('Error getting project details via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to get project details',
      error: error.message,
      text: '❌ Failed to retrieve project details. Please try again.'
    });
  }
};

/**
 * Check User Registration Status
 * GET /api/cliq/commands/check-user?email=user@example.com
 */
exports.checkUser = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '❌ Email is required',
        exists: false
      });
    }

    // Check if user exists in Firestore
    const userSnapshot = await getDb().collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    const userExists = !userSnapshot.empty;

    logger.info(`User check for ${email}: ${userExists ? 'registered' : 'not registered'}`);

    res.status(200).json({
      success: true,
      exists: userExists,
      message: userExists 
        ? `✅ User is registered on Tasker` 
        : `⚠️ User is not registered on Tasker`,
      data: {
        email: email.toLowerCase(),
        registered: userExists
      }
    });

  } catch (error) {
    logger.error('Error checking user registration:', error);
    res.status(500).json({
      success: false,
      exists: false,
      message: '❌ Error checking user registration',
      error: error.message
    });
  }
};
/**
 * Get Project Members Command
 * GET /api/cliq/commands/project-members?projectId=xyz&userId=user123&email=user@example.com
 */
exports.getProjectMembers = async (req, res) => {
  try {
    const { projectId, userId, email } = req.query;

    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Project ID and user ID required'
      });
    }

    // Map Cliq user ID to Firebase user ID (with email fallback)
    const cliqService = require('../services/cliqService');
    const firebaseUserId = await cliqService.mapCliqUserToTasker(userId, email);
    
    if (!firebaseUserId) {
      return res.status(403).json({
        success: false,
        message: '❌ User not found',
        text: '❌ Could not find your user account'
      });
    }

    // Get project document
    const projectDoc = await getDb().collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Project not found',
        text: `❌ Project not found`
      });
    }

    const projectData = projectDoc.data();

    // Check if user has access to this project (using Firebase ID)
    const hasAccess = projectData.members?.includes(firebaseUserId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '❌ Access denied',
        text: '❌ You do not have access to this project'
      });
    }

    // Fetch member details
    const memberIds = projectData.members || [];
    const memberDetails = [];

    for (const memberId of memberIds) {
      const userDoc = await getDb().collection('users').doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        memberDetails.push({
          id: memberId,
          name: userData.displayName || userData.name || userData.email || 'Unknown',
          email: userData.email || '',
          role: projectData.memberRoles?.[memberId] || 'member'
        });
      }
    }

    logger.info(`Listed ${memberDetails.length} members for project ${projectId}`);

    // Format response text
    let textResponse = `👥 *${projectData.name}*\n\n`;
    textResponse += `*Members (${memberDetails.length}):*\n\n`;
    
    memberDetails.forEach((member, index) => {
      const roleEmoji = member.role === 'owner' ? '👑' : member.role === 'editor' ? '✏️' : '👁️';
      textResponse += `${index + 1}. ${roleEmoji} *${member.name}*\n`;
      textResponse += `   Email: ${member.email}\n`;
      textResponse += `   Role: ${member.role}\n\n`;
    });

    res.status(200).json({
      success: true,
      message: 'Members retrieved successfully',
      text: textResponse,
      data: {
        projectId,
        projectName: projectData.name,
        members: memberDetails,
        totalMembers: memberDetails.length
      }
    });

  } catch (error) {
    logger.error('Error getting project members:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to get project members',
      error: error.message,
      text: '❌ Failed to retrieve project members. Please try again.'
    });
  }
};

/**
 * Get Task Details Command
 * GET /api/cliq/commands/task-details?taskId=xyz&userId=user123&email=user@example.com
 */
exports.getTaskDetails = async (req, res) => {
  try {
    const { taskId, userId, email } = req.query;

    if (!taskId || !userId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Task ID and user ID required'
      });
    }

    // Map Cliq user ID to Firebase user ID (with email fallback)
    const cliqService = require('../services/cliqService');
    const firebaseUserId = await cliqService.mapCliqUserToTasker(userId, email);
    
    if (!firebaseUserId) {
      return res.status(403).json({
        success: false,
        message: '❌ User not found',
        text: '❌ Could not find your user account'
      });
    }

    // Get task document
    const taskDoc = await getDb().collection('tasks').doc(taskId).get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Task not found',
        text: `❌ Task not found`
      });
    }

    const taskData = taskDoc.data();

    // Format response text
    let textResponse = `📋 *Task Details*\n\n`;
    textResponse += `*Title:* ${taskData.title}\n\n`;
    
    // Handle encrypted descriptions
    if (taskData.isDescriptionEncrypted) {
      textResponse += `*Description:* 🔒 _Encrypted content - open in Tasker app to view_\n\n`;
    } else if (taskData.description) {
      textResponse += `*Description:* ${taskData.description}\n\n`;
    }
    
    const statusEmoji = taskData.status === 'completed' ? '✅' : taskData.status === 'inProgress' ? '🔄' : '📌';
    textResponse += `*Status:* ${statusEmoji} ${taskData.status}\n\n`;
    
    if (taskData.projectId) {
      const projectDoc = await getDb().collection('projects').doc(taskData.projectId).get();
      if (projectDoc.exists) {
        textResponse += `*Project:* ${projectDoc.data().name}\n\n`;
      }
    }
    
    if (taskData.dueDate) {
      const dueDate = taskData.dueDate.toDate();
      textResponse += `*Due Date:* ${dueDate.toLocaleDateString()}\n\n`;
    }
    
    if (taskData.assignees && taskData.assignees.length > 0) {
      textResponse += `*Assignees:* `;
      for (let i = 0; i < taskData.assignees.length; i++) {
        const assigneeDoc = await getDb().collection('users').doc(taskData.assignees[i]).get();
        if (assigneeDoc.exists) {
          const assigneeData = assigneeDoc.data();
          textResponse += assigneeData.displayName || assigneeData.email;
          if (i < taskData.assignees.length - 1) textResponse += ', ';
        }
      }
      textResponse += `\n\n`;
    }
    
    if (taskData.createdAt) {
      const createdDate = taskData.createdAt.toDate();
      textResponse += `*Created:* ${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString()}\n\n`;
    }
    
    if (taskData.completedAt) {
      const completedDate = taskData.completedAt.toDate();
      textResponse += `*Completed:* ${completedDate.toLocaleDateString()} at ${completedDate.toLocaleTimeString()}\n\n`;
    }
    
    if (taskData.completionNotes) {
      textResponse += `*Completion Notes:* ${taskData.completionNotes}\n\n`;
    }

    logger.info(`Retrieved task details for ${taskId}`);

    res.status(200).json({
      success: true,
      message: 'Task details retrieved successfully',
      text: textResponse,
      data: {
        id: taskId,
        ...taskData
      }
    });

  } catch (error) {
    logger.error('Error getting task details:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to get task details',
      error: error.message,
      text: '❌ Failed to retrieve task details. Please try again.'
    });
  }
};

/**
 * Delete Task Command
 * POST /api/cliq/commands/delete-task
 */
exports.deleteTask = async (req, res) => {
  try {
    const { taskId, requestedBy, requestedByName, requestedByEmail, reason } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing taskId',
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

    const taskData = taskDoc.data();

    // Check project membership if task belongs to a project
    if (taskData.projectId && requestedBy) {
      const membership = await checkProjectMembership(taskData.projectId, requestedBy, requestedByEmail);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: '❌ You must be a project member to delete tasks',
          text: '❌ You are not a member of this project'
        });
      }
    }

    await taskRef.delete();

    logger.info(`Task ${taskId} deleted via Cliq by ${requestedByName || requestedBy}`);

    res.json({
      success: true,
      message: '🗑️ Task deleted',
      text: `🗑️ Task "${taskData.title}" deleted${reason ? ' (' + reason + ')' : ''}`,
      data: {
        id: taskId,
        deletedBy: requestedBy || 'unknown',
        deletedByEmail: requestedByEmail || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error deleting task via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to delete task',
      error: error.message,
      text: '❌ Failed to delete task. Please try again.'
    });
  }
};

/**
 * Delete Project Command
 * POST /api/cliq/commands/delete-project
 */
exports.deleteProject = async (req, res) => {
  try {
    const { projectId, requestedBy, requestedByName, requestedByEmail, confirmCascade = false } = req.body;
    const cascadeDelete = confirmCascade === true || confirmCascade === 'true';

    if (!projectId || !requestedBy) {
      return res.status(400).json({
        success: false,
        message: '❌ Missing required fields',
        text: '❌ Project ID and user context required'
      });
    }

    const projectRef = getDb().collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '❌ Project not found',
        text: `❌ Project not found`
      });
    }

    const projectData = projectDoc.data();

    // Ensure only owners can delete projects
    const cliqService = require('../services/cliqService');
    let firebaseUserId = await cliqService.mapCliqUserToTasker(requestedBy, requestedByEmail);
    const allowedIds = new Set([requestedBy]);
    if (firebaseUserId) {
      allowedIds.add(firebaseUserId);
    }

    const isOwner = Array.from(allowedIds).some(id => projectData.memberRoles?.[id] === 'owner');
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: '❌ Only project owners can delete projects',
        text: '❌ Only owners can delete this project'
      });
    }

    // Delete related tasks if confirmation provided
    if (cascadeDelete) {
      const tasksSnapshot = await getDb().collection('tasks').where('projectId', '==', projectId).get();
      if (!tasksSnapshot.empty) {
        const batch = getDb().batch();
        tasksSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // Delete members subcollection
    const membersSnapshot = await projectRef.collection('members').get();
    if (!membersSnapshot.empty) {
      const batch = getDb().batch();
      membersSnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    await projectRef.delete();

    logger.info(`Project ${projectId} deleted via Cliq by ${requestedByName || requestedBy}`);

    res.json({
      success: true,
      message: '🗑️ Project deleted',
      text: `🗑️ Project "${projectData.name}" deleted${cascadeDelete ? ' (including linked tasks)' : ''}`,
      data: {
        id: projectId,
        deletedBy: requestedBy,
        deletedByEmail: requestedByEmail || 'unknown'
      }
    });
  } catch (error) {
    logger.error('Error deleting project via Cliq:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to delete project',
      error: error.message,
      text: '❌ Failed to delete project. Please try again.'
    });
  }
};

/**
 * Get Daily Reminders Data for Scheduler
 * GET /api/cliq/scheduler/daily-reminders
 * Returns all linked users with their pending/overdue tasks
 */
exports.getDailyReminders = async (req, res) => {
  try {
    // Get all linked Cliq users
    const mappingsSnapshot = await getDb().collection('cliq_user_mappings').get();
    
    if (mappingsSnapshot.empty) {
      return res.json({
        success: true,
        data: [],
        message: 'No linked users found'
      });
    }

    // Deduplicate by cliqUserId - keep only the first (most recent) mapping per user
    const uniqueMappings = new Map();
    for (const mappingDoc of mappingsSnapshot.docs) {
      const mapping = mappingDoc.data();
      const cliqUserId = mapping.cliq_user_id;
      
      // Skip if we already have this cliqUserId
      if (uniqueMappings.has(cliqUserId)) {
        continue;
      }
      uniqueMappings.set(cliqUserId, mapping);
    }

    const usersData = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    for (const [cliqUserId, mapping] of uniqueMappings) {
      const taskerUserId = mapping.tasker_user_id;
      let userName = mapping.cliq_user_name || 'there';

      // Try to get actual name from users collection if userName is missing
      if (!mapping.cliq_user_name || mapping.cliq_user_name === 'Unknown') {
        try {
          const userDoc = await getDb().collection('users').doc(taskerUserId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.displayName || userData.name || userData.email?.split('@')[0] || 'there';
          }
        } catch (e) {
          // Keep default
        }
      }

      // Check notification settings - skip if reminders disabled
      const settingsDoc = await getDb().collection('cliq_notification_settings').doc(cliqUserId).get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings.enabled === false || settings.task_due_soon === false) {
          continue;
        }
        // Check DND
        if (settings.doNotDisturb?.enabled) {
          const dndUntil = settings.doNotDisturb.until?.toDate?.() || new Date(settings.doNotDisturb.until);
          if (dndUntil > now) {
            continue;
          }
        }
      }

      // Get pending tasks for this user
      const tasksSnapshot = await getDb().collection('tasks')
        .where('assignees', 'array-contains', taskerUserId)
        .where('status', '!=', 'completed')
        .limit(20)
        .get();

      if (tasksSnapshot.empty) {
        continue;
      }

      let pendingCount = 0;
      let overdueCount = 0;
      let dueTodayCount = 0;
      const topTasks = [];

      tasksSnapshot.forEach(doc => {
        const task = doc.data();
        pendingCount++;

        // Check due date
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
          
          if (dueDate < todayStart) {
            overdueCount++;
          } else if (dueDate >= todayStart && dueDate < todayEnd) {
            dueTodayCount++;
          }
        }

        // Add to top tasks (prioritize high priority and overdue)
        if (topTasks.length < 5) {
          topTasks.push({
            id: doc.id,
            title: task.title,
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()) : null
          });
        }
      });

      // Sort topTasks by priority
      topTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      });

      usersData.push({
        cliqUserId,
        taskerUserId,
        userName,
        pendingCount,
        overdueCount,
        dueTodayCount,
        topTasks: topTasks.slice(0, 5)
      });
    }

    logger.info(`Daily reminders prepared for ${usersData.length} users`);

    res.json({
      success: true,
      data: usersData,
      count: usersData.length
    });

  } catch (error) {
    logger.error('Error preparing daily reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Weekly Digest Data for Scheduler
 * GET /api/cliq/scheduler/weekly-digest
 * Returns all linked users with their weekly stats
 */
exports.getWeeklyDigest = async (req, res) => {
  try {
    // Get all linked Cliq users
    const mappingsSnapshot = await getDb().collection('cliq_user_mappings').get();
    
    if (mappingsSnapshot.empty) {
      return res.json({
        success: true,
        data: [],
        message: 'No linked users found'
      });
    }

    // Deduplicate by cliqUserId
    const uniqueMappings = new Map();
    for (const mappingDoc of mappingsSnapshot.docs) {
      const mapping = mappingDoc.data();
      const cliqUserId = mapping.cliq_user_id;
      if (!uniqueMappings.has(cliqUserId)) {
        uniqueMappings.set(cliqUserId, mapping);
      }
    }

    const usersData = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const [cliqUserId, mapping] of uniqueMappings) {
      const taskerUserId = mapping.tasker_user_id;
      let userName = mapping.cliq_user_name || 'there';

      // Try to get actual name from users collection if userName is missing
      if (!mapping.cliq_user_name || mapping.cliq_user_name === 'Unknown') {
        try {
          const userDoc = await getDb().collection('users').doc(taskerUserId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.displayName || userData.name || userData.email?.split('@')[0] || 'there';
          }
        } catch (e) {
          // Keep default
        }
      }

      // Check notification settings
      const settingsDoc = await getDb().collection('cliq_notification_settings').doc(cliqUserId).get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings.enabled === false) {
          continue;
        }
      }

      // Get all tasks for this user
      const allTasksSnapshot = await getDb().collection('tasks')
        .where('assignees', 'array-contains', taskerUserId)
        .get();

      let completedThisWeek = 0;
      let createdThisWeek = 0;
      let pendingTotal = 0;
      let overdueTotal = 0;

      allTasksSnapshot.forEach(doc => {
        const task = doc.data();
        
        // Check if completed this week
        if (task.status === 'completed' && task.completedAt) {
          const completedDate = task.completedAt.toDate ? task.completedAt.toDate() : new Date(task.completedAt);
          if (completedDate >= weekAgo) {
            completedThisWeek++;
          }
        } else if (task.status !== 'completed') {
          pendingTotal++;
          
          // Check if overdue
          if (task.dueDate) {
            const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
            if (dueDate < now) {
              overdueTotal++;
            }
          }
        }

        // Check if created this week
        if (task.createdAt) {
          const createdDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
          if (createdDate >= weekAgo) {
            createdThisWeek++;
          }
        }
      });

      // Calculate productivity score (simple formula)
      const totalTasks = completedThisWeek + pendingTotal;
      const productivityScore = totalTasks > 0 ? Math.round((completedThisWeek / totalTasks) * 100) : 0;

      // Get streak from user data (if available)
      let streak = 0;
      try {
        const userDoc = await getDb().collection('users').doc(taskerUserId).get();
        if (userDoc.exists) {
          streak = userDoc.data().streak?.current || 0;
        }
      } catch (e) {
        // Streak not available
      }

      usersData.push({
        cliqUserId,
        taskerUserId,
        userName,
        stats: {
          completedThisWeek,
          createdThisWeek,
          pendingTotal,
          overdueTotal,
          streak,
          productivityScore
        }
      });
    }

    logger.info(`Weekly digest prepared for ${usersData.length} users`);

    res.json({
      success: true,
      data: usersData,
      count: usersData.length
    });

  } catch (error) {
    logger.error('Error preparing weekly digest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};