# 🖱️ Feature 5: Message Actions & Context Menus

> **Goal**: Enable right-click actions on messages to create tasks, notes, and reminders instantly.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 5.1 | Message Action Setup | 🔴 High | ⬜ TODO | 2h |
| 5.2 | Backend Action Endpoints | 🔴 High | ⬜ TODO | 4h |
| 5.3 | Create Task from Message | 🔴 High | ⬜ TODO | 4h |
| 5.4 | Add to Notes/Diary | 🟡 Medium | ⬜ TODO | 3h |
| 5.5 | Set Reminder from Message | 🟡 Medium | ⬜ TODO | 3h |
| 5.6 | Link to Existing Task | 🟡 Medium | ⬜ TODO | 3h |
| 5.7 | NLP Text Extraction | 🟢 Low | ⬜ TODO | 4h |
| 5.8 | Testing & Refinement | 🔴 High | ⬜ TODO | 3h |

**Total Estimated: ~26 hours (5 days)**

---

## 📝 Task Details

### 5.1 Message Action Setup
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Register message actions in Zoho Cliq

**Steps**:
- [ ] Go to Zoho Cliq → Admin Settings → Message Actions
- [ ] Create "Create Task" action
- [ ] Create "Add to Notes" action
- [ ] Create "Set Reminder" action
- [ ] Create "Link to Task" action
- [ ] Configure action icons and labels
- [ ] Set action visibility (all messages vs specific)

**Message Actions to Create**:

| Action | Label | Icon | Description |
|--------|-------|------|-------------|
| `create_task` | 📝 Create Task | task_icon | Create a task from this message |
| `add_note` | 📌 Add to Notes | note_icon | Save to personal notes/diary |
| `set_reminder` | ⏰ Set Reminder | reminder_icon | Remind about this message |
| `link_task` | 🔗 Link to Task | link_icon | Link to existing task |

**Acceptance Criteria**:
- [ ] Actions appear on right-click
- [ ] Icons display correctly
- [ ] Actions available on all messages
- [ ] Handler functions connected

**Files to Create**:
```
cliq-scripts/handlers/
├── message-action-handler.dg
└── README.md
```

---

### 5.2 Backend Action Endpoints
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Create backend endpoints for message actions

**Steps**:
- [ ] Create `src/controllers/messageActionController.js`
- [ ] Implement `POST /api/cliq/actions/create-from-message`
- [ ] Implement `POST /api/cliq/actions/add-note`
- [ ] Implement `POST /api/cliq/actions/set-reminder`
- [ ] Implement `POST /api/cliq/actions/link-message`
- [ ] Implement `GET /api/cliq/actions/extract-task-info`
- [ ] Implement `GET /api/cliq/actions/search-tasks`
- [ ] Add routes

**Code Template** - `messageActionController.js`:
```javascript
const logger = require('../config/logger');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');
const nlpService = require('../services/nlpService');
const { admin } = require('../config/firebase');

/**
 * Create task from message
 */
exports.createFromMessage = async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      messageText, 
      messageId, 
      channelId,
      channelName,
      senderId,
      senderName,
      taskDetails // Optional: pre-filled from form
    } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Extract task info if not provided
    let title, description, dueDate, priority;
    
    if (taskDetails) {
      title = taskDetails.title;
      description = taskDetails.description;
      dueDate = taskDetails.dueDate;
      priority = taskDetails.priority;
    } else {
      // Use NLP to extract
      const extracted = nlpService.extractTaskInfo(messageText);
      title = extracted.title;
      description = messageText;
      dueDate = extracted.dueDate;
      priority = extracted.priority || 'medium';
    }
    
    // Create the task
    const task = await taskService.createTask({
      title,
      description: `${description}\n\n---\n📍 Created from Cliq message by @${senderName} in #${channelName}`,
      dueDate,
      priority,
      assignees: [taskerId],
      createdBy: taskerId,
      metadata: {
        source: 'cliq_message',
        messageId,
        channelId,
        originalSender: senderId
      }
    });
    
    // Store message-task link
    await admin.firestore().collection('message_task_links').add({
      taskId: task.id,
      messageId,
      channelId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: taskerId
    });
    
    logger.info('Task created from message', { taskId: task.id, messageId });
    
    return res.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate
      }
    });
    
  } catch (error) {
    logger.error('Create from message error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
};

/**
 * Add message to notes/diary
 */
exports.addNote = async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      messageText,
      messageId,
      channelId,
      channelName,
      senderName,
      timestamp,
      tags
    } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create note/diary entry
    const noteRef = admin.firestore().collection('notes').doc();
    
    await noteRef.set({
      userId: taskerId,
      content: messageText,
      source: 'cliq_message',
      context: {
        channelName,
        senderName,
        messageId,
        channelId,
        originalTimestamp: timestamp
      },
      tags: tags || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null
    });
    
    logger.info('Note created from message', { noteId: noteRef.id, userId: taskerId });
    
    return res.json({
      success: true,
      note: {
        id: noteRef.id
      }
    });
    
  } catch (error) {
    logger.error('Add note error:', error);
    return res.status(500).json({ error: 'Failed to add note' });
  }
};

