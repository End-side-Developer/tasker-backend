const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { validateTaskCreation, validateTaskUpdate } = require('../utils/validators');
const { taskCreationLimiter } = require('../middleware/rateLimiter');

/**
 * Task Routes
 */

// Create task
router.post('/', taskCreationLimiter, validateTaskCreation, taskController.createTask);

// Get task by ID
router.get('/:id', taskController.getTask);

// List tasks
router.get('/', taskController.listTasks);

// Update task
router.put('/:id', validateTaskUpdate, taskController.updateTask);

// Complete task
router.post('/:id/complete', taskController.completeTask);

// Delete task
router.delete('/:id', taskController.deleteTask);

module.exports = router;
