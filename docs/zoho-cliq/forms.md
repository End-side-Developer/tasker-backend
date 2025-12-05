# 📝 Forms

Interactive forms in Zoho Cliq for task management.

---

## Overview

Forms provide rich input interfaces for creating and editing tasks.

---

## Form Types

| Form             | Purpose                  |
| ---------------- | ------------------------ |
| **Create Task**  | New task with all fields |
| **Quick Task**   | Minimal task creation    |
| **Edit Task**    | Modify existing task     |
| **Link Account** | OAuth account linking    |

---

## Create Task Form

Full task creation form.

### Form Definition

```deluge
createTaskForm = {
    "type": "form",
    "title": "📋 Create New Task",
    "hint": "Enter task details",
    "name": "create_task_form",
    "version": 1,
    "button_label": "Create Task",
    "inputs": [
        {
            "type": "text",
            "name": "title",
            "label": "Task Title",
            "placeholder": "What needs to be done?",
            "mandatory": true,
            "max_length": 200
        },
        {
            "type": "textarea",
            "name": "description",
            "label": "Description",
            "placeholder": "Add details...",
            "mandatory": false
        },
        {
            "type": "select",
            "name": "priority",
            "label": "Priority",
            "mandatory": true,
            "options": [
                {"label": "🟢 Low", "value": "low"},
                {"label": "🟡 Medium", "value": "medium"},
                {"label": "🟠 High", "value": "high"},
                {"label": "🔴 Urgent", "value": "urgent"}
            ],
            "value": "medium"
        },
        {
            "type": "date",
            "name": "dueDate",
            "label": "Due Date",
            "mandatory": false
        },
        {
            "type": "select",
            "name": "project",
            "label": "Project",
            "mandatory": false,
            "options": [], // Populated dynamically
            "trigger_on_change": true
        }
    ],
    "action": {
        "type": "invoke.function",
        "name": "handleCreateTask"
    }
};
```

### Form Handler

```deluge
// functions/handleCreateTask.dg

formData = form.get("values");
user = body.get("user");

// Prepare task data
taskData = Map();
taskData.put("title", formData.get("title"));
taskData.put("description", formData.get("description"));
taskData.put("priority", formData.get("priority"));
taskData.put("dueDate", formData.get("dueDate"));
taskData.put("cliqUserId", user.get("id"));

// Call backend
response = invokeurl [
    url: "https://api.tasker.com/tasks"
    type: POST
    headers: {
        "x-api-key": "API_KEY",
        "Content-Type": "application/json"
    }
    parameters: taskData.toString()
];

if (response.get("success") == true) {
    task = response.get("data");
    return {
        "type": "banner",
        "text": "✅ Task created: " + task.get("title"),
        "status": "success"
    };
} else {
    return {
        "type": "banner",
        "text": "❌ Failed to create task: " + response.get("error"),
        "status": "failure"
    };
}
```

---

## Quick Task Form

Minimal form for fast task creation.

```deluge
quickTaskForm = {
    "type": "form",
    "title": "⚡ Quick Task",
    "name": "quick_task_form",
    "inputs": [
        {
            "type": "text",
            "name": "title",
            "label": "Task",
            "placeholder": "Enter task...",
            "mandatory": true
        }
    ],
    "action": {
        "type": "invoke.function",
        "name": "handleQuickTask"
    }
};
```

---

## Edit Task Form

Pre-populated form for editing.

```deluge
// Fetch task data first
task = getTask(taskId);

editTaskForm = {
    "type": "form",
    "title": "✏️ Edit Task",
    "name": "edit_task_form",
    "inputs": [
        {
            "type": "hidden",
            "name": "taskId",
            "value": task.get("id")
        },
        {
            "type": "text",
            "name": "title",
            "label": "Task Title",
            "value": task.get("title"),
            "mandatory": true
        },
        {
            "type": "select",
            "name": "status",
            "label": "Status",
            "options": [
                {"label": "⬜ Pending", "value": "pending"},
                {"label": "🔄 In Progress", "value": "in_progress"},
                {"label": "✅ Completed", "value": "completed"}
            ],
            "value": task.get("status")
        },
        {
            "type": "select",
            "name": "priority",
            "label": "Priority",
            "options": [...],
            "value": task.get("priority")
        }
    ],
    "action": {
        "type": "invoke.function",
        "name": "handleEditTask"
    }
};
```