/**
 * Set reminder for message
 */
exports.setReminder = async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      messageText,
      messageId,
      channelId,
      channelName,
      remindAt // ISO timestamp
    } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create reminder
    const reminderRef = admin.firestore().collection('reminders').doc();
    
    await reminderRef.set({
      userId: taskerId,
      type: 'message_reminder',
      content: messageText.substring(0, 200),
      context: {
        messageId,
        channelId,
        channelName,
        fullMessage: messageText
      },
      remindAt: admin.firestore.Timestamp.fromDate(new Date(remindAt)),
      sent: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info('Reminder created', { reminderId: reminderRef.id, userId: taskerId });
    
    return res.json({
      success: true,
      reminder: {
        id: reminderRef.id,
        remindAt
      }
    });
    
  } catch (error) {
    logger.error('Set reminder error:', error);
    return res.status(500).json({ error: 'Failed to set reminder' });
  }
};

/**
 * Link message to existing task
 */
exports.linkMessage = async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      messageText,
      messageId,
      channelId,
      channelName,
      senderName,
      taskId
    } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify task exists
    const task = await taskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Store the link
    const linkRef = admin.firestore().collection('message_task_links').doc();
    
    await linkRef.set({
      taskId,
      messageId,
      channelId,
      messagePreview: messageText.substring(0, 100),
      senderName,
      channelName,
      linkedBy: taskerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Optionally add as comment on task
    const taskRef = admin.firestore().collection('tasks').doc(taskId);
    await taskRef.collection('comments').add({
      type: 'message_link',
      text: `📎 Linked message from #${channelName}:\n"${messageText.substring(0, 200)}"`,
      authorId: taskerId,
      messageId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info('Message linked to task', { taskId, messageId });
    
    return res.json({
      success: true,
      link: {
        id: linkRef.id,
        taskId,
        taskTitle: task.title
      }
    });
    
  } catch (error) {
    logger.error('Link message error:', error);
    return res.status(500).json({ error: 'Failed to link message' });
  }
};

/**
 * Extract task info from message text using NLP
 */
exports.extractTaskInfo = async (req, res) => {
  try {
    const { messageText } = req.query;
    
    const extracted = nlpService.extractTaskInfo(messageText);
    
    return res.json({
      success: true,
      data: extracted
    });
    
  } catch (error) {
    logger.error('Extract task info error:', error);
    return res.status(500).json({ error: 'Failed to extract task info' });
  }
};

/**
 * Search tasks for linking
 */
exports.searchTasks = async (req, res) => {
  try {
    const { userId, userEmail, query, limit = 10 } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's tasks
    const allTasks = await taskService.listTasks({ assignee: taskerId });
    
    // Filter by query
    const queryLower = query.toLowerCase();
    const matches = allTasks.filter(t => 
      t.title.toLowerCase().includes(queryLower) ||
      (t.description && t.description.toLowerCase().includes(queryLower))
    ).slice(0, limit);
    
    return res.json({
      success: true,
      tasks: matches.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority
      }))
    });
    
  } catch (error) {
    logger.error('Search tasks error:', error);
    return res.status(500).json({ error: 'Failed to search tasks' });
  }
};
```

**Acceptance Criteria**:
- [ ] All endpoints working
- [ ] Tasks created correctly
- [ ] Notes saved to Firestore
- [ ] Reminders queued properly
- [ ] Links stored correctly

**Files to Create**:
```
src/
├── controllers/messageActionController.js
└── routes/messageActionRoutes.js
```

---

### 5.3 Create Task from Message
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Implement full flow for creating tasks from messages

**Steps**:
- [ ] Create message action handler for `create_task`
- [ ] Extract message details
- [ ] Show pre-filled task form
- [ ] Handle form submission
- [ ] Create task via backend
- [ ] Show confirmation message
- [ ] Link back to original message

**Code Template** - `message-action-handler.dg`:
```deluge
// Message Action Handler - Create Task
// Triggered when user right-clicks and selects "Create Task"

