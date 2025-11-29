const { body, validationResult } = require('express-validator');

/**
 * Validation rules for task creation
 */
const validateTaskCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),

  body('projectId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Invalid project ID'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  body('cliqContext.userId')
    .notEmpty()
    .withMessage('Cliq user ID is required'),

  body('cliqContext.userName')
    .notEmpty()
    .withMessage('Cliq user name is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }
    next();
  },
];

/**
 * Validation rules for task update
 */
const validateTaskUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }
    next();
  },
];

module.exports = {
  validateTaskCreation,
  validateTaskUpdate,
};
