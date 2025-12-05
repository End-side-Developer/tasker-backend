# 🏠 Feature 2: Tasker Home Widget - Personal Dashboard

> **Goal**: Create an always-visible dashboard widget in Cliq's home screen for instant task visibility.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 2.1 | Widget Registration & Setup | 🔴 High | ⬜ TODO | 2h |
| 2.2 | Widget Structure & Tabs | 🔴 High | ✅ DONE | 3h |
| 2.3 | Backend Widget Endpoints | 🔴 High | ✅ DONE | 4h |
| 2.4 | Dashboard Tab Implementation | 🔴 High | ✅ DONE | 4h |
| 2.5 | My Tasks Tab Implementation | 🟡 Medium | ✅ DONE | 4h |
| 2.6 | Projects Tab Implementation | 🟡 Medium | ✅ DONE | 3h |
| 2.7 | Quick Actions | 🟡 Medium | ✅ DONE | 3h |
| 2.8 | Widget Refresh & Caching | 🟢 Low | ⬜ TODO | 2h |
| 2.9 | Testing & Polish | 🔴 High | ⬜ TODO | 3h |

**Total Estimated: ~28 hours (5-6 days)**

---

## 📝 Task Details

### 2.1 Widget Registration & Setup
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Register Tasker Widget in Zoho Cliq Developer Console

**Steps**:
- [ ] Go to Zoho Cliq → Admin Settings → Widgets
- [ ] Create new widget named "Tasker Dashboard"
- [ ] Set widget icon (Tasker logo)
- [ ] Configure widget size (Large recommended)
- [ ] Set refresh interval (5 minutes)
- [ ] Configure widget permissions
- [ ] Test widget appears in Home

**Widget Configuration**:
```json
{
  "name": "Tasker Dashboard",
  "description": "Your personal task management hub",
  "icon": "tasker-widget-icon.png",
  "tabs": ["Dashboard", "My Tasks", "Projects"],
  "default_tab": "Dashboard",
  "size": "large",
  "refresh_interval": 300
}
```

**Acceptance Criteria**:
- [ ] Widget visible in Cliq Home
- [ ] All tabs configured
- [ ] Icon displaying correctly
- [ ] Basic loading state works

**Files to Create**:
```
cliq-scripts/widget/
├── home-widget.dg             # Main widget config
└── README.md                  # Widget documentation
```

---

### 2.2 Widget Structure & Tabs
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Create the widget handler files and tab structure

**Steps**:
- [ ] Create `widget-load-handler.dg` - initial data load
- [ ] Create `widget-button-handler.dg` - button actions
- [ ] Create `widget-tab-handler.dg` - tab switching
- [ ] Define tab layouts
- [ ] Implement loading states

**Code Template** - `home-widget.dg`:
```deluge
// Tasker Home Widget Configuration

widget_config = Map();
widget_config.put("name", "Tasker Dashboard");
widget_config.put("tabs", {"Dashboard", "My Tasks", "Projects"});

// Tab configurations
tabs = List();

// Dashboard Tab
dashboard_tab = Map();
dashboard_tab.put("label", "Dashboard");
dashboard_tab.put("id", "dashboard");
tabs.add(dashboard_tab);

// My Tasks Tab
tasks_tab = Map();
tasks_tab.put("label", "My Tasks");
tasks_tab.put("id", "my_tasks");
tabs.add(tasks_tab);

// Projects Tab
projects_tab = Map();
projects_tab.put("label", "Projects");
projects_tab.put("id", "projects");
tabs.add(projects_tab);

widget_config.put("tabs", tabs);

return widget_config;
```

**Code Template** - `widget-load-handler.dg`:
```deluge
// Widget Load Handler
// Called when widget is loaded or refreshed

response = Map();
userId = user.get("id");
userEmail = user.get("email");
tabId = arguments.get("tab_id");

if(tabId == null)
{
    tabId = "dashboard";
}

// Fetch data based on active tab
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/widget/";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

if(tabId == "dashboard")
{
    apiUrl = apiUrl + "dashboard?userId=" + userId + "&userEmail=" + userEmail;
}
else if(tabId == "my_tasks")
{
    apiUrl = apiUrl + "tasks?userId=" + userId + "&userEmail=" + userEmail;
}
else if(tabId == "projects")
{
    apiUrl = apiUrl + "projects?userId=" + userId + "&userEmail=" + userEmail;
}

apiResponse = invokeurl
[
    url: apiUrl
    type: GET
    headers: headers
];

if(apiResponse.get("success"))
{
    response = buildTabContent(tabId, apiResponse.get("data"));
}
else
{
    response = buildErrorState();
}

return response;
```