action = arguments.get("action");

if(action == "create_task")
{
    return handleCreateTask(arguments);
}
else if(action == "add_note")
{
    return handleAddNote(arguments);
}
else if(action == "set_reminder")
{
    return handleSetReminder(arguments);
}
else if(action == "link_task")
{
    return handleLinkTask(arguments);
}

return {"text": "Unknown action"};

// Create Task Handler
handleCreateTask(args)
{
    messageText = args.get("message").get("text");
    messageId = args.get("message").get("id");
    channelId = args.get("chat").get("id");
    channelName = args.get("chat").get("name");
    senderName = args.get("message").get("sender").get("name");
    userId = user.get("id");
    userEmail = user.get("email");
    
    // Extract task info from message
    apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/actions/extract-task-info";
    apiUrl = apiUrl + "?messageText=" + encodeUrl(messageText);
    
    headers = Map();
    headers.put("Content-Type", "application/json");
    headers.put("x-api-key", "YOUR_API_KEY");
    
    extractResponse = invokeurl
    [
        url: apiUrl
        type: GET
        headers: headers
    ];
    
    // Build form with pre-filled data
    form = Map();
    form.put("type", "form");
    form.put("title", "Create Task from Message");
    form.put("name", "create_task_from_message_form");
    form.put("hint", "Creating task from message by " + senderName);
    form.put("button_label", "Create Task");
    
    inputs = List();
    
    // Title - pre-filled from extraction
    titleInput = Map();
    titleInput.put("type", "text");
    titleInput.put("name", "title");
    titleInput.put("label", "Task Title");
    titleInput.put("mandatory", true);
    titleInput.put("max_length", 200);
    
    if(extractResponse.get("success") == true)
    {
        extracted = extractResponse.get("data");
        titleInput.put("value", extracted.get("title"));
    }
    else
    {
        // Use first 100 chars as fallback
        fallbackTitle = messageText.subString(0, min(100, messageText.length()));
        titleInput.put("value", fallbackTitle);
    }
    inputs.add(titleInput);
    
    // Description - full message
    descInput = Map();
    descInput.put("type", "textarea");
    descInput.put("name", "description");
    descInput.put("label", "Description");
    descInput.put("value", messageText);
    inputs.add(descInput);
    
    // Priority
    priorityInput = Map();
    priorityInput.put("type", "select");
    priorityInput.put("name", "priority");
    priorityInput.put("label", "Priority");
    priorityOptions = List();
    
    highOpt = Map();
    highOpt.put("label", "⚡ High");
    highOpt.put("value", "high");
    priorityOptions.add(highOpt);
    
    medOpt = Map();
    medOpt.put("label", "🔵 Medium");
    medOpt.put("value", "medium");
    priorityOptions.add(medOpt);
    
    lowOpt = Map();
    lowOpt.put("label", "🟢 Low");
    lowOpt.put("value", "low");
    priorityOptions.add(lowOpt);
    
    priorityInput.put("options", priorityOptions);
    priorityInput.put("value", "medium");
    inputs.add(priorityInput);
    
    // Due date - pre-filled if extracted
    dueDateInput = Map();
    dueDateInput.put("type", "date");
    dueDateInput.put("name", "dueDate");
    dueDateInput.put("label", "Due Date (Optional)");
    
    if(extractResponse.get("success") == true && extractResponse.get("data").get("dueDate") != null)
    {
        dueDateInput.put("value", extractResponse.get("data").get("dueDate"));
    }
    inputs.add(dueDateInput);
    
    // Project selector
    projectInput = Map();
    projectInput.put("type", "dynamic_select");
    projectInput.put("name", "projectId");
    projectInput.put("label", "Project (Optional)");
    projectInput.put("data_source", "invoke.function");
    projectInput.put("function_name", "getProjectOptions");
    inputs.add(projectInput);
    
    form.put("inputs", inputs);
    
    // Store context for form submission
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "createTaskFromMessageSubmit");
    
    // Pass context
    hiddenContext = Map();
    hiddenContext.put("messageId", messageId);
    hiddenContext.put("channelId", channelId);
    hiddenContext.put("channelName", channelName);
    hiddenContext.put("senderName", senderName);
    form.put("context", hiddenContext);
    
    return form;
}
```

**Code Template** - `createTaskFromMessage-function.dg`:
```deluge
// Form submission handler for create task from message