---

## Dynamic Options

Load options from backend.

### Projects Dropdown

```deluge
// Fetch user's projects
getProjectOptions = (cliqUserId) => {
    response = invokeurl [
        url: "https://api.tasker.com/projects?cliqUserId=" + cliqUserId
        type: GET
        headers: {"x-api-key": "API_KEY"}
    ];
    
    options = List();
    options.add({"label": "-- No Project --", "value": ""});
    
    for each project in response.get("data") {
        options.add({
            "label": project.get("name"),
            "value": project.get("id")
        });
    }
    
    return options;
};
```

### Assignees Dropdown

```deluge
getAssigneeOptions = () => {
    // Get channel members or team
    members = zoho.cliq.getChannelMembers(channelId);
    
    options = List();
    for each member in members {
        options.add({
            "label": member.get("name"),
            "value": member.get("id")
        });
    }
    
    return options;
};
```

---

## Form Input Types

### Text Input

```deluge
{
    "type": "text",
    "name": "title",
    "label": "Title",
    "placeholder": "Enter text...",
    "mandatory": true,
    "max_length": 200,
    "min_length": 3
}
```

### Textarea

```deluge
{
    "type": "textarea",
    "name": "description",
    "label": "Description",
    "placeholder": "Enter details...",
    "max_length": 2000
}
```

### Select (Dropdown)

```deluge
{
    "type": "select",
    "name": "priority",
    "label": "Priority",
    "options": [
        {"label": "Low", "value": "low"},
        {"label": "High", "value": "high"}
    ],
    "value": "low" // Default
}
```

### Multi-Select

```deluge
{
    "type": "multiselect",
    "name": "tags",
    "label": "Tags",
    "options": [
        {"label": "Bug", "value": "bug"},
        {"label": "Feature", "value": "feature"},
        {"label": "Urgent", "value": "urgent"}
    ]
}
```

### Date Picker

```deluge
{
    "type": "date",
    "name": "dueDate",
    "label": "Due Date"
}
```

### User Picker

```deluge
{
    "type": "user_select",
    "name": "assignee",
    "label": "Assign To",
    "multiple": false
}
```

### Hidden Field

```deluge
{
    "type": "hidden",
    "name": "taskId",
    "value": "task_123"
}
```

---

## Triggering Forms

### From Button

```deluge
{
    "label": "Create Task",
    "type": "+",
    "action": {
        "type": "system.form",
        "name": "create_task_form"
    }
}
```

### From Slash Command

```deluge
// /tasker add
if (action == "add") {
    return createTaskForm;
}
```

### From Bot Message

```deluge
// When user says "create task"
return {
    "text": "Let's create a task!",
    "form": createTaskForm
};
```

---

## Form Validation

### Client-side

```deluge
{
    "type": "text",
    "name": "title",
    "mandatory": true,
    "min_length": 3,
    "max_length": 200,
    "pattern": "^[a-zA-Z0-9 ]+$" // Regex pattern
}
```

### Server-side

```deluge
// In handler function
title = formData.get("title");

if (title == null || title.length() < 3) {
    return {
        "type": "banner",
        "text": "Title must be at least 3 characters",
        "status": "failure"
    };
}
```

---

## Response Types

### Success Banner

```deluge
{
    "type": "banner",
    "text": "✅ Task created successfully!",
    "status": "success"
}
```

### Error Banner

```deluge
{
    "type": "banner",
    "text": "❌ Failed to create task",
    "status": "failure"
}
```

### Card Response

```deluge
{
    "text": "Task created!",
    "card": {
        "title": "📋 " + task.get("title")
    },
    "slides": [...],
    "buttons": [...]
}
```

---

## Related Docs

- [Widgets](./widgets.md) - Home widgets
- [Bot Integration](./bot.md) - TaskerBot
- [Zoho Cliq Forms Guide](../ZOHO_CLIQ_FORMS_GUIDE.md) - Detailed reference

---

<div align="center">

**[← Widgets](./widgets.md)** | **[Back to Cliq Docs](./README.md)**

</div>
