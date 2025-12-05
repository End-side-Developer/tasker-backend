# 🔌 Zoho Cliq Integration Overview

Integration between Tasker and Zoho Cliq.

---

## What is Zoho Cliq?

Zoho Cliq is a team communication platform. This integration brings Tasker's task management capabilities directly into Cliq.

---

## Integration Features

| Feature             | Description                            |
| ------------------- | -------------------------------------- |
| **Slash Commands**  | Create and manage tasks with `/tasker` |
| **TaskerBot**       | Conversational AI for task management  |
| **Home Widget**     | Dashboard widget showing task overview |
| **Webhooks**        | Real-time notifications                |
| **Message Actions** | Convert messages to tasks              |

---

## User Flow

### 1. Account Linking

Before using Tasker in Cliq, users must link their accounts:

```
Cliq User ──► /tasker link ──► OAuth Flow ──► Account Linked
```

### 2. Task Management

Once linked, users can manage tasks:

```
/tasker list        → View pending tasks
/tasker add "Task"  → Create new task
/tasker done #123   → Complete task
```

### 3. Notifications

Receive updates directly in Cliq:

```
📋 Task Reminder
"Review PR" is due in 1 hour
[View] [Complete] [Snooze]
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                        ZOHO CLIQ                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Slash   │  │   Bot    │  │  Widget  │  │ Message  │    │
│  │ Commands │  │          │  │          │  │ Actions  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    TASKER BACKEND                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Cliq Controller                     │  │
│  │  - Command Handler                                    │  │
│  │  - Widget Handler                                     │  │
│  │  - Webhook Handler                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Cliq Service                        │  │
│  │  - User Mapping                                       │  │
│  │  - Response Formatting                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       FIRESTORE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  tasks   │  │ projects │  │  cliq_user_mappings      │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Action** → Cliq sends request to backend
2. **Authentication** → API key verified
3. **User Resolution** → Cliq user mapped to Tasker user
4. **Business Logic** → Action processed (CRUD, query, etc.)
5. **Response** → Formatted Cliq card returned
6. **Display** → Rich UI shown in Cliq

---

## Setup Requirements

### Backend

- Node.js 18+
- Firebase Admin SDK
- Environment variables configured

### Zoho Cliq

1. Create Cliq Extension
2. Configure slash command
3. Set up bot handlers
4. Add home widget
5. Configure webhooks

See [Slash Commands](./slash-commands.md) for detailed setup.

---

## Environment Variables

```env
# Cliq Extension
CLIQ_API_KEY=your-cliq-api-key
CLIQ_CLIENT_ID=your-client-id
CLIQ_CLIENT_SECRET=your-client-secret

# Webhook (optional)
CLIQ_WEBHOOK_SECRET=webhook-verification-secret
```

---

## Authentication

### API Key Auth

Cliq extension calls use API key:

```http
POST /api/cliq/command
x-api-key: CLIQ_API_KEY
```

### User Context

Every Cliq request includes user context:

```json
{
  "user": {
    "id": "cliq_user_123",
    "name": "John Doe",
    "email": "john@company.com"
  },
  "chat": {
    "id": "channel_456",
    "type": "channel"
  }
}
```

---

## Response Formats

### Simple Text

```json
{
  "text": "Task created successfully!"
}
```

### Rich Card

```json
{
  "text": "Your Tasks",
  "card": {
    "title": "📋 Tasks",
    "theme": "modern-inline"
  },
  "slides": [...],
  "buttons": [...]
}
```

See [Forms](./forms.md) for card building.

---

## Related Docs

- [Slash Commands](./slash-commands.md) - Command reference
- [Bot Integration](./bot.md) - TaskerBot setup
- [Developer Guide](../ZOHO_CLIQ_DEVELOPER_GUIDE.md) - Complete reference

---

<div align="center">

**[← Back to Cliq Docs](./README.md)** | **[Slash Commands →](./slash-commands.md)**

</div>
