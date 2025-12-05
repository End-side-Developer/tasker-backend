# ⚡ Slash Commands

Zoho Cliq slash commands for Tasker.

---

## Command: `/tasker`

The main command for task management in Zoho Cliq.

### Syntax

```
/tasker [action] [arguments]
```

---

## Actions

| Action   | Description     | Example                     |
| -------- | --------------- | --------------------------- |
| `list`   | List tasks      | `/tasker list`              |
| `add`    | Create task     | `/tasker add "Review PR"`   |
| `done`   | Complete task   | `/tasker done #123`         |
| `assign` | Assign task     | `/tasker assign #123 @user` |
| `stats`  | Show statistics | `/tasker stats`             |
| `link`   | Link account    | `/tasker link`              |

---

## List Tasks

### Basic List

```
/tasker list
```

Shows pending tasks with priority and due date.

### Filters

```
/tasker list --today
/tasker list --priority high
/tasker list --project "Project Name"
/tasker list --overdue
```

### Response

```
📋 Your Tasks (5 items)

┌─────────────────────────────────────┐
│ #123 Review pull request        🔴  │
│      Due: Today, 10:00 AM           │
├─────────────────────────────────────┤
│ #124 Fix login bug              🟡  │
│      Due: Tomorrow                  │
└─────────────────────────────────────┘

[View All] [Create Task]
```

---

## Create Task

### Quick Create

```
/tasker add "Task title"
```

### With Options

```
/tasker add "Review PR" --priority high --due tomorrow
/tasker add "Meeting notes" --project "Sprint 5"
```

### Parameters

| Parameter    | Values                                 | Default  |
| ------------ | -------------------------------------- | -------- |
| `--priority` | `low`, `medium`, `high`, `urgent`      | `medium` |
| `--due`      | Date or relative (`today`, `tomorrow`) | none     |
| `--project`  | Project name                           | none     |

### Response

```
✅ Task Created

#125 Review PR
Priority: High
Due: Tomorrow, 5:00 PM

[Edit] [Complete] [Delete]
```

---

## Complete Task

### By ID

```
/tasker done #123
```

### By Title Match

```
/tasker done "Review PR"
```

### Response

```
✅ Task Completed

#123 Review pull request
Completed at: 10:30 AM

🎉 Great job! You've completed 5 tasks today.

[Undo]
```

---

## Assign Task

```
/tasker assign #123 @john
```

### Response

```
👤 Task Assigned

#123 Review pull request
Assigned to: John Doe

John will be notified.

[View Task]
```

---

## Statistics

```
/tasker stats
```

### Response

```
📊 Your Task Statistics

Today
├── Completed: 5
├── Pending: 3
└── Overdue: 1

This Week
├── Total: 24
├── Completed: 18 (75%)
└── Streak: 🔥 5 days

[View Full Report]
```

---

## Link Account

First-time users must link their accounts:

```
/tasker link
```

### Response

```
🔗 Link Your Account

To use Tasker in Cliq, please link your account.

[Link Account]

This will open Tasker and connect your accounts.
```

---

## Setup in Cliq

### 1. Create Extension

In Zoho Cliq Developer Console:

1. Go to **Bots & Tools** → **Extensions**
2. Click **Create Extension**
3. Name: `Tasker`

### 2. Add Slash Command

1. Go to **Slash Commands**
2. Click **Create Command**
3. Configure:

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| Name           | `tasker`                                |
| Description    | Manage tasks                            |
| Execution Type | External Service                        |
| Service URL    | `https://your-api.com/api/cliq/command` |

### 3. Command Handler (Deluge)

```deluge
// commands/tasker.ds
response = Map();

action = arguments.get("action");

if (action == "list") {
    response = invokeurl [
        url: "https://api.tasker.com/cliq/command"
        type: POST
        headers: {"x-api-key": "API_KEY"}
        parameters: {
            "action": "list",
            "cliqUserId": user.get("id")
        }
    ];
}

return response;
```

---

## Backend Handler

```javascript
// src/controllers/cliqController.js
const handleCommand = async (req, res) => {
  const { action, arguments: args, user } = req.body;
  
  // Map Cliq user to Tasker user
  const mapping = await cliqService.getUserMapping(user.id);
  if (!mapping) {
    return res.json({
      text: "Please link your account first",
      buttons: [{ label: "Link Account", type: "+" }]
    });
  }
  
  switch (action) {
    case 'list':
      return handleListTasks(mapping.taskerId, args, res);
    case 'add':
      return handleCreateTask(mapping.taskerId, args, res);
    // ... other actions
  }
};
```

---

## Error Responses

### Not Linked

```
⚠️ Account Not Linked

Your Cliq account isn't connected to Tasker yet.

[Link Account]
```

### Invalid Command

```
❌ Invalid Command

Unknown action: "foo"

Available actions:
• list - View tasks
• add - Create task
• done - Complete task

Type /tasker help for more info.
```

### Task Not Found

```
❌ Task Not Found

Task #999 doesn't exist or you don't have access.

[List Tasks]
```

---

## Related Docs

- [Bot Integration](./bot.md) - Conversational interface
- [Cliq API Endpoints](../api/cliq-endpoints.md) - Backend endpoints
- [Developer Guide](../ZOHO_CLIQ_DEVELOPER_GUIDE.md) - Complete reference

---

<div align="center">

**[← Overview](./overview.md)** | **[Bot Integration →](./bot.md)**

</div>
