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

    // Try to get mapped Firebase user ID first
    const cliqService = require('../services/cliqService');
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

    // Create task document
    const taskRef = getDb().collection('tasks').doc();
    const taskId = taskRef.id;

    const taskData = {
      projectId: projectId || null,
      title,
      description: description || null,
      isDescriptionEncrypted: false,
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      status: 'pending',
      reminderEnabled: false,
      assignees: assignedTo ? [assignedTo] : [],
      assignedBy: assignedTo ? actualUserId : null,
      assignedAt: assignedTo ? admin.firestore.FieldValue.serverTimestamp() : null,
      recurrencePattern: 'none',
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      parentRecurringTaskId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
      // Store Cliq context in metadata subcollection or separate mapping collection
      // Don't pollute main document with Cliq-specific fields
    };

    await taskRef.set(taskData);

    logger.info(`Task created via Cliq: ${taskId} by ${cliqContext.userName} (Firebase ID: ${actualUserId})`);

    // Store Cliq mapping separately if needed
    // await getDb().collection('cliq_mappings').doc(taskId).set({
    //   taskId,
    //   cliqUserId: cliqContext.userId,
    //   cliqUserName: cliqContext.userName,
    //   cliqUserEmail: cliqContext.userEmail,
    //   channelId: cliqContext.channelId || null,
    //   messageId: cliqContext.messageId || null,
    //   createdAt: admin.firestore.FieldValue.serverTimestamp()
    // });

    // Format response with rich card
    const card = formatTaskCard({
      id: taskId,
      ...taskData
    }, 'created');

    res.status(201).json({
      success: true,
      message: `✅ Task created successfully! 🎉`,
      data: {
        id: taskId,
        title,
        status: 'pending',
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
    // Note: priority field doesn't exist in schema, removed
    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }
    if (assignedTo) {
      query = query.where('assignees', 'array-contains', assignedTo);
    }
    // Note: no createdBy field in schema, tasks are linked via assignees

    // Order by creation date
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();
    
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
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
      assignees: admin.firestore.FieldValue.arrayUnion(assignedTo),
      assignedBy: assignedBy || 'system',
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

    // Search in title and description
    const tasksRef = getDb().collection('tasks');
    let queryRef = tasksRef;

    // Note: No createdBy field in schema
    // If userId provided, filter by assignees instead
    if (userId) {
      queryRef = queryRef.where('assignees', 'array-contains', userId);
    }

    const snapshot = await queryRef.get();
    
    const tasks = [];
    const searchLower = searchQuery.toLowerCase();

    snapshot.forEach(doc => {
      const data = doc.data();
      const titleMatch = data.title?.toLowerCase().includes(searchLower);
      const descMatch = data.description?.toLowerCase().includes(searchLower);
      // Note: tags field doesn't exist in schema, removed

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
 */
exports.inviteMember = async (req, res) => {
  try {
    const { projectId, email, role = 'editor', invitedBy, invitedByName, message } = req.body;

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

    // Check if invited user exists
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

    logger.info(`Invitation sent to ${email} for project ${projectId}`);

    res.status(201).json({
      success: true,
      message: `✅ Invitation sent to ${email}`,
      data: {
        id: invitationRef.id,
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

