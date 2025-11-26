# 📢 Feature 6: Project Channels Integration

> **Goal**: Create dedicated Cliq channels for projects with automated activity feeds and team collaboration.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 6.1 | Channel Integration Setup | 🔴 High | ⬜ TODO | 2h |
| 6.2 | Backend Channel Endpoints | 🔴 High | ⬜ TODO | 4h |
| 6.3 | Channel Creation/Linking | 🔴 High | ⬜ TODO | 3h |
| 6.4 | Activity Feed Implementation | 🟡 Medium | ⬜ TODO | 4h |
| 6.5 | Channel-Specific Commands | 🟡 Medium | ⬜ TODO | 4h |
| 6.6 | Member Sync | 🟡 Medium | ⬜ TODO | 3h |
| 6.7 | Standup Feature | 🟢 Low | ⬜ TODO | 4h |
| 6.8 | Testing & Polish | 🔴 High | ⬜ TODO | 3h |

**Total Estimated: ~27 hours (5-6 days)**

---

## 📝 Task Details

### 6.1 Channel Integration Setup
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Set up the foundation for project-channel integration

**Steps**:
- [ ] Design Firestore schema for channel links
- [ ] Plan channel naming convention
- [ ] Define channel integration permissions
- [ ] Create handler file structure
- [ ] Set up channel event listeners

**Firestore Schema** - `project_channels`:
```javascript
{
  projectId: 'project123',
  projectName: 'Marketing Campaign',
  channelId: 'channel456',
  channelName: 'tasker-marketing-campaign',
  linkedBy: 'user123',
  linkedAt: Timestamp,
  settings: {
    postTaskCreated: true,
    postTaskCompleted: true,
    postTaskAssigned: true,
    postComments: false,
    postDailySummary: true,
    mentionOnAssign: true
  },
  memberMapping: {
    'taskerId1': 'cliqUserId1',
    'taskerId2': 'cliqUserId2'
  }
}
```

**Channel Naming Convention**:
- Format: `tasker-{project-name-slug}`
- Example: `tasker-marketing-campaign`
- Max length: 50 characters
- Lowercase, hyphens only

**Acceptance Criteria**:
- [ ] Schema defined
- [ ] Handler files created
- [ ] Integration plan documented

**Files to Create**:
```
cliq-scripts/channel-integration/
├── project-channel-handler.dg
├── activity-feed-handler.dg
├── channel-commands.dg
└── README.md
```

---

### 6.2 Backend Channel Endpoints
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Create backend endpoints for channel management

**Steps**:
- [ ] Create `src/controllers/channelController.js`
- [ ] Implement `POST /api/cliq/channels/create`
- [ ] Implement `POST /api/cliq/channels/link`
- [ ] Implement `POST /api/cliq/channels/unlink`
- [ ] Implement `POST /api/cliq/channels/activity`
- [ ] Implement `GET /api/cliq/channels/{projectId}/tasks`
- [ ] Implement `GET /api/cliq/channels/{projectId}/summary`
- [ ] Implement `PUT /api/cliq/channels/{projectId}/settings`
- [ ] Add routes

