# Zoho Cliq Developer Guide

> Comprehensive documentation for building extensions, commands, bots, widgets, and functions in Zoho Cliq.

## Table of Contents

1. [Overview](#overview)
2. [Extensions](#extensions)
3. [Slash Commands](#slash-commands)
4. [Bots](#bots)
5. [Widgets](#widgets)
6. [Functions](#functions)
7. [Message Cards & Formatting](#message-cards--formatting)
8. [Forms](#forms)
9. [Cliq Database](#cliq-database)
10. [REST API](#rest-api)
11. [Deluge Scripting](#deluge-scripting)
12. [Best Practices](#best-practices)
13. [Code Samples](#code-samples)

---

## Overview

Zoho Cliq is a team communication platform that supports extensive customization through its developer platform. You can build:

- **Extensions**: Bundles of multiple components
- **Commands**: Slash commands for quick actions
- **Bots**: Conversational interfaces for automation
- **Widgets**: Custom home screen panels
- **Functions**: Reusable Deluge scripts
- **Message Actions**: Context menu options on messages

### Key Limits

| Component | Limit |
|-----------|-------|
| Integration Components per Extension | 4 |
| Bots per Extension | 1 |
| Widgets per Extension | 1 |
| Functions per Extension | 20 |
| Databases per Extension | 6 |
| Buttons per Message Card | 5 |
| Widget Tabs | 5 |
| Sections per Tab | 25 |
| Elements per Section | 20 |

---

## Extensions

Extensions are bundles of Cliq platform components that work together. They can include commands, bots, message actions, functions, schedulers, and databases.

### Extension Components

```
Extension
├── Commands (up to 4 integration components)
├── Bot (1 max)
├── Widget (1 max)
├── Functions (up to 20)
├── Databases (up to 6)
├── Message Actions
├── Schedulers
└── Connections
```

### Extension Handlers

Extensions support these handlers:

| Handler | Purpose |
|---------|---------|
| `Installation Handler` | Runs when the extension is installed |
| `Uninstallation Handler` | Runs when the extension is uninstalled |
| `Incoming Webhook Handler` | Handles external webhook calls |
| `Link Handler` | Handles link unfurling |

### Extension Connectors

- **App Key**: Unique identifier for API authentication
- **Incoming Webhook Endpoint**: URL to receive external data

### Creating an Extension

1. Navigate to **Bots & Tools** → **Extensions**
2. Click **Create Extension**
3. Add components (commands, bots, functions)
4. Configure handlers
5. Test in sandbox mode
6. Publish when ready

---

## Slash Commands

Commands are slash-triggered actions that users invoke in chat (e.g., `/taskertask create`).

### Command Structure

```
/commandname [action] [arguments]
```

### Command Components

1. **Execution Handler**: Main logic when command runs
2. **Suggestion Handler**: Provides autocomplete suggestions

### Creating a Command

**Location**: Bots & Tools → Commands → Create Command

**Configuration Options**:
- Name (the slash command trigger)
- Description
- Access Level (Personal, Team, Organization)
- Arguments (parameters for the command)
- Click to Execute (run without pressing Enter)

### Execution Handler Template

```deluge
// arguments - Map containing command arguments
// user - Information about the user who executed the command
// chat - Information about the chat where command was executed

// Get the action from arguments
action = arguments.get("action");

// Build response
response = Map();

if(action == "list")
{
    response.put("text", "Here are your items...");
}
else if(action == "create")
{
    // Show a form
    form = Map();
    form.put("type", "form");
    form.put("title", "Create Item");
    form.put("name", "create_item_form");
    form.put("button_label", "Create");
    
    inputs = List();
    
    // Text input
    nameInput = Map();
    nameInput.put("type", "text");
    nameInput.put("name", "item_name");
    nameInput.put("label", "Name");
    nameInput.put("placeholder", "Enter item name");
    nameInput.put("mandatory", true);
    inputs.add(nameInput);
    
    form.put("inputs", inputs);
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "create_item_function");
    
    response.put("type", "form");
    response = form;
}
else
{
    response.put("text", "Unknown action. Try: list, create");
}

return response;
```

### Suggestion Handler Template

```deluge
// query - The text user has typed after the command
// user - Information about the user

suggestions = List();

// Add suggestion items
suggestion1 = Map();
suggestion1.put("title", "Create Task");
suggestion1.put("description", "Create a new task");
suggestion1.put("imageurl", "https://example.com/icon.png");
suggestions.add(suggestion1);

suggestion2 = Map();
suggestion2.put("title", "List Tasks");
suggestion2.put("description", "View all your tasks");
suggestions.add(suggestion2);

return suggestions;
```

### Command Arguments

Define arguments in command configuration:

```deluge
// Access arguments
action = arguments.get("action");
projectId = arguments.get("project");
taskName = arguments.get("name");
```

### Mentions in Commands

Access mentioned users:

```deluge
mentions = arguments.get("mentions");
for each mention in mentions
{
    userId = mention.get("id");
    userName = mention.get("name");
}
```

### Attachments in Commands

Access file attachments:

```deluge
attachments = arguments.get("attachments");
for each file in attachments
{
    fileName = file.get("name");
    fileUrl = file.get("url");
}
```

---

## Bots

Bots are conversational interfaces that can respond to messages, perform actions, and send notifications.

### Bot Handlers

| Handler | Trigger |
|---------|---------|
| `Welcome Handler` | When user first subscribes to bot |
| `Message Handler` | When user sends message to bot |
| `Mention Handler` | When bot is @mentioned in a channel |
| `Context Handler` | When user clicks action buttons |
| `Incoming Webhook Handler` | External webhook calls |
| `Participation Handler` | Bot added/removed from channel |
| `Call Handler` | Voice call interactions |
| `Menu Handler` | Bot menu actions |

### Welcome Handler

```deluge
// user - Information about the user who subscribed

response = Map();
response.put("text", "👋 Welcome to TaskerBot! I can help you manage tasks.");

// Add action buttons
buttons = List();

button1 = Map();
button1.put("label", "Get Started");
button1.put("type", "+");
button1.put("action", Map());
button1.get("action").put("type", "invoke.function");
button1.get("action").put("data", Map());
button1.get("action").get("data").put("name", "get_started");
buttons.add(button1);

response.put("buttons", buttons);

return response;
```

### Message Handler

```deluge
// message - The message sent by user
// user - Information about the user

messageText = message.get("text").toLowerCase();
response = Map();

if(messageText.containsIgnoreCase("help"))
{
    response.put("text", "Here's what I can do:\n• Create tasks\n• List tasks\n• Update status");
}
else if(messageText.containsIgnoreCase("create"))
{
    // Show create form
    response.put("type", "form");
    // ... form definition
}
else
{
    response.put("text", "I didn't understand that. Type 'help' for options.");
}

return response;
```

### Mention Handler

```deluge
// message - The message containing the mention
// user - User who mentioned the bot
// chat - The channel where mention occurred

response = Map();
response.put("text", "You mentioned me! How can I help?");
return response;
```

### Context Handler (Button Actions)

```deluge
// context - Data passed from button action
// user - User who clicked the button
// chat - Chat context

buttonKey = context.get("key");

if(buttonKey == "approve_task")
{
    taskId = context.get("task_id");
    // Process approval
    response = Map();
    response.put("text", "✅ Task approved!");
    return response;
}
```

### Posting Messages as Bot

```deluge
// Post to a channel
zoho.cliq.postToChannel("channel_unique_name", "Hello from bot!");

// Post to a user
zoho.cliq.postToChat(chatId, "Your message here");

// Post to bot's subscribers
zoho.cliq.postToBot("bot_unique_name", subscriberId, "Message");
```

### Bot Voice Calls

Bots can trigger voice calls for urgent notifications:

```deluge
// Trigger a bot call
callRequest = Map();
callRequest.put("text", "Urgent: Server is down!");
callRequest.put("user_ids", {"userId1", "userId2"});
callRequest.put("retry", 3);
callRequest.put("loop", 2);

response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/bots/botname/calls"
    type: POST
    parameters: callRequest.toString()
    headers: {"Authorization": "Zoho-oauthtoken " + accessToken}
];
```

---

## Widgets

Widgets are custom panels on the Cliq home screen that display information and provide quick actions.

### Widget Structure

```
Widget
├── Tabs (max 5)
│   ├── Sections (max 25 per tab)
│   │   └── Elements (max 20 per section)
│   └── Headers/Footers (up to 3 buttons each)
└── Tab Views
    ├── Sections (default)
    ├── Info
    ├── Web (iframe)
    ├── Map
    └── Form
```

### Creating a Widget

**Location**: Bots & Tools → Widgets → Create Widget

### Widget Execution Handler

```deluge
// target - Contains widget context
// user - User viewing the widget

// Create widget structure
widget = Map();

// Define tabs
tabs = List();

// Tab 1: Tasks Overview
tab1 = Map();
tab1.put("label", "Tasks");
tab1.put("id", "tasks_tab");

// Sections for Tab 1
sections = List();

// Section 1: Header
section1 = Map();
section1.put("id", "header_section");

elements1 = List();

// Title element
titleElement = Map();
titleElement.put("type", "title");
titleElement.put("text", "📋 My Tasks");
elements1.add(titleElement);

// Text element
textElement = Map();
textElement.put("type", "text");
textElement.put("text", "You have 5 pending tasks");
elements1.add(textElement);

section1.put("elements", elements1);
sections.add(section1);

// Section 2: Task Cards
section2 = Map();
section2.put("id", "tasks_section");

elements2 = List();

// Card element
cardElement = Map();
cardElement.put("type", "card");
card = Map();
card.put("title", "Review PR #123");
card.put("description", "Code review for authentication module");
card.put("thumbnail", "https://example.com/task-icon.png");
cardElement.put("card", card);
elements2.add(cardElement);

section2.put("elements", elements2);
sections.add(section2);

tab1.put("sections", sections);
tabs.add(tab1);

// Tab 2: Statistics
tab2 = Map();
tab2.put("label", "Stats");
tab2.put("id", "stats_tab");
// ... add sections for stats tab

tabs.add(tab2);

widget.put("tabs", tabs);
return widget;
```

### Widget Section Elements

#### Title

```deluge
element = Map();
element.put("type", "title");
element.put("text", "Section Title");

// With button
element.put("buttons", List());
button = Map();
button.put("label", "Action");
button.put("type", "+");
button.put("action", actionMap);
element.get("buttons").add(button);
```

#### Text

```deluge
element = Map();
element.put("type", "text");
element.put("text", "Regular text content with **markdown** support");
```

#### Subtext

```deluge
element = Map();
element.put("type", "subtext");
element.put("text", "Smaller secondary text");
```

#### Divider

```deluge
element = Map();
element.put("type", "divider");
```

#### Buttons

```deluge
element = Map();
element.put("type", "buttons");
buttons = List();

btn1 = Map();
btn1.put("label", "Primary");
btn1.put("type", "+");
btn1.put("action", Map());
btn1.get("action").put("type", "invoke.function");
btn1.get("action").put("data", Map());
btn1.get("action").get("data").put("name", "function_name");
buttons.add(btn1);

btn2 = Map();
btn2.put("label", "Danger");
btn2.put("type", "-");
buttons.add(btn2);

element.put("buttons", buttons);
```

#### Table

```deluge
element = Map();
element.put("type", "table");
tableData = Map();
tableData.put("headers", {"Name", "Status", "Due Date"});
rows = List();
rows.add({"Task 1", "In Progress", "2024-01-15"});
rows.add({"Task 2", "Completed", "2024-01-10"});
tableData.put("rows", rows);
element.put("data", tableData);
```

#### Fields (Label-Value Pairs)

```deluge
element = Map();
element.put("type", "fields");
fields = List();
fields.add({"label": "Project", "value": "Tasker App"});
fields.add({"label": "Priority", "value": "🔴 High"});
fields.add({"label": "Assignee", "value": "John Doe"});
element.put("data", fields);
```

#### Cards

```deluge
element = Map();
element.put("type", "card");
card = Map();
card.put("title", "Card Title");
card.put("description", "Card description text");
card.put("thumbnail", "https://example.com/image.png");
card.put("icon", "https://example.com/icon.png");
element.put("card", card);
```

#### Images

```deluge
element = Map();
element.put("type", "images");
element.put("data", {"https://example.com/img1.png", "https://example.com/img2.png"});
```

#### Charts

```deluge
element = Map();
element.put("type", "percentage_chart");
element.put("styles", {"preview": "doughnut"}); // or "pie"
chartData = List();
chartData.add({"label": "Completed", "value": 60});
chartData.add({"label": "In Progress", "value": 25});
chartData.add({"label": "Pending", "value": 15});
element.put("data", chartData);
```

#### Graphs

```deluge
element = Map();
element.put("type", "graph");
element.put("styles", {"preview": "bar"}); // or "trend", "line"
graphData = List();
category1 = Map();
category1.put("category", "Q1");
category1.put("values", {{"label": "Sales", "value": 100}, {"label": "Revenue", "value": 80}});
graphData.add(category1);
element.put("data", graphData);
```

### Widget Map View

```deluge
tab = Map();
tab.put("label", "Map");
tab.put("id", "map_tab");
tab.put("type", "map");

mapConfig = Map();
mapConfig.put("latitude", 12.9716);
mapConfig.put("longitude", 77.5946);
mapConfig.put("zoom", 12);

tab.put("map", mapConfig);
```

### Widget Web View (iFrame)

```deluge
tab = Map();
tab.put("label", "Dashboard");
tab.put("id", "web_tab");
tab.put("type", "web");
tab.put("url", "https://example.com/dashboard");
```

---

## Functions

Functions are reusable Deluge scripts that can be invoked from buttons, forms, or other handlers.

### Function Types

| Type | Trigger |
|------|---------|
| `Form Function` | When a form is submitted |
| `Button Function` | When a button is clicked |

### Creating a Function

**Location**: Bots & Tools → Functions → Create Function

### Form Function Template

```deluge
// target - Contains form context
// user - User who submitted the form
// formValues - Map of form field values

// Extract form values
// For text fields: use toString()
title = formValues.get("title");
if(title != null)
{
    title = title.toString();
}

// For select fields: use .get("value")
priorityObj = formValues.get("priority");
priority = "medium";
if(priorityObj != null)
{
    priority = priorityObj.get("value");
}

// For date fields: use toString()
dueDate = formValues.get("due_date");
if(dueDate != null)
{
    dueDate = dueDate.toString();
}

// For textarea: use toString()
description = formValues.get("description");
if(description != null)
{
    description = description.toString();
}

// Make API call
payload = Map();
payload.put("title", title);
payload.put("priority", priority);
payload.put("dueDate", dueDate);
payload.put("description", description);

headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "your-api-key");

response = invokeurl[
    url: "https://api.example.com/tasks"
    type: POST
    parameters: payload.toString()
    headers: headers
];

// Return response
result = Map();
if(response.get("success") == true)
{
    result.put("text", "✅ Task created successfully!");
}
else
{
    result.put("text", "❌ Failed to create task");
}
return result;
```

### Button Function Template

```deluge
// target - Contains button context
// user - User who clicked the button
// context - Data passed from button

taskId = context.get("task_id");
action = context.get("action");

if(action == "complete")
{
    // Mark task complete
    response = invokeurl[
        url: "https://api.example.com/tasks/" + taskId + "/complete"
        type: PUT
        headers: {"x-api-key": "your-api-key"}
    ];
    
    return {"text": "✅ Task marked as complete!"};
}
else if(action == "delete")
{
    // Delete task
    return {"text": "🗑️ Task deleted"};
}
```

---

## Message Cards & Formatting

### Basic Message

```deluge
response = Map();
response.put("text", "Hello, world!");
return response;
```

### Message with Card

```deluge
response = Map();
response.put("text", "New task created!");
response.put("card", Map());
response.get("card").put("title", "Task Details");
response.get("card").put("theme", "modern-inline");
response.get("card").put("thumbnail", "https://example.com/icon.png");
return response;
```

### Card Themes

| Theme | Description |
|-------|-------------|
| `modern-inline` | Modern look with inline layout |
| `prompt` | Question/prompt style |
| `poll` | Polling style |

**Note**: Always use valid themes. Invalid themes will cause errors.

### Message with Buttons

```deluge
response = Map();
response.put("text", "Would you like to proceed?");
response.put("buttons", List());

yesBtn = Map();
yesBtn.put("label", "Yes");
yesBtn.put("type", "+");
yesBtn.put("action", Map());
yesBtn.get("action").put("type", "invoke.function");
yesBtn.get("action").put("data", Map());
yesBtn.get("action").get("data").put("name", "confirm_action");
response.get("buttons").add(yesBtn);

noBtn = Map();
noBtn.put("label", "No");
noBtn.put("type", "-");
response.get("buttons").add(noBtn);

return response;
```

### Button Types

| Type | Appearance |
|------|------------|
| `+` | Green/positive button |
| `-` | Red/negative button |

### Button Actions

#### Invoke Function

```deluge
action = Map();
action.put("type", "invoke.function");
action.put("data", Map());
action.get("data").put("name", "function_name");
// Pass custom data
action.get("data").put("task_id", "123");
```

#### Open URL

```deluge
action = Map();
action.put("type", "open.url");
action.put("data", Map());
action.get("data").put("web", "https://example.com/page");
```

#### System API

```deluge
action = Map();
action.put("type", "system.api");
action.put("data", Map());
action.get("data").put("api", "startchat/userId");
// Options: audiocall, videocall, startchat, invite
```

### Message with Table

```deluge
response = Map();
response.put("text", "Here are your tasks:");
response.put("slides", List());

tableSlide = Map();
tableSlide.put("type", "table");
tableSlide.put("title", "Task List");
tableSlide.put("data", Map());
tableSlide.get("data").put("headers", {"Task", "Status", "Due"});
tableSlide.get("data").put("rows", List());
tableSlide.get("data").get("rows").add({"Review code", "Pending", "Today"});
tableSlide.get("data").get("rows").add({"Write docs", "Done", "Yesterday"});

response.get("slides").add(tableSlide);
return response;
```

### Message with List

```deluge
response = Map();
response.put("slides", List());

listSlide = Map();
listSlide.put("type", "list");
listSlide.put("title", "Features");
listSlide.put("data", {"Feature 1", "Feature 2", "Feature 3"});

response.get("slides").add(listSlide);
return response;
```

### Markdown Support

```deluge
text = "**Bold** and *italic* text\n";
text = text + "[Link](https://example.com)\n";
text = text + "`inline code`\n";
text = text + "```\ncode block\n```";

response = Map();
response.put("text", text);
return response;
```

### Mentions

```deluge
// Mention a user
text = "Hey @[User Name](userId), please check this.";

// Mention everyone
text = "@everyone Please review the updates.";

// Mention here (online users)
text = "@here Quick sync needed.";
```

---

## Forms

Forms collect user input through a structured UI.

### Form Structure

```deluge
form = Map();
form.put("type", "form");
form.put("title", "Create Task");
form.put("name", "create_task_form");
form.put("hint", "Fill in the task details");
form.put("button_label", "Create Task");

inputs = List();
// ... add inputs
form.put("inputs", inputs);

// Form submission action
form.put("action", Map());
form.get("action").put("type", "invoke.function");
form.get("action").put("name", "create_task_function");

return form;
```

### Input Types

#### Text Input

```deluge
input = Map();
input.put("type", "text");
input.put("name", "task_title");
input.put("label", "Title");
input.put("placeholder", "Enter task title");
input.put("mandatory", true);
input.put("max_length", 100);
input.put("min_length", 1);
input.put("value", "Default value"); // Optional default
```

#### Textarea

```deluge
input = Map();
input.put("type", "textarea");
input.put("name", "description");
input.put("label", "Description");
input.put("placeholder", "Enter detailed description");
input.put("mandatory", false);
```

#### Select (Dropdown)

```deluge
input = Map();
input.put("type", "select");
input.put("name", "priority");
input.put("label", "Priority");
input.put("mandatory", true);

options = List();
options.add({"label": "🔴 High", "value": "high"});
options.add({"label": "🟡 Medium", "value": "medium"});
options.add({"label": "🟢 Low", "value": "low"});
input.put("options", options);

input.put("value", "medium"); // Default selection
```

#### Multi-Select

```deluge
input = Map();
input.put("type", "multiselect");
input.put("name", "tags");
input.put("label", "Tags");

options = List();
options.add({"label": "Bug", "value": "bug"});
options.add({"label": "Feature", "value": "feature"});
options.add({"label", "Urgent", "value": "urgent"});
input.put("options", options);
```

#### Date Picker

```deluge
input = Map();
input.put("type", "date");
input.put("name", "due_date");
input.put("label", "Due Date");
input.put("mandatory", false);
```

#### Checkbox

```deluge
input = Map();
input.put("type", "checkbox");
input.put("name", "notify");
input.put("label", "Notify assignee");
input.put("value", true); // Default checked
```

#### Radio

```deluge
input = Map();
input.put("type", "radio");
input.put("name", "type");
input.put("label", "Task Type");

options = List();
options.add({"label": "Task", "value": "task"});
options.add({"label": "Bug", "value": "bug"});
options.add({"label": "Story", "value": "story"});
input.put("options", options);
```

#### User Select

```deluge
input = Map();
input.put("type", "user_select");
input.put("name", "assignee");
input.put("label", "Assign To");
input.put("mandatory", false);
```

#### Dynamic Select (with suggestions)

```deluge
input = Map();
input.put("type", "dynamic_select");
input.put("name", "project");
input.put("label", "Project");
input.put("trigger_on_change", true);
input.put("action", Map());
input.get("action").put("type", "invoke.function");
input.get("action").put("name", "get_project_suggestions");
```

### Form Change Handler

Handle dynamic form updates when fields change:

```deluge
// Function triggered by trigger_on_change

changedField = target.get("name");
currentValue = target.get("value");

if(changedField == "project")
{
    // Fetch tasks for selected project
    tasks = getTasksForProject(currentValue);
    
    // Return updated form inputs
    updates = Map();
    updates.put("type", "form_modification");
    
    inputs = List();
    taskInput = Map();
    taskInput.put("type", "select");
    taskInput.put("name", "task");
    taskInput.put("label", "Task");
    taskInput.put("options", tasks);
    inputs.add(taskInput);
    
    updates.put("inputs", inputs);
    return updates;
}
```

### Extracting Form Values in Function

```deluge
// Text field
title = formValues.get("title");
if(title != null)
{
    title = title.toString();
}

// Select field - returns object with label and value
priorityObj = formValues.get("priority");
priority = "";
if(priorityObj != null)
{
    priority = priorityObj.get("value");
}

// Multi-select - returns list
tags = formValues.get("tags");
tagValues = List();
if(tags != null)
{
    for each tag in tags
    {
        tagValues.add(tag.get("value"));
    }
}

// Date field
dueDate = formValues.get("due_date");
if(dueDate != null)
{
    dueDate = dueDate.toString();
}

// Checkbox
notify = formValues.get("notify");
// Returns true/false

// User select - returns user object
assignee = formValues.get("assignee");
if(assignee != null)
{
    assigneeId = assignee.get("id");
    assigneeName = assignee.get("name");
    assigneeEmail = assignee.get("email_id");
}
```

---

## Cliq Database

Cliq Database provides storage for extension data.

### Create Database

**Location**: Bots & Tools → Databases → Create Database

Define columns with types:
- String
- Number
- Boolean
- Encrypted (for sensitive data)

### Add Record

```deluge
record = Map();
record.put("user_id", "123");
record.put("task_count", 5);
record.put("is_active", true);

response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records"
    type: POST
    parameters: {"values": record}.toString()
    headers: {"Authorization": "Zoho-oauthtoken " + accessToken}
];
```

### Retrieve Records

```deluge
// Get all records
response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records"
    type: GET
    headers: {"Authorization": "Zoho-oauthtoken " + accessToken}
];

// Get with criteria
response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records?criteria=(user_id==123)"
    type: GET
    headers: headers
];

// With pagination
response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records?from_index=0&limit=10"
    type: GET
    headers: headers
];
```

### Update Record

```deluge
response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records/record_id"
    type: PUT
    parameters: {"values": {"task_count": 10}}.toString()
    headers: headers
];
```

### Delete Record

```deluge
response = invokeurl[
    url: "https://cliq.zoho.com/api/v2/storages/database_name/records/record_id"
    type: DELETE
    headers: headers
];
```

---

## REST API

### Authentication

Cliq uses OAuth 2.0. Required scopes vary by API:

| Scope | Purpose |
|-------|---------|
| `ZohoCliq.Webhooks.CREATE` | Send messages |
| `ZohoCliq.Channels.READ` | Read channel info |
| `ZohoCliq.Channels.CREATE` | Create channels |
| `ZohoCliq.Users.READ` | Read user info |
| `ZohoCliq.Chats.READ` | Read chat history |

### Base URLs

| Region | URL |
|--------|-----|
| US | `https://cliq.zoho.com` |
| EU | `https://cliq.zoho.eu` |
| IN | `https://cliq.zoho.in` |
| AU | `https://cliq.zoho.com.au` |
| JP | `https://cliq.zoho.jp` |

### Common Endpoints

#### Send Message

```http
POST /api/v2/channelsbyname/{channel_name}/message
Authorization: Zoho-oauthtoken {access_token}
Content-Type: application/json

{"text": "Hello, channel!"}
```

#### Get Users

```http
GET /api/v2/users
Authorization: Zoho-oauthtoken {access_token}
```

#### Get Channels

```http
GET /api/v2/channels?joined=true
Authorization: Zoho-oauthtoken {access_token}
```

#### Get Messages

```http
GET /api/v2/chats/{chat_id}/messages?limit=100
Authorization: Zoho-oauthtoken {access_token}
```

### Rate Limits

| API | Limit |
|-----|-------|
| Messages | 50 requests/min/user |
| Users | 30 requests/min/user |
| Channels | 30 requests/min/user |

---

## Deluge Scripting

### Key Deluge Functions

#### HTTP Requests

```deluge
// GET request
response = invokeurl[
    url: "https://api.example.com/data"
    type: GET
    headers: {"Authorization": "Bearer token"}
];

// POST request
response = invokeurl[
    url: "https://api.example.com/data"
    type: POST
    parameters: payload.toString()
    headers: {"Content-Type": "application/json"}
];

// PUT request
response = invokeurl[
    url: "https://api.example.com/data/123"
    type: PUT
    parameters: payload.toString()
    headers: headers
];

// DELETE request
response = invokeurl[
    url: "https://api.example.com/data/123"
    type: DELETE
    headers: headers
];
```

#### Cliq-Specific Tasks

```deluge
// Post to channel
zoho.cliq.postToChannel("channel_name", message);

// Post as bot
zoho.cliq.postToChannelAsBot("channel_name", "bot_name", message);

// Post to chat
zoho.cliq.postToChat(chatId, message);

// Post to bot subscriber
zoho.cliq.postToBot("bot_name", userId, message);
```

#### Data Operations

```deluge
// Create Map
myMap = Map();
myMap.put("key", "value");
value = myMap.get("key");

// Create List
myList = List();
myList.add("item1");
myList.add("item2");

// Check if key exists
if(myMap.containsKey("key"))
{
    // Key exists
}

// Iterate list
for each item in myList
{
    info item;
}

// Iterate map
for each key in myMap.keys()
{
    value = myMap.get(key);
}
```

#### String Operations

```deluge
// Check contains
if(str.containsIgnoreCase("search"))
{
    // Found
}

// Split
parts = str.split(",");

// Replace
newStr = str.replaceAll("old", "new");

// Trim
trimmed = str.trim();

// Case conversion
lower = str.toLowerCase();
upper = str.toUpperCase();

// Get length
len = str.length();
```

#### Error Handling

```deluge
try
{
    response = invokeurl[
        url: "https://api.example.com/data"
        type: GET
    ];
}
catch (e)
{
    info "Error: " + e;
    return {"text": "An error occurred"};
}
```

#### Logging

```deluge
// Info log (visible in function logs)
info "Debug message: " + variableValue;

// Log map
info payload.toString();
```

### Common Patterns

#### Null Safety

```deluge
value = formValues.get("field");
if(value != null && value != "")
{
    // Safe to use value
}
else
{
    value = "default";
}
```

#### Conditional Responses

```deluge
// DON'T use ternary operators (not supported)
// result = condition ? "yes" : "no"; // WRONG!

// DO use if-else
if(condition)
{
    result = "yes";
}
else
{
    result = "no";
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```deluge
try
{
    apiResponse = invokeurl[...];
    
    if(apiResponse.get("status") == "success")
    {
        return {"text": "✅ Operation successful!"};
    }
    else
    {
        errorMsg = apiResponse.get("message");
        return {"text": "❌ Error: " + errorMsg};
    }
}
catch (e)
{
    info "API Error: " + e;
    return {"text": "❌ Something went wrong. Please try again."};
}
```

### 2. User Feedback

Provide immediate feedback:

```deluge
// Show loading state via quick response
// Then use async operations for long tasks
```

### 3. Input Validation

Validate before processing:

```deluge
title = formValues.get("title");
if(title == null || title.toString().trim() == "")
{
    return {"text": "❌ Title is required"};
}
```

### 4. Use Meaningful Labels

```deluge
// Good
options.add({"label": "🔴 High Priority", "value": "high"});

// Bad
options.add({"label": "1", "value": "high"});
```

### 5. Consistent Response Format

```deluge
// Success
return {
    "text": "✅ Task created successfully!",
    "card": {
        "title": "New Task",
        "theme": "modern-inline"
    }
};

// Error
return {
    "text": "❌ Failed to create task: " + errorMessage
};
```

### 6. API Key Security

Never hardcode sensitive data in code. Use:
- Cliq Database with encrypted columns
- Connection configurations
- Environment-specific variables

### 7. Logging for Debugging

```deluge
info "=== Starting function ===";
info "Form values: " + formValues.toString();
info "User: " + user.get("email_id");

// After API call
info "API Response: " + apiResponse.toString();
```

---

## Code Samples

### Complete Command Example

```deluge
// /tasker command with list and create actions

action = arguments.get("action");

if(action == null || action == "")
{
    action = "help";
}

if(action == "list")
{
    // Fetch tasks from API
    headers = Map();
    headers.put("x-api-key", API_KEY);
    
    response = invokeurl[
        url: BASE_URL + "/tasks"
        type: GET
        headers: headers
    ];
    
    if(response.get("tasks").size() == 0)
    {
        return {"text": "📭 No tasks found"};
    }
    
    // Build table
    result = Map();
    result.put("text", "📋 Your Tasks:");
    result.put("card", {"theme": "modern-inline", "title": "Task List"});
    
    slides = List();
    tableSlide = Map();
    tableSlide.put("type", "table");
    tableSlide.put("data", Map());
    tableSlide.get("data").put("headers", {"Title", "Status", "Priority"});
    
    rows = List();
    for each task in response.get("tasks")
    {
        rows.add({task.get("title"), task.get("status"), task.get("priority")});
    }
    tableSlide.get("data").put("rows", rows);
    slides.add(tableSlide);
    
    result.put("slides", slides);
    return result;
}
else if(action == "create")
{
    // Show create form
    form = Map();
    form.put("type", "form");
    form.put("title", "Create New Task");
    form.put("name", "create_task");
    form.put("button_label", "Create");
    
    inputs = List();
    
    // Title
    titleInput = Map();
    titleInput.put("type", "text");
    titleInput.put("name", "title");
    titleInput.put("label", "Task Title");
    titleInput.put("mandatory", true);
    inputs.add(titleInput);
    
    // Priority
    priorityInput = Map();
    priorityInput.put("type", "select");
    priorityInput.put("name", "priority");
    priorityInput.put("label", "Priority");
    options = List();
    options.add({"label": "🔴 High", "value": "high"});
    options.add({"label": "🟡 Medium", "value": "medium"});
    options.add({"label": "🟢 Low", "value": "low"});
    priorityInput.put("options", options);
    priorityInput.put("value", "medium");
    inputs.add(priorityInput);
    
    // Due date
    dateInput = Map();
    dateInput.put("type", "date");
    dateInput.put("name", "due_date");
    dateInput.put("label", "Due Date");
    inputs.add(dateInput);
    
    form.put("inputs", inputs);
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "create_task_handler");
    
    return form;
}
else
{
    return {
        "text": "📖 **Tasker Commands**\n\n" +
                "• `/tasker list` - View all tasks\n" +
                "• `/tasker create` - Create a new task\n" +
                "• `/tasker help` - Show this help"
    };
}
```

### Complete Form Function Example

```deluge
// Form function: create_task_handler

// Extract values
title = formValues.get("title");
if(title != null)
{
    title = title.toString().trim();
}

priorityObj = formValues.get("priority");
priority = "medium";
if(priorityObj != null)
{
    priority = priorityObj.get("value");
}

dueDate = formValues.get("due_date");
if(dueDate != null)
{
    dueDate = dueDate.toString();
}

// Validate
if(title == null || title == "")
{
    return {"text": "❌ Title is required"};
}

// Build payload
payload = Map();
payload.put("title", title);
payload.put("priority", priority);
if(dueDate != null && dueDate != "")
{
    payload.put("dueDate", dueDate);
}
payload.put("createdBy", user.get("email_id"));

// Make API call
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", API_KEY);

try
{
    apiResponse = invokeurl[
        url: BASE_URL + "/tasks"
        type: POST
        parameters: payload.toString()
        headers: headers
    ];
    
    if(apiResponse.containsKey("id"))
    {
        result = Map();
        result.put("text", "✅ Task created: **" + title + "**");
        result.put("card", Map());
        result.get("card").put("theme", "modern-inline");
        result.get("card").put("title", "New Task");
        
        slides = List();
        labelSlide = Map();
        labelSlide.put("type", "label");
        labelSlide.put("data", List());
        labelSlide.get("data").add({"Priority": priority});
        if(dueDate != null)
        {
            labelSlide.get("data").add({"Due Date": dueDate});
        }
        slides.add(labelSlide);
        result.put("slides", slides);
        
        return result;
    }
    else
    {
        return {"text": "❌ Failed to create task: " + apiResponse.get("error")};
    }
}
catch (e)
{
    info "Error creating task: " + e;
    return {"text": "❌ An error occurred. Please try again."};
}
```

---

## Additional Resources

- [Official Documentation](https://www.zoho.com/cliq/help/platform/)
- [Message Builder](https://cliq.zoho.com/messagebuilder)
- [Deluge Reference](https://www.zoho.com/deluge/help/)
- [Code Samples](https://www.zoho.com/cliq/help/platform/code-samples.html)
- [REST API Reference](https://www.zoho.com/cliq/help/restapi/v2/)

### Sample Extensions to Download

| Extension | Components | Download |
|-----------|------------|----------|
| Appear | Commands | [Download](https://www.zoho.com/cliq/codesamples/appear-file.zip) |
| Yelp | Commands, Function | [Download](https://www.zoho.com/cliq/codesamples/yelp.zip) |
| Google Drive | Commands, Function | [Download](https://www.zoho.com/cliq/codesamples/google-drive.zip) |
| Zendesk | Commands | [Download](https://www.zoho.com/cliq/codesamples/zendesk.zip) |
| Asana | Commands, Bot | [Download](https://www.zoho.com/cliq/codesamples/asana.zip) |
| Zoho Projects | Action, Form | [Download](https://www.zoho.com/cliq/codesamples/add-task-in-zoho-projects.zip) |

---

*Last updated: January 2025*
