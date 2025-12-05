# 🤖 Bot Integration

TaskerBot - Conversational task management in Zoho Cliq.

---

## Overview

TaskerBot provides a natural language interface for managing tasks directly in chat.

```
You: "Create a task to review the PR by tomorrow"
TaskerBot: "✅ Created: Review the PR (Due: Tomorrow, 5:00 PM)"
```

---

## Capabilities

| Feature            | Description                        |
| ------------------ | ---------------------------------- |
| **Create Tasks**   | Natural language task creation     |
| **Quick Actions**  | Complete, edit, delete via buttons |
| **Reminders**      | Proactive task reminders           |
| **Status Updates** | Task status notifications          |
| **Help**           | Guided commands and tips           |

---

## Interactions

### Create Task

**User:**
```
Create a task to fix the login bug with high priority
```

**TaskerBot:**
```
✅ Task Created

#126 Fix the login bug
Priority: 🔴 High
Due: Not set

[Set Due Date] [Edit] [Cancel]
```

### List Tasks

**User:**
```
What are my tasks for today?
```

**TaskerBot:**
```
📋 Today's Tasks (3)

1. #123 Review PR - Due 10:00 AM 🔴
2. #124 Team meeting - Due 2:00 PM 🟡
3. #125 Send report - Due 5:00 PM 🟡

[Complete All] [View Details]
```

### Complete Task

**User:**
```
Mark task 123 as done
```

**TaskerBot:**
```
✅ Task Completed!

#123 Review PR
Completed at: 10:30 AM

🎉 2 more tasks remaining today.

[View Tasks] [Undo]
```

---

## Button Responses

When users click buttons, the bot handles the action:

### Complete Button

```deluge
// Incoming handler for button click
if (target.get("action") == "complete_task") {
    taskId = target.get("data").get("taskId");
    // Call backend to complete task
    response = completeTask(taskId);
    return {
        "text": "✅ Task #" + taskId + " completed!"
    };
}
```

### Form Button

```deluge
// Open form for task details
return {
    "type": "form",
    "title": "Create Task",
    "hint": "Enter task details",
    "name": "create_task_form",
    "inputs": [
        {
            "type": "text",
            "name": "title",
            "label": "Task Title",
            "mandatory": true
        },
        {
            "type": "select",
            "name": "priority",
            "label": "Priority",
            "options": [
                {"label": "Low", "value": "low"},
                {"label": "Medium", "value": "medium"},
                {"label": "High", "value": "high"}
            ]
        }
    ],
    "action": {
        "type": "invoke.function",
        "name": "handleCreateTask"
    }
};
```

---

## Proactive Messages

### Task Reminders

```javascript
// Send reminder 1 hour before due
const sendReminder = async (task) => {
  await cliqService.sendBotMessage({
    user: task.assignee.cliqUserId,
    message: {
      text: `⏰ Reminder: "${task.title}" is due in 1 hour`,
      buttons: [
        { label: "Complete", action: { type: "invoke", data: { taskId: task.id } } },
        { label: "Snooze", action: { type: "invoke", data: { snooze: "1h" } } }
      ]
    }
  });
};
```

### Daily Summary

```
☀️ Good morning, John!

Here's your task summary:

📋 Today: 5 tasks
├── 🔴 2 high priority
├── 🟡 2 medium priority
└── 🟢 1 low priority

⚠️ 1 task is overdue

[View Tasks] [Quick Add]
```

---

## Setup

### 1. Create Bot

In Zoho Cliq Developer Console:

1. Go to **Bots & Tools** → **Bots**
2. Click **Create Bot**
3. Configure:

| Field       | Value                     |
| ----------- | ------------------------- |
| Name        | `TaskerBot`               |
| Description | Task management assistant |
| Bot Image   | Upload icon               |

### 2. Message Handler

```deluge
// bot/message-handler.dg

message = body.get("message");
user = body.get("user");

// Parse intent
if (message.containsIgnoreCase("create") || message.containsIgnoreCase("add")) {
    return handleCreateIntent(message, user);
}
else if (message.containsIgnoreCase("list") || message.containsIgnoreCase("show")) {
    return handleListIntent(message, user);
}
else if (message.containsIgnoreCase("complete") || message.containsIgnoreCase("done")) {
    return handleCompleteIntent(message, user);
}
else {
    return handleUnknownIntent(message);
}
```

### 3. Context Handler

```deluge
// bot/context-handler.dg

// Handle button clicks and form submissions
operation = body.get("operation");

if (operation == "button_click") {
    return handleButtonClick(body);
}
else if (operation == "form_submit") {
    return handleFormSubmit(body);
}
```

---

## Backend Integration

### Bot Message Handler

```javascript
// src/controllers/cliqController.js
const handleBotMessage = async (req, res) => {
  const { message, user } = req.body;
  
  // Check user mapping
  const mapping = await cliqService.getUserMapping(user.id);
  if (!mapping) {
    return res.json({
      text: "Hi! Please link your Tasker account first.",
      buttons: [{ label: "Link Account", type: "+" }]
    });
  }
  
  // Process message with NLP or keywords
  const intent = parseIntent(message);
  const response = await processIntent(intent, mapping.taskerId);
  
  return res.json(response);
};
```

### Send Proactive Message

```javascript
// src/services/cliqService.js
const sendBotMessage = async (userId, message) => {
  await axios.post(`https://cliq.zoho.com/api/v2/bots/taskerbot/message`, {
    user_id: userId,
    message: message
  }, {
    headers: {
      'Authorization': `Bearer ${CLIQ_ACCESS_TOKEN}`
    }
  });
};
```

---

## Response Templates

### Task Card

```javascript
const taskCard = (task) => ({
  card: {
    title: `📋 ${task.title}`,
    theme: "modern-inline"
  },
  slides: [
    {
      type: "label",
      data: [
        { "Priority": priorityEmoji(task.priority) },
        { "Due": formatDate(task.dueDate) },
        { "Status": task.status }
      ]
    }
  ],
  buttons: [
    { label: "Complete", type: "+", action: { type: "invoke", data: { taskId: task.id, action: "complete" } } },
    { label: "Edit", action: { type: "invoke", data: { taskId: task.id, action: "edit" } } }
  ]
});
```

### Help Card

```javascript
const helpCard = () => ({
  text: "Here's what I can do:",
  card: {
    title: "🤖 TaskerBot Help"
  },
  slides: [
    {
      type: "text",
      data: `
**Create tasks:**
"Create a task to [description]"
"Add [task] with high priority"

**View tasks:**
"Show my tasks"
"What's due today?"

**Complete tasks:**
"Mark #123 as done"
"Complete [task name]"
      `
    }
  ]
});
```

---

## Related Docs

- [Slash Commands](./slash-commands.md) - Command interface
- [Widgets](./widgets.md) - Home widget
- [Developer Guide](../ZOHO_CLIQ_DEVELOPER_GUIDE.md) - Complete reference

---

<div align="center">

**[← Slash Commands](./slash-commands.md)** | **[Webhooks →](./webhooks.md)**

</div>
