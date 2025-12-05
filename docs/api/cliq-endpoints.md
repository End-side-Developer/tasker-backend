# 🔗 Cliq Endpoints

Zoho Cliq integration endpoints.

---

## Endpoints

| Method | Endpoint                     | Description              |
| ------ | ---------------------------- | ------------------------ |
| POST   | `/api/cliq/link-user`        | Link Cliq user to Tasker |
| GET    | `/api/cliq/user/:cliqUserId` | Get user mapping         |
| POST   | `/api/cliq/command`          | Handle slash commands    |
| POST   | `/api/cliq/webhook`          | Handle webhooks          |
| GET    | `/api/cliq/widget`           | Get widget data          |

---

## Link User

Link a Zoho Cliq user to a Tasker account.

**POST** `/api/cliq/link-user`

### Request

```http
POST /api/cliq/link-user
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "cliqUserId": "cliq_user_123",
  "cliqUserName": "John Doe",
  "cliqEmail": "john@company.com",
  "taskerId": "firebase_user_456"
}
```

### Parameters

| Field          | Type   | Required | Description             |
| -------------- | ------ | -------- | ----------------------- |
| `cliqUserId`   | string | Yes      | Zoho Cliq user ID       |
| `cliqUserName` | string | Yes      | Display name            |
| `cliqEmail`    | string | No       | Email address           |
| `taskerId`     | string | Yes      | Tasker Firebase user ID |

### Response

```json
{
  "success": true,
  "data": {
    "id": "mapping_789",
    "cliqUserId": "cliq_user_123",
    "taskerId": "firebase_user_456",
    "linkedAt": "2025-12-05T10:00:00Z"
  }
}
```

---

## Get User Mapping

Get the Tasker user linked to a Cliq user.

**GET** `/api/cliq/user/:cliqUserId`

### Example

```http
GET /api/cliq/user/cliq_user_123
x-api-key: YOUR_KEY
```

### Response

```json
{
  "success": true,
  "data": {
    "cliqUserId": "cliq_user_123",
    "cliqUserName": "John Doe",
    "taskerId": "firebase_user_456",
    "linkedAt": "2025-12-05T10:00:00Z"
  }
}
```

### Not Found Response

```json
{
  "success": false,
  "error": "User mapping not found",
  "code": "USER_NOT_LINKED"
}
```

---

## Handle Command

Process slash commands from Cliq.

**POST** `/api/cliq/command`

### Request

```http
POST /api/cliq/command
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "command": "tasker",
  "action": "list",
  "arguments": "--today",
  "user": {
    "id": "cliq_user_123",
    "name": "John Doe"
  },
  "chat": {
    "id": "channel_456",
    "type": "channel"
  }
}
```

### Supported Actions

| Action     | Description     |
| ---------- | --------------- |
| `list`     | List tasks      |
| `create`   | Create task     |
| `complete` | Complete task   |
| `assign`   | Assign task     |
| `stats`    | Show statistics |

### Response (Cliq Card Format)

```json
{
  "text": "Your Tasks",
  "card": {
    "title": "📋 Tasks (3 items)",
    "theme": "modern-inline"
  },
  "slides": [
    {
      "type": "table",
      "data": {
        "headers": ["Task", "Priority", "Due"],
        "rows": [
          ["Review PR", "High", "Today"],
          ["Fix bug", "Medium", "Tomorrow"]
        ]
      }
    }
  ],
  "buttons": [
    {
      "label": "View All",
      "type": "+",
      "action": {
        "type": "open.url",
        "data": {
          "web": "https://tasker-app.com/tasks"
        }
      }
    }
  ]
}
```

---

## Webhook Handler

Handle events from Cliq.

**POST** `/api/cliq/webhook`

### Request

```http
POST /api/cliq/webhook
x-api-key: YOUR_KEY
Content-Type: application/json

{
  "event": "task.completed",
  "data": {
    "taskId": "task_abc123",
    "completedBy": "cliq_user_123"
  }
}
```

### Supported Events

| Event            | Description         |
| ---------------- | ------------------- |
| `task.created`   | Task was created    |
| `task.updated`   | Task was updated    |
| `task.completed` | Task was completed  |
| `task.deleted`   | Task was deleted    |
| `user.linked`    | User account linked |

### Response

```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## Widget Data

Get data for Cliq home widget.

**GET** `/api/cliq/widget`

### Query Parameters

| Parameter    | Type   | Description                    |
| ------------ | ------ | ------------------------------ |
| `cliqUserId` | string | Cliq user ID                   |
| `type`       | string | Widget type: `home`, `summary` |

### Example

```http
GET /api/cliq/widget?cliqUserId=cliq_user_123&type=home
x-api-key: YOUR_KEY
```

### Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTasks": 15,
      "pendingTasks": 8,
      "completedToday": 3,
      "overdue": 2
    },
    "todayTasks": [
      {
        "id": "task_abc123",
        "title": "Review PR",
        "priority": "high",
        "dueTime": "10:00 AM"
      }
    ],
    "recentActivity": [
      {
        "action": "completed",
        "task": "Fix login bug",
        "time": "2 hours ago"
      }
    ]
  }
}
```

---

## Cliq Card Response Format

For slash commands, return Cliq-formatted cards:

```javascript
const response = {
  text: "Plain text fallback",
  card: {
    title: "Card Title",
    theme: "modern-inline" // or "poll", "prompt"
  },
  slides: [
    {
      type: "text",
      data: "Slide content"
    },
    {
      type: "table",
      data: {
        headers: ["Col1", "Col2"],
        rows: [["A", "B"]]
      }
    }
  ],
  buttons: [
    {
      label: "Button Text",
      type: "+", // or "-" for secondary
      action: {
        type: "invoke.function",
        data: { key: "value" }
      }
    }
  ]
};
```

---

## Related Docs

- [API Overview](./overview.md) - API introduction
- [Zoho Cliq Integration](../zoho-cliq/overview.md) - Full Cliq guide
- [Slash Commands](../zoho-cliq/slash-commands.md) - Command reference

---

<div align="center">

**[← Tasks API](./tasks.md)** | **[Error Codes →](./error-codes.md)**

</div>
