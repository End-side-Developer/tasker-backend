# 📋 Widgets

Zoho Cliq home widgets for task overview.

---

## Overview

Cliq widgets provide at-a-glance task information in the Cliq home screen.

---

## Widget Types

| Type                 | Description              |
| -------------------- | ------------------------ |
| **Summary Widget**   | Quick stats and overview |
| **Task List Widget** | Today's tasks            |
| **Progress Widget**  | Weekly progress chart    |

---

## Summary Widget

Displays task statistics.

### Display

```
┌─────────────────────────────┐
│     📋 Tasker Summary       │
├─────────────────────────────┤
│  Today       │   This Week  │
│  ───────     │   ─────────  │
│  Pending: 5  │   Total: 24  │
│  Done: 3     │   Done: 18   │
│  Overdue: 1  │   Rate: 75%  │
├─────────────────────────────┤
│  [View Tasks] [Quick Add]   │
└─────────────────────────────┘
```

### Backend Endpoint

```
GET /api/cliq/widget?type=summary&cliqUserId=xxx
```

### Response

```json
{
  "success": true,
  "data": {
    "today": {
      "pending": 5,
      "completed": 3,
      "overdue": 1
    },
    "week": {
      "total": 24,
      "completed": 18,
      "completionRate": 75
    }
  }
}
```

### Widget Handler (Deluge)

```deluge
// widget/home-widget.dg

cliqUserId = user.get("id");

// Fetch data from backend
response = invokeurl [
    url: "https://api.tasker.com/cliq/widget?type=summary&cliqUserId=" + cliqUserId
    type: GET
    headers: {"x-api-key": "API_KEY"}
];

data = response.get("data");
today = data.get("today");
week = data.get("week");

return {
    "text": "📋 Tasker Summary",
    "slides": [
        {
            "type": "table",
            "data": {
                "headers": ["Today", "This Week"],
                "rows": [
                    ["Pending: " + today.get("pending"), "Total: " + week.get("total")],
                    ["Done: " + today.get("completed"), "Done: " + week.get("completed")],
                    ["Overdue: " + today.get("overdue"), "Rate: " + week.get("completionRate") + "%"]
                ]
            }
        }
    ],
    "buttons": [
        {"label": "View Tasks", "type": "+"},
        {"label": "Quick Add", "type": "-"}
    ]
};
```

---

## Task List Widget

Shows today's tasks.

### Display

```
┌─────────────────────────────┐
│     📋 Today's Tasks (5)    │
├─────────────────────────────┤
│ □ Review PR            🔴   │
│   Due: 10:00 AM             │
├─────────────────────────────┤
│ □ Team meeting         🟡   │
│   Due: 2:00 PM              │
├─────────────────────────────┤
│ □ Send report          🟡   │
│   Due: 5:00 PM              │
├─────────────────────────────┤
│     [View All] [Add]        │
└─────────────────────────────┘
```

### Backend Endpoint

```
GET /api/cliq/widget?type=tasks&cliqUserId=xxx
```

### Widget Handler

```deluge
// Fetch today's tasks
response = invokeurl [
    url: "https://api.tasker.com/tasks?cliqUserId=" + cliqUserId + "&due=today"
    type: GET
    headers: {"x-api-key": "API_KEY"}
];

tasks = response.get("data");

// Build task rows
rows = List();
for each task in tasks {
    priority = getPriorityEmoji(task.get("priority"));
    rows.add([task.get("title") + " " + priority, "Due: " + task.get("dueTime")]);
}

return {
    "text": "📋 Today's Tasks (" + tasks.size() + ")",
    "slides": [
        {
            "type": "table",
            "data": {
                "headers": ["Task", "Due"],
                "rows": rows
            }
        }
    ]
};
```

---

## Setup

### 1. Create Widget

In Zoho Cliq Developer Console:

1. Go to **Bots & Tools** → **Widgets**
2. Click **Create Widget**
3. Configure:

| Field          | Value             |
| -------------- | ----------------- |
| Name           | `Tasker Overview` |
| Widget Type    | Home Widget       |
| Execution Type | Handler           |

### 2. Widget Handler

```deluge
// widget/handler.dg

widgetType = params.get("type");

if (widgetType == "summary") {
    return getSummaryWidget();
}
else if (widgetType == "tasks") {
    return getTaskListWidget();
}
else {
    return getDefaultWidget();
}
```

### 3. Refresh Settings

Configure auto-refresh:

| Setting      | Value     |
| ------------ | --------- |
| Auto Refresh | Enabled   |
| Interval     | 5 minutes |
| On Open      | Refresh   |

---

## Backend Controller

```javascript
// src/controllers/widgetController.js
const getWidgetData = async (req, res) => {
  const { type, cliqUserId } = req.query;
  
  // Map Cliq user to Tasker user
  const mapping = await cliqService.getUserMapping(cliqUserId);
  if (!mapping) {
    return res.json({
      success: false,
      error: "User not linked"
    });
  }
  
  let data;
  switch (type) {
    case 'summary':
      data = await getSummaryData(mapping.taskerId);
      break;
    case 'tasks':
      data = await getTodaysTasks(mapping.taskerId);
      break;
    default:
      data = await getDefaultData(mapping.taskerId);
  }
  
  return res.json({ success: true, data });
};

const getSummaryData = async (taskerId) => {
  const today = await taskService.getTaskStats(taskerId, 'today');
  const week = await taskService.getTaskStats(taskerId, 'week');
  
  return { today, week };
};
```

---

## Interactive Buttons

### Complete Task Button

```deluge
{
    "label": "✓",
    "type": "+",
    "action": {
        "type": "invoke.function",
        "name": "completeTask",
        "data": {
            "taskId": task.get("id")
        }
    }
}
```

### Open Tasker App

```deluge
{
    "label": "Open Tasker",
    "type": "+",
    "action": {
        "type": "open.url",
        "data": {
            "web": "https://tasker-app.com/tasks"
        }
    }
}
```

### Quick Add Form

```deluge
{
    "label": "Quick Add",
    "action": {
        "type": "system.form",
        "name": "quick_task_form"
    }
}
```

---

## Styling

### Priority Colors

```deluge
getPriorityEmoji = (priority) => {
    if (priority == "urgent") return "🔴";
    if (priority == "high") return "🟠";
    if (priority == "medium") return "🟡";
    return "🟢";
};
```

### Status Icons

```deluge
getStatusIcon = (status) => {
    if (status == "completed") return "✅";
    if (status == "in_progress") return "🔄";
    return "⬜";
};
```

---

## Related Docs

- [Bot Integration](./bot.md) - TaskerBot
- [Forms](./forms.md) - Interactive forms
- [Cliq Endpoints](../api/cliq-endpoints.md) - API reference

---

<div align="center">

**[← Webhooks](./webhooks.md)** | **[Forms →](./forms.md)**

</div>
