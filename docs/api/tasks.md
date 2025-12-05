# ✅ Tasks API

Task management endpoints.

---

## Endpoints

| Method | Endpoint                  | Description   |
| ------ | ------------------------- | ------------- |
| POST   | `/api/tasks`              | Create task   |
| GET    | `/api/tasks`              | List tasks    |
| GET    | `/api/tasks/:id`          | Get task      |
| PUT    | `/api/tasks/:id`          | Update task   |
| POST   | `/api/tasks/:id/complete` | Complete task |
| DELETE | `/api/tasks/:id`          | Delete task   |

---

## Create Task

**POST** `/api/tasks`

### Request

```http
POST /api/tasks
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "title": "Review pull request",
  "description": "Check the new feature branch",
  "priority": "high",
  "dueDate": "2025-12-10T10:00:00Z",
  "projectId": "project-123",
  "cliqContext": {
    "userId": "cliq_user_123",
    "userName": "John Doe",
    "channelId": "channel_456"
  }
}
```

### Parameters

| Field         | Type     | Required | Description                       |
| ------------- | -------- | -------- | --------------------------------- |
| `title`       | string   | Yes      | Task title                        |
| `description` | string   | No       | Task description                  |
| `priority`    | string   | No       | `low`, `medium`, `high`, `urgent` |
| `dueDate`     | ISO 8601 | No       | Due date and time                 |
| `projectId`   | string   | No       | Project ID                        |
| `cliqContext` | object   | No       | Cliq user context                 |

### Response

```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "Review pull request",
    "description": "Check the new feature branch",
    "priority": "high",
    "status": "pending",
    "dueDate": "2025-12-10T10:00:00Z",
    "projectId": "project-123",
    "createdAt": "2025-12-05T08:30:00Z"
  }
}
```

---

## List Tasks

**GET** `/api/tasks`

### Query Parameters

| Parameter    | Type   | Description                           |
| ------------ | ------ | ------------------------------------- |
| `cliqUserId` | string | Filter by Cliq user                   |
| `taskerId`   | string | Filter by Tasker user                 |
| `projectId`  | string | Filter by project                     |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `low`, `medium`, `high`, `urgent`     |
| `limit`      | number | Max results (default: 50)             |

### Example

```http
GET /api/tasks?status=pending&priority=high&limit=10
x-api-key: YOUR_KEY
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "task_abc123",
      "title": "Review pull request",
      "priority": "high",
      "status": "pending",
      "dueDate": "2025-12-10T10:00:00Z"
    },
    {
      "id": "task_def456",
      "title": "Fix login bug",
      "priority": "high",
      "status": "pending",
      "dueDate": "2025-12-08T15:00:00Z"
    }
  ],
  "count": 2
}
```

---

## Get Task

**GET** `/api/tasks/:id`

### Example

```http
GET /api/tasks/task_abc123
x-api-key: YOUR_KEY
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "Review pull request",
    "description": "Check the new feature branch",
    "priority": "high",
    "status": "pending",
    "dueDate": "2025-12-10T10:00:00Z",
    "projectId": "project-123",
    "createdAt": "2025-12-05T08:30:00Z",
    "updatedAt": null
  }
}
```

---

## Update Task

**PUT** `/api/tasks/:id`

### Request

```http
PUT /api/tasks/task_abc123
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "medium",
  "description": "Updated description"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "title": "Review pull request",
    "status": "in_progress",
    "priority": "medium",
    "updatedAt": "2025-12-05T09:15:00Z"
  }
}
```

---

## Complete Task

**POST** `/api/tasks/:id/complete`

### Request

```http
POST /api/tasks/task_abc123/complete
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "completedBy": "user_123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "status": "completed",
    "completedAt": "2025-12-05T10:00:00Z",
    "completedBy": "user_123"
  }
}
```

---

## Delete Task

**DELETE** `/api/tasks/:id`

### Example

```http
DELETE /api/tasks/task_abc123
x-api-key: YOUR_KEY
```

### Response

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## Task Object

Full task object structure:

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string; // ISO 8601
  projectId?: string;
  assignees?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  completedBy?: string;
}
```

---

## Error Responses

### Task Not Found

```json
{
  "success": false,
  "error": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```
**HTTP Status:** 404

### Validation Error

```json
{
  "success": false,
  "error": "Title is required",
  "code": "VALIDATION_ERROR"
}
```
**HTTP Status:** 400

---

## Related Docs

- [API Overview](./overview.md) - API introduction
- [Cliq API](./cliq-endpoints.md) - Cliq integration
- [Error Codes](./error-codes.md) - Error reference

---

<div align="center">

**[← Authentication](./authentication.md)** | **[Cliq API →](./cliq-endpoints.md)**

</div>
