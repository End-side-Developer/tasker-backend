const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const { 
  createTask, 
  listTasks, 
  assignTask, 
  completeTask, 
  searchTasks,
  createProject,
  listProjects,
  inviteMember,
  getProjectDetails,
  checkUser
} = require('../controllers/cliqCommandController');

/**
 * Cliq Command Routes
 * These endpoints are called from Zoho Cliq slash commands
 */

// Task Management Commands
router.post('/create-task', verifyAuth, createTask);
router.get('/list-tasks', verifyAuth, listTasks);
router.post('/assign-task', verifyAuth, assignTask);
router.post('/complete-task', verifyAuth, completeTask);
router.get('/search', verifyAuth, searchTasks);

// Project Management Commands
router.post('/create-project', verifyAuth, createProject);
router.get('/list-projects', verifyAuth, listProjects);
router.post('/invite-member', verifyAuth, inviteMember);
router.get('/project-details', verifyAuth, getProjectDetails);
router.get('/check-user', verifyAuth, checkUser);

module.exports = router;
