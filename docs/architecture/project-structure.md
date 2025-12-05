# 📁 Project Structure

Codebase organization for Tasker Backend.

---

## Overview

```
Tasker Backend/
├── src/
│   ├── server.js           # Entry point
│   ├── config/             # Configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/             # Route definitions
│   ├── services/           # Business logic
│   └── utils/              # Utilities
├── __tests__/              # Test files
├── cliq-scripts/           # Zoho Cliq Deluge scripts
├── docs/                   # Documentation
├── logs/                   # Log files
├── package.json            # Dependencies
└── .env                    # Environment variables
```

---

## Core Directories

### `src/`

Main application code.

#### `server.js`

Entry point that:
- Initializes Firebase
- Configures Express middleware
- Mounts routes
- Starts HTTP server

```javascript
// Key initialization
const express = require('express');
const { initializeFirebase } = require('./config/firebase');

const app = express();

// Initialize Firebase first
initializeFirebase();

// Mount routes
app.use('/api', require('./routes'));

// Start server
app.listen(PORT);
```

---

### `src/config/`

Configuration modules.

| File          | Purpose                  |
| ------------- | ------------------------ |
| `firebase.js` | Firebase Admin SDK setup |
| `oauth.js`    | Zoho OAuth configuration |
| `jwt.js`      | JWT token utilities      |
| `logger.js`   | Winston logger setup     |

#### Example: `firebase.js`

```javascript
const admin = require('firebase-admin');

const initializeFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
};

const db = () => admin.firestore();

module.exports = { initializeFirebase, db };
```

#### Example: `logger.js`

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
```

---

### `src/routes/`

Express route definitions.

| File            | Endpoints      |
| --------------- | -------------- |
| `index.js`      | Route mounting |
| `taskRoutes.js` | `/api/tasks/*` |
| `cliqRoutes.js` | `/api/cliq/*`  |
| `authRoutes.js` | `/api/auth/*`  |

#### Example: `taskRoutes.js`

```javascript
const router = require('express').Router();
const taskController = require('../controllers/taskController');
const { verifyAuth } = require('../middleware/auth');

router.use(verifyAuth);

router.post('/', taskController.createTask);
router.get('/', taskController.listTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
```

---

### `src/controllers/`

Request handlers.

| File                  | Responsibility             |
| --------------------- | -------------------------- |
| `taskController.js`   | Task CRUD operations       |
| `cliqController.js`   | Cliq integration endpoints |
| `authController.js`   | OAuth and JWT handling     |
| `widgetController.js` | Widget data aggregation    |

#### Controller Pattern

```javascript
// taskController.js
const taskService = require('../services/taskService');
const logger = require('../config/logger');

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body);
    return res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = { createTask, ... };
```

---

### `src/services/`

Business logic layer.

| File             | Purpose                     |
| ---------------- | --------------------------- |
| `taskService.js` | Task operations             |
| `cliqService.js` | Cliq user mapping, webhooks |

#### Service Pattern

```javascript
// taskService.js
const { db } = require('../config/firebase');

const createTask = async (taskData) => {
  const taskRef = db().collection('tasks').doc();
  
  const task = {
    id: taskRef.id,
    ...taskData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  await taskRef.set(task);
  return task;
};

const listTasks = async (userId, filters = {}) => {
  let query = db().collection('tasks')
    .where('userId', '==', userId);
  
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
};

module.exports = { createTask, listTasks, ... };
```

---

### `src/middleware/`

Express middleware.

| File              | Purpose                      |
| ----------------- | ---------------------------- |
| `auth.js`         | API key and JWT verification |
| `errorHandler.js` | Global error handling        |
| `rateLimiter.js`  | Rate limiting                |

#### Example: `auth.js`

```javascript
const { verifyJWT } = require('../config/jwt');

const verifyAuth = (req, res, next) => {
  // Check API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey === process.env.API_SECRET_KEY) {
    return next();
  }
  
  // Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = verifyJWT(token);
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  return res.status(401).json({ error: 'Authentication required' });
};

module.exports = { verifyAuth };
```

---

### `src/utils/`

Utility functions.

| File               | Purpose          |
| ------------------ | ---------------- |
| `dateUtils.js`     | Date formatting  |
| `responseUtils.js` | Response helpers |
| `validators.js`    | Input validation |

---

## Other Directories

### `cliq-scripts/`

Zoho Cliq Deluge scripts (not deployed via Node.js).

```
cliq-scripts/
├── commands/           # Slash command handlers
│   └── tasker.ds
├── bot/                # Bot handlers
│   └── message-handler.dg
├── functions/          # Reusable functions
│   └── taskFunctions.dg
├── widget/             # Widget handlers
│   └── home-widget.dg
└── README.md           # Cliq scripts documentation
```

### `__tests__/`

Jest test files.

```
__tests__/
└── services/
    └── taskService.test.js
```

### `logs/`

Log files (gitignored).

```
logs/
├── error.log
├── combined.log
└── access.log
```

---

## Key Files

| File                    | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `.env`                  | Environment variables (not committed)    |
| `.env.example`          | Environment template                     |
| `package.json`          | Dependencies and scripts                 |
| `README.md`             | Project overview                         |
| `serviceKeyTasker.json` | Firebase service account (not committed) |

---

## Related Docs

- [Database Schema](./database-schema.md) - Firestore structure
- [Security](./security.md) - Auth and security

---

<div align="center">

**[← Architecture](./README.md)** | **[Database Schema →](./database-schema.md)**

</div>