**Acceptance Criteria**:
- [ ] All handler files created
- [ ] Tab switching works
- [ ] Data loads on init
- [ ] Loading states display

**Files to Create**:
```
cliq-scripts/widget/
├── home-widget.dg
├── widget-load-handler.dg
├── widget-button-handler.dg
└── widget-tab-handler.dg
```

---

### 2.3 Backend Widget Endpoints
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Create backend endpoints for widget data

**Steps**:
- [ ] Create `src/controllers/widgetController.js`
- [ ] Implement `GET /api/cliq/widget/dashboard`
- [ ] Implement `GET /api/cliq/widget/tasks`
- [ ] Implement `GET /api/cliq/widget/projects`
- [ ] Implement `GET /api/cliq/widget/stats`
- [ ] Implement `POST /api/cliq/widget/quick-task`
- [ ] Add routes to router

**Code Template** - `widgetController.js`:
```javascript
const logger = require('../config/logger');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');

/**
 * Get dashboard data for widget
 */
exports.getDashboard = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all user's tasks
    const allTasks = await taskService.listTasks({ assignee: taskerId });
    
    // Calculate stats
    const stats = {
      completed: allTasks.filter(t => t.status === 'completed').length,
      pending: allTasks.filter(t => t.status !== 'completed').length,
      overdue: allTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate._seconds * 1000) < today;
      }).length
    };
    
    // Get today's tasks
    const todaysTasks = allTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = new Date(t.dueDate._seconds * 1000);
      return due >= today && due < tomorrow;
    }).slice(0, 5); // Limit to 5
    
    // Get focus task (highest priority due soonest)
    const focusTask = todaysTasks
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      })[0] || null;
    
    return res.json({
      success: true,
      data: {
        focusTask,
        todaysTasks,
        stats,
        streak: await getStreak(taskerId) // Implement later
      }
    });
    
  } catch (error) {
    logger.error('Widget dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

/**
 * Get tasks for widget
 */
exports.getTasks = async (req, res) => {
  try {
    const { userId, userEmail, filter } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let tasks = await taskService.listTasks({ assignee: taskerId });
    
    // Apply filter
    switch(filter) {
      case 'today':
        tasks = tasks.filter(t => isToday(t.dueDate));
        break;
      case 'overdue':
        tasks = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed');
        break;
      case 'pending':
        tasks = tasks.filter(t => t.status !== 'completed');
        break;
      case 'completed':
        tasks = tasks.filter(t => t.status === 'completed');
        break;
    }
    
    // Sort by due date
    tasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate._seconds - b.dueDate._seconds;
    });
    
    return res.json({
      success: true,
      data: {
        tasks: tasks.slice(0, 20), // Limit to 20
        total: tasks.length
      }
    });
    
  } catch (error) {
    logger.error('Widget tasks error:', error);
    return res.status(500).json({ error: 'Failed to load tasks' });
  }
};

/**
 * Get projects for widget
 */
exports.getProjects = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's projects
    const { admin } = require('../config/firebase');
    const db = admin.firestore();
    
    const projectsSnapshot = await db.collection('projects')
      .where('memberIds', 'array-contains', taskerId)
      .limit(10)
      .get();
    
    const projects = [];
    for (const doc of projectsSnapshot.docs) {
      const project = { id: doc.id, ...doc.data() };
      
      // Get task count for project
      const tasksSnapshot = await db.collection('tasks')
        .where('projectId', '==', doc.id)
        .get();
      
      const tasks = tasksSnapshot.docs.map(d => d.data());
      project.taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status !== 'completed').length
      };
      
      projects.push(project);
    }
    
    return res.json({
      success: true,
      data: { projects }
    });
    
  } catch (error) {
    logger.error('Widget projects error:', error);
    return res.status(500).json({ error: 'Failed to load projects' });
  }
};

/**
 * Quick task creation from widget
 */
exports.createQuickTask = async (req, res) => {
  try {
    const { userId, userEmail, title, projectId } = req.body;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const task = await taskService.createTask({
      title,
      projectId: projectId || null,
      assignees: [taskerId],
      createdBy: taskerId,
      priority: 'medium'
    });
    
    return res.json({
      success: true,
      task
    });
    
  } catch (error) {
    logger.error('Quick task error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
};

// Helper functions
function isToday(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp._seconds * 1000);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isOverdue(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp._seconds * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

async function getStreak(taskerId) {
  // Placeholder - implement with gamification feature
  return { current: 0, best: 0 };
}
```

