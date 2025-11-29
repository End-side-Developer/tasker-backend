const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const { 
  createTask, 
  listTasks, 
  assignTask, 
  completeTask, 
  searchTasks,
  deleteTask,
  createProject,
  listProjects,
  inviteMember,
  getProjectDetails,
  getProjectMembers,
  getTaskDetails,
  checkUser,
  deleteProject,
  getDailyReminders,
  getWeeklyDigest
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
router.post('/delete-task', verifyAuth, deleteTask);
router.get('/task-details', verifyAuth, getTaskDetails);
router.get('/search', verifyAuth, searchTasks);

// Project Management Commands
router.post('/create-project', verifyAuth, createProject);
router.get('/list-projects', verifyAuth, listProjects);
router.post('/invite-member', verifyAuth, inviteMember);
router.post('/delete-project', verifyAuth, deleteProject);
router.get('/project-details', verifyAuth, getProjectDetails);
router.get('/project-members', verifyAuth, getProjectMembers);
router.get('/check-user', verifyAuth, checkUser);

// Scheduler Endpoints (called from Zoho Cliq Schedulers)
router.get('/scheduler/daily-reminders', verifyAuth, getDailyReminders);
router.get('/scheduler/weekly-digest', verifyAuth, getWeeklyDigest);

module.exports = router;