formData = form.get("values");
context = form.get("context");

userId = user.get("id");
userEmail = user.get("email");

// Prepare API request
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/actions/create-from-message";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

payload = Map();
payload.put("userId", userId);
payload.put("userEmail", userEmail);
payload.put("messageText", formData.get("description"));
payload.put("messageId", context.get("messageId"));
payload.put("channelId", context.get("channelId"));
payload.put("channelName", context.get("channelName"));
payload.put("senderName", context.get("senderName"));

taskDetails = Map();
taskDetails.put("title", formData.get("title"));
taskDetails.put("description", formData.get("description"));
taskDetails.put("priority", formData.get("priority"));

if(formData.containsKey("dueDate") && formData.get("dueDate") != null)
{
    taskDetails.put("dueDate", formData.get("dueDate"));
}

if(formData.containsKey("projectId") && formData.get("projectId") != null)
{
    taskDetails.put("projectId", formData.get("projectId"));
}

payload.put("taskDetails", taskDetails);

// Create task
apiResponse = invokeurl
[
    url: apiUrl
    type: POST
    parameters: payload.toString()
    headers: headers
];

if(apiResponse.get("success") == true)
{
    task = apiResponse.get("task");
    
    response = Map();
    response.put("text", "✅ Task created successfully!\n\n" + 
                         "📋 *" + task.get("title") + "*\n" +
                         "🔗 Task ID: " + task.get("id"));
    
    buttons = List();
    
    viewBtn = Map();
    viewBtn.put("label", "View Task");
    viewBtn.put("type", "invoke.function");
    viewBtn.put("name", "viewTaskDetails");
    viewBtn.put("taskId", task.get("id"));
    buttons.add(viewBtn);
    
    response.put("buttons", buttons);
    
    return response;
}
else
{
    return {"text": "❌ Failed to create task. Please try again."};
}
```

**User Flow**:
```
1. User sees message in channel
2. Right-clicks → "📝 Create Task"
3. Form appears with:
   - Title (extracted from message)
   - Description (full message)
   - Priority dropdown
   - Due date (extracted if mentioned)
   - Project selector