**Code Template** - `channelController.js`:
```javascript
const logger = require('../config/logger');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');
const { admin } = require('../config/firebase');

/**
 * Create a new Cliq channel for a project
 */
exports.createChannel = async (req, res) => {
  try {
    const { userId, userEmail, projectId, channelName } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get project details
    const projectDoc = await admin.firestore()
      .collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectDoc.data();
    
    // Generate channel name if not provided
    const finalChannelName = channelName || generateChannelName(project.name);
    
    // Check if already linked
    const existingLink = await admin.firestore()
      .collection('project_channels')
      .where('projectId', '==', projectId)
      .limit(1)
      .get();
    
    if (!existingLink.empty) {
      return res.status(400).json({ 
        error: 'Project already has a linked channel',
        channelId: existingLink.docs[0].data().channelId
      });
    }
    
    // Return channel creation details
    // Note: Actual channel creation happens in Cliq
    return res.json({
      success: true,
      data: {
        suggestedName: finalChannelName,
        projectId,
        projectName: project.name,
        memberCount: project.memberIds?.length || 1
      }
    });
    
  } catch (error) {
    logger.error('Create channel error:', error);
    return res.status(500).json({ error: 'Failed to create channel' });
  }
};

/**
 * Link existing Cliq channel to a project
 */
exports.linkChannel = async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      projectId, 
      channelId, 
      channelName,
      settings 
    } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify project exists and user has access
    const projectDoc = await admin.firestore()
      .collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectDoc.data();
    
    // Check user is project admin/owner
    if (!project.memberIds?.includes(taskerId)) {
      return res.status(403).json({ error: 'Not a project member' });
    }
    
    // Create the link
    const linkRef = admin.firestore().collection('project_channels').doc(projectId);
    
    await linkRef.set({
      projectId,
      projectName: project.name,
      channelId,
      channelName,
      linkedBy: taskerId,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      settings: settings || {
        postTaskCreated: true,
        postTaskCompleted: true,
        postTaskAssigned: true,
        postComments: false,
        postDailySummary: true,
        mentionOnAssign: true
      }
    });
    
    logger.info('Channel linked to project', { projectId, channelId });
    
    // Post welcome message to channel
    await postToChannel(channelId, {
      text: `🎉 *Channel linked to Tasker!*\n\n` +
            `This channel is now connected to the "${project.name}" project.\n\n` +
            `📋 I'll post updates when tasks are created, completed, or assigned.\n` +
            `💬 Use \`/tasks\` to see all tasks in this project.`
    });
    
    return res.json({
      success: true,
      link: {
        projectId,
        channelId,
        channelName
      }
    });
    
  } catch (error) {
    logger.error('Link channel error:', error);
    return res.status(500).json({ error: 'Failed to link channel' });
  }
};

/**
 * Unlink channel from project
 */
exports.unlinkChannel = async (req, res) => {
  try {
    const { userId, userEmail, projectId } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete the link
    await admin.firestore()
      .collection('project_channels').doc(projectId).delete();
    
    logger.info('Channel unlinked from project', { projectId });
    
    return res.json({ success: true });
    
  } catch (error) {
    logger.error('Unlink channel error:', error);
    return res.status(500).json({ error: 'Failed to unlink channel' });
  }
};

/**
 * Post activity to project channel
 */
exports.postActivity = async (req, res) => {
  try {
    const { projectId, activityType, data } = req.body;
    
    // Get channel link
    const linkDoc = await admin.firestore()
      .collection('project_channels').doc(projectId).get();
    
    if (!linkDoc.exists) {
      return res.json({ success: false, reason: 'No linked channel' });
    }
    
    const link = linkDoc.data();
    
    // Check if this activity type should be posted
    if (!shouldPostActivity(link.settings, activityType)) {
      return res.json({ success: false, reason: 'Activity type disabled' });
    }
    
    // Format the message
    const message = formatActivityMessage(activityType, data);
    
    // Post to channel
    await postToChannel(link.channelId, message);
    
    return res.json({ success: true });
    
  } catch (error) {
    logger.error('Post activity error:', error);
    return res.status(500).json({ error: 'Failed to post activity' });
  }
};

/**
 * Get tasks for a project channel
 */
exports.getChannelTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 20 } = req.query;
    
    let query = admin.firestore().collection('tasks')
      .where('projectId', '==', projectId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    const tasks = [];
    
    snapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by priority then due date
    tasks.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return (a.dueDate._seconds || 0) - (b.dueDate._seconds || 0);
    });
    
    return res.json({
      success: true,
      tasks,
      total: tasks.length
    });
    
  } catch (error) {
    logger.error('Get channel tasks error:', error);
    return res.status(500).json({ error: 'Failed to get tasks' });
  }
};

/**
 * Get daily summary for a project
 */
