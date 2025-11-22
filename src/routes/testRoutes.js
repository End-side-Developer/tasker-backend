const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * @route   GET /api/test/hello
 * @desc    Simple test endpoint
 * @access  Public
 */
router.get('/hello', (req, res) => {
  logger.info('Test endpoint called: /hello');
  res.json({
    success: true,
    message: 'Hello from Tasker Backend! 👋',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/test/echo
 * @desc    Echo back query parameters
 * @access  Public
 */
router.get('/echo', (req, res) => {
  logger.info('Test endpoint called: /echo', { query: req.query });
  res.json({
    success: true,
    message: 'Echo response',
    receivedParams: req.query,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/test/greet
 * @desc    Greet user with custom message
 * @access  Protected (requires API key or JWT)
 */
router.post('/greet', verifyAuth, (req, res) => {
  const { name } = req.body;
  
  logger.info('Test endpoint called: /greet', { name });
  
  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    });
  }

  res.json({
    success: true,
    message: `Hello, ${name}! Welcome to Tasker Backend! 🎉`,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/test/calculate
 * @desc    Simple calculator for testing
 * @access  Protected (requires API key or JWT)
 */
router.post('/calculate', verifyAuth, (req, res) => {
  const { num1, num2, operation } = req.body;
  
  logger.info('Test endpoint called: /calculate', { num1, num2, operation });
  
  if (!num1 || !num2 || !operation) {
    return res.status(400).json({
      success: false,
      error: 'num1, num2, and operation are required'
    });
  }

  let result;
  switch (operation) {
    case 'add':
      result = num1 + num2;
      break;
    case 'subtract':
      result = num1 - num2;
      break;
    case 'multiply':
      result = num1 * num2;
      break;
    case 'divide':
      result = num2 !== 0 ? num1 / num2 : 'Cannot divide by zero';
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid operation. Use: add, subtract, multiply, or divide'
      });
  }

  res.json({
    success: true,
    operation,
    num1,
    num2,
    result,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
