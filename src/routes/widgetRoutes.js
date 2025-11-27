/**
 * Widget Routes - Tasker Home Widget API endpoints
 */

const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widgetController');

/**
 * Get dashboard data for widget
 * GET /api/cliq/widget/dashboard
 * Query: { userId, userEmail }
 */
router.get('/dashboard', widgetController.getDashboard);

/**
 * Get tasks for widget
 * GET /api/cliq/widget/tasks
 * Query: { userId, userEmail, filter?, limit? }
 * filter: 'today' | 'overdue' | 'pending' | 'completed' | 'high'
 */
router.get('/tasks', widgetController.getTasks);

/**
 * Get projects for widget
 * GET /api/cliq/widget/projects
 * Query: { userId, userEmail }
 */
router.get('/projects', widgetController.getProjects);

/**
 * Quick task creation from widget
 * POST /api/cliq/widget/quick-task
 * Body: { userId, userEmail, title, projectId?, dueDate?, priority? }
 */
router.post('/quick-task', widgetController.createQuickTask);

/**
 * Complete task from widget
 * POST /api/cliq/widget/complete-task
 * Body: { userId, userEmail, taskId }
 */
router.post('/complete-task', widgetController.completeTask);

/**
 * Get task details for widget
 * GET /api/cliq/widget/task-details
 * Query: { userId, userEmail, taskId }
 */
router.get('/task-details', widgetController.getTaskDetails);

module.exports = router;