exports.getChannelSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get all project tasks
    const snapshot = await admin.firestore().collection('tasks')
      .where('projectId', '==', projectId)
      .get();
    
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    let completedToday = 0;
    
    snapshot.forEach(doc => {
      const task = doc.data();
      
      if (task.status === 'completed') {
        completed++;
        
        // Check if completed today
        if (task.updatedAt) {
          const updated = task.updatedAt._seconds 
            ? new Date(task.updatedAt._seconds * 1000) 
            : new Date(task.updatedAt);
          if (updated >= today) {
            completedToday++;
          }
        }
      } else {
        if (task.dueDate) {
          const due = task.dueDate._seconds 
            ? new Date(task.dueDate._seconds * 1000) 
            : new Date(task.dueDate);
          if (due < today) {
            overdue++;
          }
        }
        
        if (task.status === 'in_progress') {
          inProgress++;
        } else {
          pending++;
        }
      }
    });
    
    return res.json({
      success: true,
      summary: {
        completed,
        inProgress,
        pending,
        overdue,
        completedToday,
        total: snapshot.size
      }
    });
    
  } catch (error) {
    logger.error('Get channel summary error:', error);
    return res.status(500).json({ error: 'Failed to get summary' });
  }
};

/**
 * Update channel settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { settings } = req.body;
    
    await admin.firestore()
      .collection('project_channels').doc(projectId)
      .update({ settings });
    
    return res.json({ success: true });
    
  } catch (error) {
    logger.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Helper functions

function generateChannelName(projectName) {
  return 'tasker-' + projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);
}

function shouldPostActivity(settings, activityType) {
  const mapping = {
    'task_created': 'postTaskCreated',
    'task_completed': 'postTaskCompleted',
    'task_assigned': 'postTaskAssigned',
    'comment_added': 'postComments'
  };
  
  const settingKey = mapping[activityType];
  return settingKey ? settings[settingKey] !== false : true;
}

function formatActivityMessage(type, data) {
  switch(type) {
    case 'task_created':
      return {
        text: `📝 *New task created*\n\n` +
              `"${data.task.title}"\n` +
              `👤 Created by @${data.createdBy}\n` +
              `📅 Due: ${formatDate(data.task.dueDate) || 'Not set'}`
      };
      
    case 'task_completed':
      return {
        text: `✅ *Task completed*\n\n` +
              `"${data.task.title}"\n` +
              `👤 Completed by @${data.completedBy}`
      };
      
    case 'task_assigned':
      return {
        text: `📋 *Task assigned*\n\n` +
              `"${data.task.title}"\n` +
              `👤 Assigned to @${data.assignee} by @${data.assignedBy}`
      };
      
    default:
      return { text: `Activity: ${type}` };
  }
}

function formatDate(timestamp) {
  if (!timestamp) return null;
  const date = timestamp._seconds 
    ? new Date(timestamp._seconds * 1000) 
    : new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

async function postToChannel(channelId, message) {
  // Use Cliq webhook or API to post
  // This would be implemented based on Cliq's posting mechanism
  logger.info('Posting to channel', { channelId, message: message.text?.substring(0, 50) });
}
```

**Acceptance Criteria**:
- [ ] All endpoints working
- [ ] Channel linking works
- [ ] Activity posting works
- [ ] Settings respected
- [ ] Error handling in place

**Files to Create**:
```
src/
├── controllers/channelController.js
└── routes/channelRoutes.js
```

---

### 6.3 Channel Creation/Linking
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Implement the flow for creating and linking project channels

**Steps**:
- [ ] Create link channel command/button
- [ ] Implement channel creation in Cliq
- [ ] Store channel-project link
- [ ] Post welcome message
- [ ] Sync project members to channel

**Link Channel Command** - `/taskerproject link`:
```deluge
// Link channel to project

// Show project selector form
form = Map();
form.put("type", "form");
form.put("title", "Link Channel to Project");
form.put("name", "link_channel_form");
form.put("hint", "Connect this channel to a Tasker project");
form.put("button_label", "Link Channel");

inputs = List();

// Project selector
projectInput = Map();
projectInput.put("type", "dynamic_select");
projectInput.put("name", "projectId");
projectInput.put("label", "Select Project");
projectInput.put("mandatory", true);
projectInput.put("placeholder", "Search for a project...");
projectInput.put("data_source", "invoke.function");
projectInput.put("function_name", "getProjectsForLinking");
inputs.add(projectInput);

// Activity settings
settingsHeader = Map();
settingsHeader.put("type", "text");
settingsHeader.put("name", "settingsHeader");
settingsHeader.put("label", "Activity Feed Settings");
settingsHeader.put("value", "Choose what updates to post in this channel:");
inputs.add(settingsHeader);

// Checkboxes for settings
taskCreatedCheck = Map();
taskCreatedCheck.put("type", "checkbox");
taskCreatedCheck.put("name", "postTaskCreated");
taskCreatedCheck.put("label", "📝 New tasks created");
taskCreatedCheck.put("value", true);
inputs.add(taskCreatedCheck);

taskCompletedCheck = Map();
taskCompletedCheck.put("type", "checkbox");
taskCompletedCheck.put("name", "postTaskCompleted");
taskCompletedCheck.put("label", "✅ Tasks completed");
taskCompletedCheck.put("value", true);
inputs.add(taskCompletedCheck);

taskAssignedCheck = Map();
taskAssignedCheck.put("type", "checkbox");
taskAssignedCheck.put("name", "postTaskAssigned");
taskAssignedCheck.put("label", "📋 Task assignments");
taskAssignedCheck.put("value", true);
inputs.add(taskAssignedCheck);

dailySummaryCheck = Map();
dailySummaryCheck.put("type", "checkbox");
dailySummaryCheck.put("name", "postDailySummary");
dailySummaryCheck.put("label", "📊 Daily summary");
dailySummaryCheck.put("value", true);
inputs.add(dailySummaryCheck);

form.put("inputs", inputs);

// Pass channel context
context = Map();
context.put("channelId", chat.get("id"));
context.put("channelName", chat.get("name"));
form.put("context", context);

form.put("action", Map());
form.get("action").put("type", "invoke.function");
form.get("action").put("name", "linkChannelSubmit");

return form;
```

**Link Channel Submit Handler**:
```deluge
// linkChannelSubmit function

formData = form.get("values");
context = form.get("context");

userId = user.get("id");
userEmail = user.get("email");

// Call backend to create link
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/channels/link";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

payload = Map();
payload.put("userId", userId);
payload.put("userEmail", userEmail);
payload.put("projectId", formData.get("projectId"));
payload.put("channelId", context.get("channelId"));
payload.put("channelName", context.get("channelName"));

settings = Map();
settings.put("postTaskCreated", formData.get("postTaskCreated"));
settings.put("postTaskCompleted", formData.get("postTaskCompleted"));
settings.put("postTaskAssigned", formData.get("postTaskAssigned"));
settings.put("postDailySummary", formData.get("postDailySummary"));
settings.put("mentionOnAssign", true);
payload.put("settings", settings);

apiResponse = invokeurl
[
    url: apiUrl
    type: POST
    parameters: payload.toString()
    headers: headers
];

if(apiResponse.get("success") == true)
{
    return {
        "text": "✅ *Channel linked successfully!*\n\n" +
                "This channel is now connected to the project.\n\n" +
                "📋 Use `/tasks` to see all tasks\n" +
                "📊 Use `/progress` for project summary\n" +
                "🔧 Use `/taskerproject settings` to change notifications"
    };
}
else
{
    return {"text": "❌ Failed to link channel: " + apiResponse.get("error")};
}
```

**Acceptance Criteria**:
- [ ] Link command works
- [ ] Settings saved correctly
- [ ] Welcome message posted
- [ ] Link stored in Firestore

---

### 6.4 Activity Feed Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Automatically post project activity to linked channels

**Steps**:
- [ ] Integrate with notification system (Feature 3)
- [ ] Filter activities by channel settings
- [ ] Format activity messages nicely
- [ ] Add action buttons where appropriate
- [ ] Implement daily summary post

**Activity Message Formats**:

#### Task Created
```
┌─────────────────────────────────────────────────────────────┐
│  📝 New Task Created                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Design new landing page"                                  │
│                                                             │
│  👤 Created by @mantra                                      │
│  📅 Due: Nov 30                                             │
│  ⚡ Priority: High                                          │
│                                                             │
│  [View Task]  [Assign to Me]                                │
└─────────────────────────────────────────────────────────────┘
```

#### Task Completed
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Task Completed                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Design new landing page"                                  │
│                                                             │
│  👤 Completed by @priya                                     │
│  ⏱️ Time taken: 3 days                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Task Assigned
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Task Assigned                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  @priya has been assigned "Design new landing page"         │
│                                                             │
│  Assigned by @mantra                                        │
│                                                             │
│  [View Task]                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Daily Summary (Posted at end of day)
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Daily Summary - Nov 26                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Completed today: 3                                      │
│  📝 Created today: 2                                        │
│  📋 In progress: 5                                          │
│  🔥 Overdue: 1                                              │
│                                                             │
│  Team productivity: 🟢 On track!                            │
│                                                             │
│  [View All Tasks]  [View Progress]                          │
└─────────────────────────────────────────────────────────────┘
```

**Cloud Function Trigger** (add to Feature 3):
```javascript
// In taskTriggers.js - add channel notification

exports.onTaskCreated = async (snapshot, context) => {
  const task = snapshot.data();
  const taskId = context.params.taskId;
  
  // ... existing notification logic ...
  
  // Post to project channel
  if (task.projectId) {
    await postActivityToChannel(task.projectId, 'task_created', {
      task: { id: taskId, ...task },
      createdBy: await getUserName(task.createdBy)
    });
  }
};

async function postActivityToChannel(projectId, activityType, data) {
  try {
    const response = await axios.post(
      'https://tasker-backend-b10p.onrender.com/api/cliq/channels/activity',
      { projectId, activityType, data },
      { headers: { 'x-api-key': API_KEY } }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to post to channel:', error);
  }
}
```

**Acceptance Criteria**:
- [ ] Task created posts to channel
- [ ] Task completed posts to channel
- [ ] Assignments post with mention
- [ ] Daily summary posts
- [ ] Settings filter respected

---

### 6.5 Channel-Specific Commands
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Implement commands that work in project channels

**Steps**:
- [ ] Create `/tasks` command for channel
- [ ] Create `/mytasks` command for channel
- [ ] Create `/progress` command for channel
- [ ] Create `/blockers` command for channel
- [ ] Add project context detection

**Channel Commands**:

| Command | Description | Output |
|---------|-------------|--------|
| `/tasks` | All tasks in this project | Task list |
| `/mytasks` | Your tasks in this project | Filtered task list |
| `/progress` | Project progress overview | Stats + progress bar |
| `/blockers` | Tasks marked as blocked | Blocked task list |
| `/assign @user task` | Quick assign a task | Assignment confirmation |

**Code Template** - `channel-commands.dg`:
```deluge
// Channel-specific commands

command = arguments.get("command");

// Get channel's linked project
channelId = chat.get("id");
projectId = getLinkedProject(channelId);

if(projectId == null)
{
    return {
        "text": "⚠️ This channel is not linked to a Tasker project.\n\n" +
                "Use `/taskerproject link` to connect a project."
    };
}

if(command == "/tasks")
{
    return handleTasksCommand(projectId);
}
else if(command == "/mytasks")
{
    return handleMyTasksCommand(projectId, user.get("id"), user.get("email"));
}
else if(command == "/progress")
{
    return handleProgressCommand(projectId);
}
else if(command == "/blockers")
{
    return handleBlockersCommand(projectId);
}

return {"text": "Unknown command"};

// Get all tasks in project
handleTasksCommand(projectId)
{
    apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/channels/" + projectId + "/tasks";
    headers = Map();
    headers.put("x-api-key", "YOUR_API_KEY");
    
    apiResponse = invokeurl
    [
        url: apiUrl
        type: GET
        headers: headers
    ];
    
    if(apiResponse.get("success") != true)
    {
        return {"text": "❌ Failed to get tasks"};
    }
    
    tasks = apiResponse.get("tasks");
    
    if(tasks.size() == 0)
    {
        return {"text": "📭 No tasks in this project yet.\n\nUse `/taskertask create` to add one!"};
    }
    
    messageText = "📋 *Tasks in this project* (" + tasks.size() + ")\n\n";
    
    // Group by status
    pending = List();
    inProgress = List();
    completed = List();
    
    for each task in tasks
    {
        if(task.get("status") == "completed")
        {
            completed.add(task);
        }
        else if(task.get("status") == "in_progress")
        {
            inProgress.add(task);
        }
        else
        {
            pending.add(task);
        }
    }
    
    if(inProgress.size() > 0)
    {
        messageText = messageText + "🔄 *In Progress* (" + inProgress.size() + ")\n";
        for each task in inProgress
        {
            icon = getPriorityIcon(task.get("priority"));
            messageText = messageText + icon + " " + task.get("title") + "\n";
        }
        messageText = messageText + "\n";
    }
    
    if(pending.size() > 0)
    {
        messageText = messageText + "📋 *Pending* (" + pending.size() + ")\n";
        count = 0;
        for each task in pending
        {
            if(count >= 5)
            {
                messageText = messageText + "... and " + (pending.size() - 5) + " more\n";
                break;
            }
            icon = getPriorityIcon(task.get("priority"));
            messageText = messageText + icon + " " + task.get("title") + "\n";
            count = count + 1;
        }
        messageText = messageText + "\n";
    }
    
    if(completed.size() > 0)
    {
        messageText = messageText + "✅ *Completed* (" + completed.size() + ")\n";
    }
    
    response = Map();
    response.put("text", messageText);
    
    buttons = List();
    viewAllBtn = Map();
    viewAllBtn.put("label", "View All in App");
    viewAllBtn.put("type", "invoke.function");
    viewAllBtn.put("name", "openProjectInApp");
    viewAllBtn.put("projectId", projectId);
    buttons.add(viewAllBtn);
    
    createBtn = Map();
    createBtn.put("label", "+ New Task");
    createBtn.put("type", "invoke.function");
    createBtn.put("name", "createTaskInProject");
    createBtn.put("projectId", projectId);
    buttons.add(createBtn);
    
    response.put("buttons", buttons);
    
    return response;
}

// Get project progress
handleProgressCommand(projectId)
{
    apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/channels/" + projectId + "/summary";
    headers = Map();
    headers.put("x-api-key", "YOUR_API_KEY");
    
    apiResponse = invokeurl
    [
        url: apiUrl
        type: GET
        headers: headers
    ];
    
    if(apiResponse.get("success") != true)
    {
        return {"text": "❌ Failed to get progress"};
    }
    
    summary = apiResponse.get("summary");
    total = summary.get("total");
    completed = summary.get("completed");
    
    // Calculate percentage
    percentage = 0;
    if(total > 0)
    {
        percentage = (completed * 100) / total;
    }
    
    // Build progress bar
    filledBlocks = percentage / 10;
    progressBar = "";
    for i = 1 to 10
    {
        if(i <= filledBlocks)
        {
            progressBar = progressBar + "█";
        }
        else
        {
            progressBar = progressBar + "░";
        }
    }
    
    messageText = "📊 *Project Progress*\n\n";
    messageText = messageText + progressBar + " " + percentage + "%\n\n";
    messageText = messageText + "✅ Completed: " + completed + "\n";
    messageText = messageText + "🔄 In Progress: " + summary.get("inProgress") + "\n";
    messageText = messageText + "📋 Pending: " + summary.get("pending") + "\n";
    
    if(summary.get("overdue") > 0)
    {
        messageText = messageText + "🔥 Overdue: " + summary.get("overdue") + "\n";
    }
    
    messageText = messageText + "\n📈 Completed today: " + summary.get("completedToday");
    
    return {"text": messageText};
}

// Helper to get linked project for channel
getLinkedProject(channelId)
{
    // This would query Firestore or cache
    // For now, return from stored mapping
    // Implementation depends on how data is accessed from Deluge
    return null; // Placeholder
}
```

**Progress Output Example**:
```
📊 *Project Progress*

██████████░░░░░░░░░░ 45%

✅ Completed: 9
🔄 In Progress: 3
📋 Pending: 8
🔥 Overdue: 1

📈 Completed today: 2
```

**Acceptance Criteria**:
- [ ] /tasks lists project tasks
- [ ] /mytasks filters to user
- [ ] /progress shows stats
- [ ] /blockers lists blocked tasks
- [ ] Commands detect project context

---

### 6.6 Member Sync
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Keep project members and channel members in sync

**Steps**:
- [ ] Auto-invite project members to channel
- [ ] Handle new member additions
- [ ] Handle member removals
- [ ] Map Tasker users to Cliq users
- [ ] Sync user display names

**Member Sync Flow**:
```
Project Member Added in Tasker App
           │
           ▼
Firebase Trigger fires
           │
           ▼
Check if project has linked channel
           │
           ▼
Get Cliq user ID from mapping
           │
           ▼
Invite user to Cliq channel
           │
           ▼
Post welcome message in channel
```

**Cloud Function** - Member Added:
```javascript
exports.onProjectMemberAdded = functions.firestore
  .document('projects/{projectId}/members/{memberId}')
  .onCreate(async (snapshot, context) => {
    const { projectId, memberId } = context.params;
    const member = snapshot.data();
    
    // Check if project has linked channel
    const channelDoc = await admin.firestore()
      .collection('project_channels')
      .doc(projectId)
      .get();
    
    if (!channelDoc.exists) return;
    
    const channel = channelDoc.data();
    
    // Get Cliq user ID
    const mapping = await admin.firestore()
      .collection('cliq_user_mappings')
      .where('tasker_user_id', '==', memberId)
      .limit(1)
      .get();
    
    if (mapping.empty) {
      console.log('No Cliq mapping for user', memberId);
      return;
    }
    
    const cliqUserId = mapping.docs[0].data().cliq_user_id;
    
    // Invite to channel (via Cliq API)
    await inviteToChannel(channel.channelId, cliqUserId);
    
    // Post welcome message
    await postToChannel(channel.channelId, {
      text: `👋 Welcome @${member.displayName} to the project!`
    });
  });
```

**Acceptance Criteria**:
- [ ] New members auto-invited
- [ ] Welcome message posted
- [ ] Removed members handled
- [ ] User mapping works

---

### 6.7 Standup Feature
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Async standup feature for project channels

**Steps**:
- [ ] Create `/standup` command
- [ ] Show standup form (done, doing, blockers)
- [ ] Store standup responses
- [ ] Aggregate team standups
- [ ] Post summary to channel
- [ ] Schedule daily standup reminder

**Standup Command** - `/standup`:
```deluge
// Start standup for user

form = Map();
form.put("type", "form");
form.put("title", "Daily Standup");
form.put("name", "standup_form");
form.put("hint", "Share your progress with the team");
form.put("button_label", "Submit Standup");

inputs = List();

// What did you complete?
doneInput = Map();
doneInput.put("type", "textarea");
doneInput.put("name", "done");
doneInput.put("label", "✅ What did you complete?");
doneInput.put("placeholder", "List completed tasks...");
inputs.add(doneInput);

// What are you working on?
doingInput = Map();
doingInput.put("type", "textarea");
doingInput.put("name", "doing");
doingInput.put("label", "🔄 What are you working on?");
doingInput.put("placeholder", "Current tasks...");
inputs.add(doingInput);

// Any blockers?
blockersInput = Map();
blockersInput.put("type", "textarea");
blockersInput.put("name", "blockers");
blockersInput.put("label", "🚧 Any blockers?");
blockersInput.put("placeholder", "Issues preventing progress...");
blockersInput.put("mandatory", false);
inputs.add(blockersInput);

form.put("inputs", inputs);

// Context
context = Map();
context.put("projectId", getLinkedProject(chat.get("id")));
context.put("channelId", chat.get("id"));
form.put("context", context);

form.put("action", Map());
form.get("action").put("type", "invoke.function");
form.get("action").put("name", "submitStandup");

return form;
```

**Standup Posted Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Daily Standup - @mantra                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ *Completed:*                                            │
│  • Finished homepage design                                 │
│  • Reviewed PR #45                                          │
│                                                             │
│  🔄 *Working on:*                                           │
│  • Mobile responsive fixes                                  │
│  • API integration                                          │
│                                                             │
│  🚧 *Blockers:*                                             │
│  • Waiting for design assets                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Team Summary** (end of standup window):
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Team Standup Summary - Nov 26                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👥 *Submitted:* 4/5 team members                           │
│                                                             │
│  ✅ *Team Completed:* 8 items                               │
│  🔄 *In Progress:* 6 items                                  │
│  🚧 *Blockers:* 2 (need attention)                          │
│                                                             │
│  ⚠️ *Not submitted:* @john                                  │
│                                                             │
│  [View All Standups]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Standup form works
- [ ] Responses posted to channel
- [ ] Team summary generated
- [ ] Blockers highlighted
- [ ] Daily reminder sent

---

### 6.8 Testing & Polish
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Test all channel integration features

**Steps**:
- [ ] Test channel linking flow
- [ ] Test activity feed posts
- [ ] Test all channel commands
- [ ] Test member sync
- [ ] Test standup feature
- [ ] Performance testing
- [ ] Document channel usage

**Test Cases**:
| Test | Expected | Status |
|------|----------|--------|
| Link channel | Link created, welcome posted | ⬜ |
| Create task | Activity posted to channel | ⬜ |
| Complete task | Activity posted to channel | ⬜ |
| /tasks command | Shows project tasks | ⬜ |
| /progress command | Shows progress stats | ⬜ |
| Add project member | Auto-invited to channel | ⬜ |
| Submit standup | Posted to channel | ⬜ |
| Settings disabled | Activity not posted | ⬜ |
| Unlink channel | Link removed | ⬜ |

**Acceptance Criteria**:
- [ ] All features work end-to-end
- [ ] No duplicate posts
- [ ] Performance acceptable
- [ ] Error handling graceful
- [ ] Documentation complete

---

## 🔗 Dependencies

- **Requires**: Backend API running
- **Requires**: Notification system (Feature 3)
- **Requires**: User mapping working
- **Requires**: Project/Task endpoints
- **Used by**: Gamification (team celebrations)
- **Used by**: Scheduled Automations (daily summary)

---

## 📚 Resources

- [Zoho Cliq Channels API](https://www.zoho.com/cliq/help/developer-guide/channels.html)
- [Channel Webhooks](https://www.zoho.com/cliq/help/developer-guide/incoming-webhooks.html)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [░░░░░░░░░░] 0%

6.1 Integration Setup [░░░░░░░░░░] 0%
6.2 Backend           [░░░░░░░░░░] 0%
6.3 Channel Linking   [░░░░░░░░░░] 0%
6.4 Activity Feed     [░░░░░░░░░░] 0%
6.5 Channel Commands  [░░░░░░░░░░] 0%
6.6 Member Sync       [░░░░░░░░░░] 0%
6.7 Standup           [░░░░░░░░░░] 0%
6.8 Testing           [░░░░░░░░░░] 0%
```

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: Planning*