4. User edits/confirms
5. Task created
6. Confirmation with "View Task" button
```

**Acceptance Criteria**:
- [ ] Right-click action appears
- [ ] Form pre-fills correctly
- [ ] Task created successfully
- [ ] Message context saved
- [ ] Confirmation shown

---

### 5.4 Add to Notes/Diary
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Save messages to personal notes/diary

**Steps**:
- [ ] Create add note action handler
- [ ] Show tag selection form
- [ ] Save note to Firestore
- [ ] Sync with Flutter app's diary feature
- [ ] Show confirmation

**Add Note Handler**:
```deluge
handleAddNote(args)
{
    messageText = args.get("message").get("text");
    messageId = args.get("message").get("id");
    channelId = args.get("chat").get("id");
    channelName = args.get("chat").get("name");
    senderName = args.get("message").get("sender").get("name");
    timestamp = args.get("message").get("time");
    
    // Show simple form for tags
    form = Map();
    form.put("type", "form");
    form.put("title", "Add to Notes");
    form.put("name", "add_note_form");
    form.put("hint", "Save this message to your personal notes");
    form.put("button_label", "Save Note");
    
    inputs = List();
    
    // Preview (read-only)
    previewInput = Map();
    previewInput.put("type", "textarea");
    previewInput.put("name", "preview");
    previewInput.put("label", "Message Preview");
    previewInput.put("value", messageText);
    previewInput.put("readonly", true);
    inputs.add(previewInput);
    
    // Tags
    tagsInput = Map();
    tagsInput.put("type", "text");
    tagsInput.put("name", "tags");
    tagsInput.put("label", "Tags (comma separated)");
    tagsInput.put("placeholder", "work, important, follow-up");
    inputs.add(tagsInput);
    
    // Category
    categoryInput = Map();
    categoryInput.put("type", "select");
    categoryInput.put("name", "category");
    categoryInput.put("label", "Category");
    
    categoryOptions = List();
    categoryOptions.add({"label": "💡 Idea", "value": "idea"});
    categoryOptions.add({"label": "📝 Note", "value": "note"});
    categoryOptions.add({"label": "📌 Important", "value": "important"});
    categoryOptions.add({"label": "🔖 Reference", "value": "reference"});
    categoryInput.put("options", categoryOptions);
    categoryInput.put("value", "note");
    inputs.add(categoryInput);
    
    form.put("inputs", inputs);
    
    // Context
    context = Map();
    context.put("messageText", messageText);
    context.put("messageId", messageId);
    context.put("channelId", channelId);
    context.put("channelName", channelName);
    context.put("senderName", senderName);
    context.put("timestamp", timestamp);
    form.put("context", context);
    
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "addNoteSubmit");
    
    return form;
}
```

**Note Format in Firestore**:
```javascript
{
  userId: 'user123',
  content: 'Message text here...',
  source: 'cliq_message',
  category: 'important',
  tags: ['work', 'follow-up'],
  context: {
    channelName: '#marketing',
    senderName: 'John',
    messageId: 'msg123',
    originalTimestamp: '2024-11-26T10:30:00Z'
  },
  createdAt: Timestamp,
  updatedAt: null
}
```

**Acceptance Criteria**:
- [ ] Note saved to Firestore
- [ ] Tags applied correctly
- [ ] Context preserved
- [ ] Syncs with Flutter diary
- [ ] Confirmation shown

---

### 5.5 Set Reminder from Message
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Set reminders to revisit messages later

**Steps**:
- [ ] Create reminder action handler
- [ ] Show time picker form
- [ ] Save reminder to Firestore
- [ ] Integrate with reminder scheduler
- [ ] Send reminder at scheduled time
- [ ] Include link back to message

**Set Reminder Handler**:
```deluge
handleSetReminder(args)
{
    messageText = args.get("message").get("text");
    messageId = args.get("message").get("id");
    channelId = args.get("chat").get("id");
    channelName = args.get("chat").get("name");
    
    // Show time picker form
    form = Map();
    form.put("type", "form");
    form.put("title", "Set Reminder");
    form.put("name", "set_reminder_form");
    form.put("hint", "I'll remind you about this message");
    form.put("button_label", "Set Reminder");
    
    inputs = List();
    
    // Message preview
    previewInput = Map();
    previewInput.put("type", "text");
    previewInput.put("name", "preview");
    previewInput.put("label", "Remind about");
    previewValue = messageText.subString(0, min(100, messageText.length()));
    if(messageText.length() > 100)
    {
        previewValue = previewValue + "...";
    }
    previewInput.put("value", previewValue);
    previewInput.put("readonly", true);
    inputs.add(previewInput);
    
    // Quick options
    quickInput = Map();
    quickInput.put("type", "select");
    quickInput.put("name", "quickOption");
    quickInput.put("label", "Remind me");
    
    quickOptions = List();
    quickOptions.add({"label": "⏰ In 30 minutes", "value": "30m"});
    quickOptions.add({"label": "⏰ In 1 hour", "value": "1h"});
    quickOptions.add({"label": "⏰ In 3 hours", "value": "3h"});
    quickOptions.add({"label": "📅 Tomorrow 9 AM", "value": "tomorrow"});
    quickOptions.add({"label": "📅 Next Monday 9 AM", "value": "next_monday"});
    quickOptions.add({"label": "🎯 Custom time...", "value": "custom"});
    quickInput.put("options", quickOptions);
    quickInput.put("value", "1h");
    inputs.add(quickInput);
    
    // Custom date/time (shown when custom selected)
    customDateInput = Map();
    customDateInput.put("type", "datetime");
    customDateInput.put("name", "customDateTime");
    customDateInput.put("label", "Custom Date & Time");
    customDateInput.put("mandatory", false);
    inputs.add(customDateInput);
    
    form.put("inputs", inputs);
    
    // Context
    context = Map();
    context.put("messageText", messageText);
    context.put("messageId", messageId);
    context.put("channelId", channelId);
    context.put("channelName", channelName);
    form.put("context", context);
    
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "setReminderSubmit");
    
    return form;
}
```

**Reminder Message Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ Reminder                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You asked me to remind you about this message:             │
│                                                             │
│  📝 "Can someone review the mockups by Friday?"             │
│                                                             │
│  📍 From #marketing by @john                                │
│  🕐 Originally posted: Nov 25, 2:30 PM                      │
│                                                             │
│  [Go to Message]  [⏰ Snooze 1h]  [✓ Done]                  │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Reminder saved correctly
- [ ] Quick options calculate right time
- [ ] Custom time works
- [ ] Reminder sent at correct time
- [ ] Link back to message works

---

### 5.6 Link to Existing Task
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Link messages to existing tasks for reference

**Steps**:
- [ ] Create link task action handler
- [ ] Show task search/picker
- [ ] Create link in Firestore
- [ ] Add as comment on task
- [ ] Show confirmation with task link

**Link Task Handler**:
```deluge
handleLinkTask(args)
{
    messageText = args.get("message").get("text");
    messageId = args.get("message").get("id");
    channelId = args.get("chat").get("id");
    channelName = args.get("chat").get("name");
    senderName = args.get("message").get("sender").get("name");
    userId = user.get("id");
    userEmail = user.get("email");
    
    // Show task search form
    form = Map();
    form.put("type", "form");
    form.put("title", "Link to Task");
    form.put("name", "link_task_form");
    form.put("hint", "Select a task to link this message to");
    form.put("button_label", "Link Message");
    
    inputs = List();
    
    // Message preview
    previewInput = Map();
    previewInput.put("type", "text");
    previewInput.put("name", "preview");
    previewInput.put("label", "Message to link");
    previewValue = messageText.subString(0, min(100, messageText.length()));
    if(messageText.length() > 100)
    {
        previewValue = previewValue + "...";
    }
    previewInput.put("value", previewValue);
    previewInput.put("readonly", true);
    inputs.add(previewInput);
    
    // Task search
    taskInput = Map();
    taskInput.put("type", "dynamic_select");
    taskInput.put("name", "taskId");
    taskInput.put("label", "Search for a task");
    taskInput.put("mandatory", true);
    taskInput.put("placeholder", "Type to search your tasks...");
    taskInput.put("data_source", "invoke.function");
    taskInput.put("function_name", "searchTasksForLinking");
    inputs.add(taskInput);
    
    // Add as comment option
    commentInput = Map();
    commentInput.put("type", "checkbox");
    commentInput.put("name", "addAsComment");
    commentInput.put("label", "Also add as comment on task");
    commentInput.put("value", true);
    inputs.add(commentInput);
    
    form.put("inputs", inputs);
    
    // Context
    context = Map();
    context.put("messageText", messageText);
    context.put("messageId", messageId);
    context.put("channelId", channelId);
    context.put("channelName", channelName);
    context.put("senderName", senderName);
    form.put("context", context);
    
    form.put("action", Map());
    form.get("action").put("type", "invoke.function");
    form.get("action").put("name", "linkTaskSubmit");
    
    return form;
}
```

**Confirmation Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Message linked to task                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 Task: Homepage Redesign                                 │
│  📎 Message linked as reference                             │
│  💬 Comment added to task                                   │
│                                                             │
│  [View Task]                                                │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Task search works
- [ ] Link created in Firestore
- [ ] Comment added (optional)
- [ ] Confirmation shows task
- [ ] Can navigate to task

---

### 5.7 NLP Text Extraction
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Intelligently extract task details from message text

**Steps**:
- [ ] Create/update NLP service
- [ ] Extract potential task title
- [ ] Detect due dates ("by Friday", "tomorrow")
- [ ] Detect priority indicators ("urgent", "ASAP")
- [ ] Detect assignees ("@someone should")
- [ ] Test with various message formats

**NLP Service Extension**:
```javascript
// nlpService.js