**Acceptance Criteria**:
- [ ] All endpoints responding
- [ ] Data formatted for widget display
- [ ] User mapping working
- [ ] Performance acceptable (<500ms)

**Files to Create**:
```
src/
├── controllers/widgetController.js
└── routes/widgetRoutes.js
```

---

### 2.4 Dashboard Tab Implementation
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Build the main dashboard view with focus mode and stats

**Steps**:
- [ ] Design dashboard layout
- [ ] Implement focus task card
- [ ] Implement stats section
- [ ] Implement today's tasks list
- [ ] Add quick action buttons
- [ ] Style with proper colors and spacing

**Dashboard Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Tasker Dashboard                               [⟳]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔥 FOCUS MODE                                      │   │
│  │                                                     │   │
│  │  Homepage Redesign                                  │   │
│  │  📅 Due: Today 5:00 PM  │  ⚡ High Priority        │   │
│  │                                                     │   │
│  │  [✓ Complete]  [⏰ Snooze]  [👁 View]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📊 This Week                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │     ✅      │ │     📋      │ │     🔥      │          │
│  │     12      │ │      4      │ │      1      │          │
│  │  Completed  │ │   Pending   │ │   Overdue   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  📌 Today's Tasks (3)                                       │
│  ├─ ⚡ Client presentation          │  11:00 AM            │
│  ├─ 🔵 Review PR #45                │  2:00 PM             │
│  └─ 🟢 Update documentation         │  EOD                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [+ Quick Task]   [📂 All Projects]   [🔍 Search]   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Code Template** - Dashboard Builder:
```deluge
// Build Dashboard Tab Content
// Called from widget-load-handler.dg

buildDashboardTab(data)
{
    sections = List();
    
    // Focus Task Section
    if(data.get("focusTask") != null)
    {
        focusTask = data.get("focusTask");
        focusSection = Map();
        focusSection.put("type", "section");
        focusSection.put("title", "🔥 FOCUS MODE");
        
        elements = List();
        
        // Task title
        titleEl = Map();
        titleEl.put("type", "title");
        titleEl.put("text", focusTask.get("title"));
        elements.add(titleEl);
        
        // Due date and priority
        infoEl = Map();
        infoEl.put("type", "text");
        dueText = "📅 Due: " + formatDueDate(focusTask.get("dueDate"));
        priorityText = getPriorityIcon(focusTask.get("priority")) + " " + focusTask.get("priority") + " Priority";
        infoEl.put("text", dueText + "  │  " + priorityText);
        elements.add(infoEl);
        
        // Action buttons
        buttons = List();
        
        completeBtn = Map();
        completeBtn.put("label", "✓ Complete");
        completeBtn.put("type", "invoke.function");
        completeBtn.put("name", "completeTaskFromWidget");
        completeBtn.put("taskId", focusTask.get("id"));
        buttons.add(completeBtn);
        
        viewBtn = Map();
        viewBtn.put("label", "👁 View");
        viewBtn.put("type", "invoke.function");
        viewBtn.put("name", "viewTaskDetails");
        viewBtn.put("taskId", focusTask.get("id"));
        buttons.add(viewBtn);
        
        focusSection.put("elements", elements);
        focusSection.put("buttons", buttons);
        sections.add(focusSection);
    }
    else
    {
        // No focus task
        noTaskSection = Map();
        noTaskSection.put("type", "section");
        noTaskSection.put("title", "🎉 All Clear!");
        
        elements = List();
        textEl = Map();
        textEl.put("type", "text");
        textEl.put("text", "No urgent tasks right now. Great job!");
        elements.add(textEl);
        
        noTaskSection.put("elements", elements);
        sections.add(noTaskSection);
    }
    
    // Stats Section
    stats = data.get("stats");
    statsSection = Map();
    statsSection.put("type", "section");
    statsSection.put("title", "📊 This Week");
    
    statsElements = List();
    
    // Stats row
    statsRow = Map();
    statsRow.put("type", "fields");
    fields = List();
    
    completedField = Map();
    completedField.put("title", "✅ Completed");
    completedField.put("value", stats.get("completed").toString());
    fields.add(completedField);
    
    pendingField = Map();
    pendingField.put("title", "📋 Pending");
    pendingField.put("value", stats.get("pending").toString());
    fields.add(pendingField);
    
    overdueField = Map();
    overdueField.put("title", "🔥 Overdue");
    overdueField.put("value", stats.get("overdue").toString());
    fields.add(overdueField);
    
    statsRow.put("fields", fields);
    statsElements.add(statsRow);
    
    statsSection.put("elements", statsElements);
    sections.add(statsSection);
    
    // Today's Tasks Section
    todaysTasks = data.get("todaysTasks");
    if(todaysTasks.size() > 0)
    {
        todaySection = Map();
        todaySection.put("type", "section");
        todaySection.put("title", "📌 Today's Tasks (" + todaysTasks.size() + ")");
        
        taskElements = List();
        for each task in todaysTasks
        {
            taskEl = Map();
            taskEl.put("type", "text");
            icon = getPriorityIcon(task.get("priority"));
            dueTime = formatDueTime(task.get("dueDate"));
            taskEl.put("text", icon + " " + task.get("title") + "  │  " + dueTime);
            taskElements.add(taskEl);
        }
        
        todaySection.put("elements", taskElements);
        sections.add(todaySection);
    }
    
    // Quick Actions Section
    actionsSection = Map();
    actionsSection.put("type", "section");
    
    actionButtons = List();
    
    quickTaskBtn = Map();
    quickTaskBtn.put("label", "+ Quick Task");
    quickTaskBtn.put("type", "invoke.function");
    quickTaskBtn.put("name", "openQuickTaskForm");
    actionButtons.add(quickTaskBtn);
    
    projectsBtn = Map();
    projectsBtn.put("label", "📂 All Projects");
    projectsBtn.put("type", "switch_tab");
    projectsBtn.put("tab_id", "projects");
    actionButtons.add(projectsBtn);
    
    searchBtn = Map();
    searchBtn.put("label", "🔍 Search");
    searchBtn.put("type", "invoke.function");
    searchBtn.put("name", "openSearchDialog");
    actionButtons.add(searchBtn);
    
    actionsSection.put("buttons", actionButtons);
    sections.add(actionsSection);
    
    return sections;
}

// Helper functions
getPriorityIcon(priority)
{
    if(priority == "high")
    {
        return "⚡";
    }
    else if(priority == "medium")
    {
        return "🔵";
    }
    else
    {
        return "🟢";
    }
}

formatDueDate(dueDate)
{
    // Format due date for display
    if(dueDate == null)
    {
        return "No due date";
    }
    // Implementation depends on date format
    return "Today";
}

formatDueTime(dueDate)
{
    if(dueDate == null)
    {
        return "EOD";
    }
    // Extract and format time
    return "2:00 PM";
}
```

