# 🧪 Testing

Testing guide for Tasker Backend.

---

## Overview

We use **Jest** for testing.

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific file
npm test -- taskService.test.js
```

---

## Test Structure

```
__tests__/
└── services/
    └── taskService.test.js
```

Tests mirror the `src/` structure.

---

## Writing Tests

### Basic Test

```javascript
const taskService = require('../../src/services/taskService');

describe('TaskService', () => {
  describe('createTask', () => {
    it('should create a task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        userId: 'user_123'
      };
      
      const result = await taskService.createTask(taskData);
      
      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Task');
      expect(result.status).toBe('pending');
    });
    
    it('should throw error if title is missing', async () => {
      await expect(taskService.createTask({}))
        .rejects.toThrow('Title is required');
    });
  });
});
```

### Mocking Firebase

```javascript
// Mock Firebase Admin
jest.mock('../../src/config/firebase', () => ({
  db: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        id: 'mock_task_id',
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ id: 'mock_task_id', title: 'Mock Task' })
        })
      })),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ id: '1', title: 'Task 1' }) }]
      })
    }))
  })
}));
```

---

## Test Categories

### Unit Tests

Test individual functions in isolation.

```javascript
describe('validateTask', () => {
  it('should accept valid task', () => {
    const task = { title: 'Valid Task', priority: 'high' };
    expect(validateTask(task)).toBe(true);
  });
  
  it('should reject invalid priority', () => {
    const task = { title: 'Task', priority: 'invalid' };
    expect(validateTask(task)).toBe(false);
  });
});
```

### Integration Tests

Test service interactions.

```javascript
describe('CliqService Integration', () => {
  it('should map user and create task', async () => {
    const cliqUserId = 'cliq_123';
    const mapping = await cliqService.getUserMapping(cliqUserId);
    
    const task = await taskService.createTask({
      title: 'From Cliq',
      userId: mapping.taskerId
    });
    
    expect(task).toHaveProperty('id');
  });
});
```

### API Tests

Test HTTP endpoints.

```javascript
const request = require('supertest');
const app = require('../../src/server');

describe('GET /api/tasks', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
  
  it('should return tasks with valid API key', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('x-api-key', process.env.API_SECRET_KEY);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## Fixtures

### Test Data

```javascript
// __tests__/fixtures/tasks.js
const mockTasks = [
  {
    id: 'task_1',
    title: 'Task One',
    status: 'pending',
    priority: 'high',
    userId: 'user_123'
  },
  {
    id: 'task_2',
    title: 'Task Two',
    status: 'completed',
    priority: 'low',
    userId: 'user_123'
  }
];

module.exports = { mockTasks };
```

### Usage

```javascript
const { mockTasks } = require('../fixtures/tasks');

it('should filter pending tasks', () => {
  const pending = mockTasks.filter(t => t.status === 'pending');
  expect(pending).toHaveLength(1);
});
```

---

## Setup & Teardown

### Global Setup

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node'
};

// jest.setup.js
jest.setTimeout(10000);

beforeAll(() => {
  // Initialize test environment
});

afterAll(() => {
  // Cleanup
});
```

### Per-File Setup

```javascript
describe('TaskService', () => {
  let testTask;
  
  beforeEach(() => {
    testTask = { title: 'Test', userId: 'user_1' };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

---

## Coverage

### Run Coverage

```bash
npm test -- --coverage
```

### Coverage Report

```
-----------------|---------|----------|---------|---------|
| File              | % Stmts   | % Branch   | % Funcs   | % Lines   |
| ----------------- | --------- | ---------- | --------- | --------- |
| services/         |           |            |           |           |
| taskService.js    | 85.7      | 75.0       | 90.0      | 85.7      |
| cliqService.js    | 78.3      | 66.7       | 80.0      | 78.3      |
| ----------------- | --------- | ---------- | --------- | --------- |
```

### Target

- Statements: 80%
- Branches: 70%
- Functions: 80%

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
```

---

## Best Practices

### ✅ Do

- Test one thing per test
- Use descriptive test names
- Mock external dependencies
- Clean up after tests
- Test edge cases

### ❌ Don't

- Test implementation details
- Share state between tests
- Use real database in unit tests
- Skip error cases
- Write flaky tests

---

## Related Docs

- [Roadmap](./roadmap.md) - Feature plans
- [Project Structure](../architecture/project-structure.md) - Code layout

---

<div align="center">

**[← Roadmap](./roadmap.md)** | **[Back to Docs](../README.md)**

</div>