class NLPService {
  
  /**
   * Extract task information from message text
   */
  extractTaskInfo(text) {
    return {
      title: this.extractTitle(text),
      dueDate: this.extractDueDate(text),
      priority: this.extractPriority(text),
      assignee: this.extractAssignee(text)
    };
  }
  
  /**
   * Extract a suitable task title
   */
  extractTitle(text) {
    // Remove mentions
    let cleaned = text.replace(/@\w+/g, '').trim();
    
    // Remove common phrases
    const removePatterns = [
      /can (someone|anybody|anyone)/i,
      /please/i,
      /we need to/i,
      /someone needs to/i,
      /don't forget to/i,
      /remember to/i
    ];
    
    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
    
    // Take first sentence or first 100 chars
    const firstSentence = cleaned.split(/[.!?]/)[0].trim();
    
    if (firstSentence.length > 100) {
      return firstSentence.substring(0, 97) + '...';
    }
    
    return firstSentence || text.substring(0, 100);
  }
  
  /**
   * Extract due date from text
   */
  extractDueDate(text) {
    const now = new Date();
    
    // Pattern: by [day]
    const dayPatterns = {
      'today': 0,
      'tonight': 0,
      'tomorrow': 1,
      'monday': this.getNextWeekday(1),
      'tuesday': this.getNextWeekday(2),
      'wednesday': this.getNextWeekday(3),
      'thursday': this.getNextWeekday(4),
      'friday': this.getNextWeekday(5),
      'saturday': this.getNextWeekday(6),
      'sunday': this.getNextWeekday(0),
      'next week': 7,
      'end of week': this.getNextWeekday(5),
      'eow': this.getNextWeekday(5),
      'eod': 0,
      'end of day': 0
    };
    
    const textLower = text.toLowerCase();
    
    for (const [phrase, daysAhead] of Object.entries(dayPatterns)) {
      if (textLower.includes(phrase) || 
          textLower.includes(`by ${phrase}`) ||
          textLower.includes(`before ${phrase}`)) {
        const date = new Date(now);
        date.setDate(date.getDate() + daysAhead);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    
    // Pattern: in X days/hours
    const inPattern = /in (\d+) (day|hour|week)s?/i;
    const inMatch = text.match(inPattern);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      const date = new Date(now);
      
      switch(unit) {
        case 'hour':
          date.setHours(date.getHours() + amount);
          break;
        case 'day':
          date.setDate(date.getDate() + amount);
          break;
        case 'week':
          date.setDate(date.getDate() + (amount * 7));
          break;
      }
      
      return date.toISOString().split('T')[0];
    }
    
    // Pattern: explicit date (Nov 28, 11/28, etc.)
    // ... more patterns
    
    return null;
  }
  
  /**
   * Extract priority from text
   */
  extractPriority(text) {
    const textLower = text.toLowerCase();
    
    const highIndicators = [
      'urgent', 'asap', 'immediately', 'critical', 
      'high priority', 'important', 'crucial', 'emergency'
    ];
    
    const lowIndicators = [
      'when you get a chance', 'no rush', 'low priority',
      'whenever', 'not urgent', 'eventually'
    ];
    
    for (const indicator of highIndicators) {
      if (textLower.includes(indicator)) return 'high';
    }
    
    for (const indicator of lowIndicators) {
      if (textLower.includes(indicator)) return 'low';
    }
    
    return 'medium';
  }
  
  /**
   * Extract assignee mention
   */
  extractAssignee(text) {
    const mentionPattern = /@(\w+)/g;
    const matches = text.match(mentionPattern);
    
    if (matches && matches.length > 0) {
      // Return first mention (excluding bot mentions)
      for (const match of matches) {
        const username = match.substring(1);
        if (username.toLowerCase() !== 'taskerbot') {
          return username;
        }
      }
    }
    
    return null;
  }
  
  // Helper: get days until next weekday
  getNextWeekday(targetDay) {
    const now = new Date();
    const currentDay = now.getDay();
    let daysAhead = targetDay - currentDay;
    
    if (daysAhead <= 0) {
      daysAhead += 7;
    }
    
    return daysAhead;
  }
}

module.exports = new NLPService();
```

**Test Cases**:
| Message | Extracted Title | Due Date | Priority |
|---------|-----------------|----------|----------|
| "Can someone review the mockups by Friday?" | "review the mockups" | Friday | medium |
| "URGENT: Fix login bug ASAP" | "Fix login bug" | null | high |
| "@john please update the docs tomorrow" | "update the docs" | tomorrow | medium |
| "We need to finish the report by end of week" | "finish the report" | Friday | medium |
| "No rush, but update the README when you get a chance" | "update the README" | null | low |

**Acceptance Criteria**:
- [ ] Title extraction removes fluff
- [ ] Date patterns detected
- [ ] Priority detected from keywords
- [ ] Assignee mentions extracted
- [ ] Graceful fallback for edge cases

---

### 5.8 Testing & Refinement
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Test all message actions end-to-end

**Steps**:
- [ ] Test create task action
- [ ] Test add note action
- [ ] Test set reminder action
- [ ] Test link task action
- [ ] Test NLP extraction
- [ ] Test error handling
- [ ] Gather user feedback
- [ ] Refine based on feedback

**Test Cases**:
| Action | Test | Expected | Status |
|--------|------|----------|--------|
| Create Task | Right-click → Create Task | Form appears | ⬜ |
| Create Task | Submit form | Task created | ⬜ |
| Create Task | Missing title | Error shown | ⬜ |
| Add Note | Right-click → Add Note | Form appears | ⬜ |
| Add Note | Submit with tags | Note saved | ⬜ |
| Set Reminder | Select "1 hour" | Reminder in 1h | ⬜ |
| Set Reminder | Custom time | Reminder at time | ⬜ |
| Link Task | Search for task | Results shown | ⬜ |
| Link Task | Select and link | Link created | ⬜ |
| NLP | "ASAP" message | High priority | ⬜ |
| NLP | "by Friday" message | Due Friday | ⬜ |

**Acceptance Criteria**:
- [ ] All actions work end-to-end
- [ ] Error handling graceful
- [ ] NLP accuracy acceptable
- [ ] Performance acceptable
- [ ] Documentation complete

---

## 🔗 Dependencies

- **Requires**: Backend API running
- **Requires**: User mapping working
- **Requires**: NLP service (Feature 1)
- **Syncs with**: Flutter app's diary feature
- **Used by**: TaskerBot (contextual suggestions)

---

## 📚 Resources

- [Zoho Cliq Message Actions](https://www.zoho.com/cliq/help/developer-guide/message-actions.html)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [░░░░░░░░░░] 0%

5.1 Action Setup    [░░░░░░░░░░] 0%
5.2 Backend         [░░░░░░░░░░] 0%
5.3 Create Task     [░░░░░░░░░░] 0%
5.4 Add Notes       [░░░░░░░░░░] 0%
5.5 Set Reminder    [░░░░░░░░░░] 0%
5.6 Link Task       [░░░░░░░░░░] 0%
5.7 NLP Extraction  [░░░░░░░░░░] 0%
5.8 Testing         [░░░░░░░░░░] 0%
```

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: Planning*