**Acceptance Criteria**:
- [ ] Focus task prominently displayed
- [ ] Stats visually clear
- [ ] Today's tasks listed
- [ ] Quick actions working
- [ ] Responsive to different data states

---

### 2.5 My Tasks Tab Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Build filterable task list view

**Steps**:
- [ ] Design task list layout
- [ ] Implement filter pills (All, Today, Overdue, Completed)
- [ ] Build task list items
- [ ] Add task action buttons
- [ ] Implement pagination/load more
- [ ] Add empty state

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  📋 My Tasks                                        [⟳]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [All] [Today] [Overdue] [Pending] [Completed]              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚡ Homepage Redesign                                 │   │
│  │    📁 Website Project  │  📅 Today  │  [✓] [👁]     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔵 Review pull request #234                         │   │
│  │    📁 Backend API  │  📅 Tomorrow  │  [✓] [👁]      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🟢 Update documentation                             │   │
│  │    📁 Docs  │  📅 Nov 28  │  [✓] [👁]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Showing 3 of 12 tasks                                      │
│  [Load More]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Filters work correctly
- [ ] Task items display all info
- [ ] Complete action works
- [ ] View navigates to details
- [ ] Load more works

---

### 2.6 Projects Tab Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Build project cards with progress indicators

**Steps**:
- [ ] Design project card layout
- [ ] Implement progress bars
- [ ] Add project quick actions
- [ ] Build project list
- [ ] Add empty state

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  📁 My Projects                                     [⟳]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🌐 Website Redesign                                │   │
│  │  ████████░░░░░░░░░░  45%  (9/20 tasks)             │   │
│  │  👥 4 members  │  📅 Due: Dec 15                    │   │
│  │  [View Tasks] [Open Project]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📱 Mobile App                                      │   │
│  │  ██████████████████  90%  (18/20 tasks)            │   │
│  │  👥 3 members  │  📅 Due: Nov 30                    │   │
│  │  [View Tasks] [Open Project]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊 Marketing Campaign                              │   │
│  │  ████░░░░░░░░░░░░░░  20%  (4/20 tasks)             │   │
│  │  👥 5 members  │  📅 Due: Jan 10                    │   │
│  │  [View Tasks] [Open Project]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Project cards display correctly
- [ ] Progress bars accurate
- [ ] Member count shown
- [ ] Quick actions work

