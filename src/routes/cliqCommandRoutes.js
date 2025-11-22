const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  createTask, 
  listTasks, 
  assignTask, 
  completeTask, 
  searchTasks,
  createProject,
  listProjects,
  inviteMember
} = require('../controllers/cliqCommandController');

/**
 * Cliq Command Routes
 * These endpoints are called from Zoho Cliq slash commands
 */

// Task Management Commands
router.post('/create-task', authenticate, createTask);
router.get('/list-tasks', authenticate, listTasks);
router.post('/assign-task', authenticate, assignTask);
router.post('/complete-task', authenticate, completeTask);
router.get('/search', authenticate, searchTasks);

// Project Management Commands
router.post('/create-project', authenticate, createProject);
router.get('/list-projects', authenticate, listProjects);
router.post('/invite-member', authenticate, inviteMember);

module.exports = router;
