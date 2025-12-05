# 🔔 Webhooks

Real-time event notifications between Tasker and Zoho Cliq.

---

## Overview

Webhooks enable real-time communication:

- **Outgoing**: Tasker → Cliq (notifications)
- **Incoming**: Cliq → Tasker (actions)

---

## Outgoing Webhooks

Tasker sends notifications to Cliq when events occur.

### Events

| Event            | Trigger               |
| ---------------- | --------------------- |
| `task.created`   | New task created      |
| `task.updated`   | Task modified         |
| `task.completed` | Task marked done      |
| `task.assigned`  | Task assigned to user |
| `task.reminder`  | Task due soon         |
| `task.overdue`   | Task past due date    |

### Payload Structure

```json
{
  "event": "task.completed",
  "timestamp": "2025-12-05T10:30:00Z",
  "data": {
    "task": {
      "id": "task_123",
      "title": "Review PR",
      "status": "completed",
      "completedBy": "user_456"
    },
    "user": {
      "taskerId": "user_456",
      "cliqUserId": "cliq_789"
    }
  }
}
```

### Cliq Incoming Webhook

Configure in Cliq to receive notifications:

```deluge
// webhook/incoming-handler.dg

event = body.get("event");
data = body.get("data");

if (event == "task.completed") {
    task = data.get("task");
    
    // Send message to channel
    zoho.cliq.postToChannel(
        "tasks-channel",
        {
            "text": "✅ Task completed: " + task.get("title"),
            "card": {
                "title": "Task Update"
            }
        }
    );
}

return {"status": "received"};
```

---

## Incoming Webhooks

Cliq sends actions to Tasker backend.

### Endpoint

```
POST /api/cliq/webhook
x-api-key: YOUR_KEY
```

### Supported Actions

| Action          | Description           |
| --------------- | --------------------- |
| `task.create`   | Create task from Cliq |
| `task.complete` | Complete task         |
| `task.update`   | Update task           |
| `user.link`     | Link user accounts    |

### Request Example

```json
{
  "action": "task.complete",
  "data": {
    "taskId": "task_123",
    "cliqUserId": "cliq_789"
  },
  "signature": "hmac-sha256-signature"
}
```

### Handler

```javascript
// src/controllers/cliqController.js
const handleWebhook = async (req, res) => {
  const { action, data, signature } = req.body;
  
  // Verify webhook signature
  if (!verifySignature(req.body, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  switch (action) {
    case 'task.complete':
      await taskService.completeTask(data.taskId);
      break;
    case 'task.create':
      await taskService.createTask(data);
      break;
  }
  
  return res.json({ success: true });
};
```

---

## Webhook Security

### Signature Verification

```javascript
const crypto = require('crypto');

const verifySignature = (payload, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.CLIQ_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};
```

### Environment Variables

```env
CLIQ_WEBHOOK_SECRET=your-webhook-secret
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/webhooks/xxx
```

---

## Sending to Cliq

### Using Cliq Incoming Webhook

```javascript
// src/services/cliqService.js
const sendToCliq = async (message) => {
  await axios.post(process.env.CLIQ_WEBHOOK_URL, {
    text: message.text,
    card: message.card,
    bot: { name: "TaskerBot" }
  });
};
```

### Task Notification Example

```javascript
const notifyTaskCompleted = async (task, user) => {
  await sendToCliq({
    text: `✅ ${user.name} completed: ${task.title}`,
    card: {
      title: "Task Completed",
      theme: "modern-inline"
    },
    slides: [
      {
        type: "label",
        data: [
          { "Task": task.title },
          { "Completed By": user.name },
          { "Time": new Date().toLocaleString() }
        ]
      }
    ]
  });
};
```

---

## Channel Webhooks

Send notifications to specific channels:

### Configure Channel Webhook

1. In Cliq, go to channel settings
2. Click **Integrations** → **Incoming Webhooks**
3. Create webhook and copy URL

### Send to Channel

```javascript
const notifyChannel = async (channelWebhook, message) => {
  await axios.post(channelWebhook, {
    text: message,
    bot: { name: "TaskerBot", image: "bot-icon-url" }
  });
};

// Usage
await notifyChannel(
  "https://cliq.zoho.com/webhook/channel/xxx",
  "📋 New task assigned to the team!"
);
```

---

## User Notifications

Send direct messages to users:

```javascript
const notifyUser = async (cliqUserId, message) => {
  await axios.post(
    `https://cliq.zoho.com/api/v2/bots/taskerbot/message`,
    {
      user_id: cliqUserId,
      message: message
    },
    {
      headers: { Authorization: `Bearer ${CLIQ_TOKEN}` }
    }
  );
};

// Usage
await notifyUser("cliq_user_123", {
  text: "⏰ Reminder: Your task is due in 1 hour",
  buttons: [
    { label: "Complete", type: "+" },
    { label: "Snooze", type: "-" }
  ]
});
```

---

## Retry Logic

Implement retry for failed webhooks:

```javascript
const sendWebhookWithRetry = async (url, payload, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(url, payload, { timeout: 5000 });
      return response.data;
    } catch (error) {
      logger.warn(`Webhook attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
};
```

---

## Related Docs

- [Bot Integration](./bot.md) - Bot setup
- [Widgets](./widgets.md) - Home widgets
- [API Endpoints](../api/cliq-endpoints.md) - Backend API

---

<div align="center">

**[← Bot Integration](./bot.md)** | **[Widgets →](./widgets.md)**

</div>