---

### 2.7 Quick Actions
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Implement quick task creation and other shortcuts

**Steps**:
- [ ] Create quick task form function
- [ ] Create search dialog function
- [ ] Implement complete task from widget
- [ ] Implement view task details
- [ ] Create refresh handler

**Quick Task Form**:
```deluge
// Quick Task Form Function
// Opens a simple form to quickly add a task

form = Map();
form.put("type", "form");
form.put("title", "Quick Task");
form.put("name", "quick_task_form");
form.put("button_label", "Create Task");

inputs = List();

// Task title
titleInput = Map();
titleInput.put("type", "text");
titleInput.put("name", "title");
titleInput.put("label", "Task Title");
titleInput.put("placeholder", "What needs to be done?");
titleInput.put("mandatory", true);
inputs.add(titleInput);

// Project selector
projectInput = Map();
projectInput.put("type", "select");
projectInput.put("name", "project");
projectInput.put("label", "Project (Optional)");
// Options would be loaded dynamically
inputs.add(projectInput);

// Due date
dueDateInput = Map();
dueDateInput.put("type", "date");
dueDateInput.put("name", "dueDate");
dueDateInput.put("label", "Due Date (Optional)");
inputs.add(dueDateInput);

form.put("inputs", inputs);

return form;
```

**Acceptance Criteria**:
- [ ] Quick task creates successfully
- [ ] Search finds tasks
- [ ] Complete updates immediately
- [ ] Refresh loads fresh data

---

### 2.8 Widget Refresh & Caching
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Implement efficient data loading and caching

**Steps**:
- [ ] Implement auto-refresh (5 min)
- [ ] Add manual refresh button
- [ ] Cache recent data locally
- [ ] Show loading states
- [ ] Handle offline gracefully

**Acceptance Criteria**:
- [ ] Auto-refresh works
- [ ] Manual refresh immediate
- [ ] Cached data shown while loading
- [ ] Offline message displayed

---

### 2.9 Testing & Polish
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Test all widget functionality and polish UI

**Steps**:
- [ ] Test all tabs
- [ ] Test all actions
- [ ] Test with various data states
- [ ] Test error handling
- [ ] Polish styling
- [ ] Document usage

**Test Cases**:
| Test | Expected | Status |
|------|----------|--------|
| Load dashboard | Shows focus task + stats | ⬜ |
| No tasks | Shows empty state | ⬜ |
| Complete task | Task marked, UI updates | ⬜ |
| Filter tasks | Correct tasks shown | ⬜ |
| Quick task | Task created, appears in list | ⬜ |
| Error state | Graceful error message | ⬜ |
| Offline | Cached data shown | ⬜ |

**Acceptance Criteria**:
- [ ] All tests passing
- [ ] No visual bugs
- [ ] Performance acceptable
- [ ] Documentation complete

---

## 🔗 Dependencies

- **Requires**: Backend API running
- **Requires**: Task/Project endpoints functional
- **Requires**: User mapping working
- **Used by**: All other features (entry point)

---

## 📚 Resources

- [Zoho Cliq Widget Documentation](https://www.zoho.com/cliq/help/developer-guide/widgets.html)
- [Widget Handlers](https://www.zoho.com/cliq/help/developer-guide/widget-handlers.html)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [░░░░░░░░░░] 0%

2.1 Widget Setup    [░░░░░░░░░░] 0%
2.2 Structure       [░░░░░░░░░░] 0%
2.3 Backend         [░░░░░░░░░░] 0%
2.4 Dashboard Tab   [░░░░░░░░░░] 0%
2.5 Tasks Tab       [░░░░░░░░░░] 0%
2.6 Projects Tab    [░░░░░░░░░░] 0%
2.7 Quick Actions   [░░░░░░░░░░] 0%
2.8 Caching         [░░░░░░░░░░] 0%
2.9 Testing         [░░░░░░░░░░] 0%
```

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: Planning*
