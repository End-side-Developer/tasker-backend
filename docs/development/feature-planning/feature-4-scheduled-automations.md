# 📅 Feature 4: Scheduled Automations

> **Goal**: Automate daily briefings, weekly reports, reminders, and cleanup tasks.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 4.1 | Scheduler Setup in Cliq | 🔴 High | ⬜ TODO | 2h |
| 4.2 | Backend Scheduler Endpoints | 🔴 High | ⬜ TODO | 4h |
| 4.3 | Daily Briefing Implementation | 🔴 High | ⬜ TODO | 4h |
| 4.4 | Weekly Report Implementation | 🟡 Medium | ⬜ TODO | 4h |
| 4.5 | Smart Reminders System | 🟡 Medium | ⬜ TODO | 4h |
| 4.6 | Overdue Escalation | 🟡 Medium | ⬜ TODO | 3h |
| 4.7 | User Schedule Preferences | 🟢 Low | ⬜ TODO | 2h |
| 4.8 | Testing & Monitoring | 🔴 High | ⬜ TODO | 3h |

**Total Estimated: ~26 hours (5 days)**

---

## 📝 Task Details

### 4.1 Scheduler Setup in Cliq
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Configure scheduled tasks in Zoho Cliq

**Steps**:
- [ ] Go to Zoho Cliq → Admin Settings → Schedulers
- [ ] Create "Daily Briefing" scheduler (cron: 0 9 * * *)
- [ ] Create "Weekly Report" scheduler (cron: 0 10 * * 1)
- [ ] Create "Hourly Reminder Check" scheduler (cron: 0 * * * *)
- [ ] Create "Daily Overdue Check" scheduler (cron: 0 8 * * *)
- [ ] Link each scheduler to handler functions
- [ ] Test schedulers manually first

**Scheduler Configurations**:

| Scheduler | Cron | Time | Handler |
|-----------|------|------|---------|
| Daily Briefing | `0 9 * * *` | 9:00 AM daily | `sendDailyBriefing` |
| Weekly Report | `0 10 * * 1` | Monday 10:00 AM | `sendWeeklyReport` |
| Reminder Check | `0 * * * *` | Every hour | `checkDueReminders` |
| Overdue Check | `0 8 * * *` | 8:00 AM daily | `checkOverdueTasks` |
| Stale Task Check | `0 9 * * 1` | Monday 9:00 AM | `checkStaleTasks` |

**Acceptance Criteria**:
- [ ] All schedulers created in Cliq
- [ ] Cron expressions correct
- [ ] Manual trigger works
- [ ] Handlers connected

**Files to Create**:
```
cliq-scripts/scheduler/
├── daily-briefing-scheduler.dg
├── weekly-report-scheduler.dg
├── reminder-check-scheduler.dg
├── overdue-check-scheduler.dg
└── stale-task-scheduler.dg
```

---

### 4.2 Backend Scheduler Endpoints
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Create backend endpoints to generate scheduled content

**Steps**:
- [ ] Create `src/controllers/schedulerController.js`
- [ ] Implement `GET /api/cliq/scheduler/daily-briefing`
- [ ] Implement `GET /api/cliq/scheduler/weekly-report`
- [ ] Implement `GET /api/cliq/scheduler/due-tasks`
- [ ] Implement `GET /api/cliq/scheduler/overdue-tasks`
- [ ] Implement `GET /api/cliq/scheduler/stale-tasks`
- [ ] Add routes to router

**Code Template** - `schedulerController.js`:
```javascript
const logger = require('../config/logger');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');
const { admin } = require('../config/firebase');

/**
 * Get daily briefing data for a user
 */
exports.getDailyBriefing = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // Get all user's tasks
    const allTasks = await taskService.listTasks({ assignee: taskerId });
    
    // Today's tasks
    const todaysTasks = allTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = t.dueDate._seconds ? new Date(t.dueDate._seconds * 1000) : new Date(t.dueDate);
      return due >= today && due < tomorrow;
    });
    
    // Overdue tasks
    const overdueTasks = allTasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = t.dueDate._seconds ? new Date(t.dueDate._seconds * 1000) : new Date(t.dueDate);
      return due < today;
    });
    
    // Yesterday's completions
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdaysCompletions = allTasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false;
      const updated = t.updatedAt._seconds ? new Date(t.updatedAt._seconds * 1000) : new Date(t.updatedAt);
      return updated >= yesterday && updated < today;
    });
    
    // Get user's name
    const userDoc = await admin.firestore().collection('users').doc(taskerId).get();
    const userName = userDoc.exists ? userDoc.data().displayName : 'there';
    
    return res.json({
      success: true,
      data: {
        userName,
        todaysTasks: todaysTasks.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        }),
        overdueTasks,
        yesterdaysCompletions: yesterdaysCompletions.length,
        totalPending: allTasks.filter(t => t.status !== 'completed').length
      }
    });
    
  } catch (error) {
    logger.error('Daily briefing error:', error);
    return res.status(500).json({ error: 'Failed to get daily briefing' });
  }
};

/**
 * Get weekly report data for a user
 */
exports.getWeeklyReport = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Get all tasks
    const allTasks = await taskService.listTasks({ assignee: taskerId });
    
    // This week's stats
    const thisWeekCompleted = allTasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false;
      const updated = t.updatedAt._seconds ? new Date(t.updatedAt._seconds * 1000) : new Date(t.updatedAt);
      return updated >= weekAgo;
    });
    
    // Last week's stats (for comparison)
    const lastWeekCompleted = allTasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false;
      const updated = t.updatedAt._seconds ? new Date(t.updatedAt._seconds * 1000) : new Date(t.updatedAt);
      return updated >= twoWeeksAgo && updated < weekAgo;
    });
    
    // Tasks created this week
    const thisWeekCreated = allTasks.filter(t => {
      if (!t.createdAt) return false;
      const created = t.createdAt._seconds ? new Date(t.createdAt._seconds * 1000) : new Date(t.createdAt);
      return created >= weekAgo;
    });
    
    // On-time completion rate
    const completedWithDueDate = thisWeekCompleted.filter(t => t.dueDate);
    const onTimeCompletions = completedWithDueDate.filter(t => {
      const due = t.dueDate._seconds ? new Date(t.dueDate._seconds * 1000) : new Date(t.dueDate);
      const completed = t.updatedAt._seconds ? new Date(t.updatedAt._seconds * 1000) : new Date(t.updatedAt);
      return completed <= due;
    });
    const onTimeRate = completedWithDueDate.length > 0 
      ? Math.round((onTimeCompletions.length / completedWithDueDate.length) * 100)
      : 100;
    
    // Top project this week
    const projectTaskCounts = {};
    thisWeekCompleted.forEach(t => {
      if (t.projectId) {
        projectTaskCounts[t.projectId] = (projectTaskCounts[t.projectId] || 0) + 1;
      }
    });
    let topProject = null;
    let topProjectCount = 0;
    for (const [projectId, count] of Object.entries(projectTaskCounts)) {
      if (count > topProjectCount) {
        topProjectCount = count;
        // Get project name
        const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
        topProject = projectDoc.exists ? projectDoc.data().name : 'Unknown Project';
      }
    }
    
    // Productivity trend
    const weekDiff = thisWeekCompleted.length - lastWeekCompleted.length;
    const weekTrend = lastWeekCompleted.length > 0
      ? Math.round((weekDiff / lastWeekCompleted.length) * 100)
      : (thisWeekCompleted.length > 0 ? 100 : 0);
    
    // Get user's name
    const userDoc = await admin.firestore().collection('users').doc(taskerId).get();
    const userName = userDoc.exists ? userDoc.data().displayName : 'there';
    
    return res.json({
      success: true,
      data: {
        userName,
        weekRange: {
          start: weekAgo.toISOString(),
          end: now.toISOString()
        },
        stats: {
          tasksCompleted: thisWeekCompleted.length,
          tasksCreated: thisWeekCreated.length,
          onTimeRate,
          weekTrend,
          topProject,
          topProjectCount
        },
        comparison: {
          lastWeekCompleted: lastWeekCompleted.length,
          change: weekDiff,
          percentChange: weekTrend
        }
      }
    });
    
  } catch (error) {
    logger.error('Weekly report error:', error);
    return res.status(500).json({ error: 'Failed to get weekly report' });
  }
};

/**
 * Get tasks due soon for reminders
 */
exports.getDueTasks = async (req, res) => {
  try {
    const { hoursAhead = 24 } = req.query;
    
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    const db = admin.firestore();
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '!=', 'completed')
      .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(cutoff))
      .get();
    
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    // Group by user
    const tasksByUser = {};
    tasks.forEach(task => {
      (task.assignees || []).forEach(userId => {
        if (!tasksByUser[userId]) {
          tasksByUser[userId] = [];
        }
        tasksByUser[userId].push(task);
      });
    });
    
    return res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        tasksByUser
      }
    });
    
  } catch (error) {
    logger.error('Due tasks error:', error);
    return res.status(500).json({ error: 'Failed to get due tasks' });
  }
};

/**
 * Get overdue tasks
 */
exports.getOverdueTasks = async (req, res) => {
  try {
    const now = new Date();
    
    const db = admin.firestore();
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '!=', 'completed')
      .where('dueDate', '<', admin.firestore.Timestamp.fromDate(now))
      .get();
    
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      const task = { id: doc.id, ...doc.data() };
      const due = task.dueDate._seconds ? new Date(task.dueDate._seconds * 1000) : new Date(task.dueDate);
      task.daysOverdue = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      tasks.push(task);
    });
    
    // Group by user
    const tasksByUser = {};
    tasks.forEach(task => {
      (task.assignees || []).forEach(userId => {
        if (!tasksByUser[userId]) {
          tasksByUser[userId] = [];
        }
        tasksByUser[userId].push(task);
      });
    });
    
    return res.json({
      success: true,
      data: {
        totalOverdue: tasks.length,
        tasksByUser
      }
    });
    
  } catch (error) {
    logger.error('Overdue tasks error:', error);
    return res.status(500).json({ error: 'Failed to get overdue tasks' });
  }
};

/**
 * Get stale tasks (no activity in X days)
 */
exports.getStaleTasks = async (req, res) => {
  try {
    const { daysStale = 14 } = req.query;
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysStale);
    
    const db = admin.firestore();
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '!=', 'completed')
      .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(cutoff))
      .get();
    
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      const task = { id: doc.id, ...doc.data() };
      const updated = task.updatedAt._seconds ? new Date(task.updatedAt._seconds * 1000) : new Date(task.updatedAt);
      task.daysSinceUpdate = Math.floor((new Date() - updated) / (1000 * 60 * 60 * 24));
      tasks.push(task);
    });
    
    return res.json({
      success: true,
      data: {
        totalStale: tasks.length,
        tasks
      }
    });
    
  } catch (error) {
    logger.error('Stale tasks error:', error);
    return res.status(500).json({ error: 'Failed to get stale tasks' });
  }
};
```

**Acceptance Criteria**:
- [ ] All endpoints working
- [ ] Data correctly calculated
- [ ] Performance acceptable
- [ ] Error handling in place

**Files to Create**:
```
src/
├── controllers/schedulerController.js
└── routes/schedulerRoutes.js
```

---

### 4.3 Daily Briefing Implementation
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Send personalized morning briefings to all users

**Steps**:
- [ ] Create briefing scheduler handler
- [ ] Get list of users to brief
- [ ] Fetch briefing data for each user
- [ ] Format and send briefing message
- [ ] Handle errors gracefully
- [ ] Log delivery status

**Code Template** - `daily-briefing-scheduler.dg`:
```deluge
// Daily Briefing Scheduler Handler
// Runs at 9:00 AM daily

info "Starting daily briefing...";

// Get all users with Cliq mapping
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/scheduler/users";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

usersResponse = invokeurl
[
    url: apiUrl
    type: GET
    headers: headers
];

if(usersResponse.get("success") != true)
{
    info "Failed to get users for briefing";
    return;
}

users = usersResponse.get("data").get("users");
successCount = 0;
failCount = 0;

for each userMapping in users
{
    try
    {
        // Get briefing data for user
        briefingUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/scheduler/daily-briefing";
        briefingUrl = briefingUrl + "?userId=" + userMapping.get("cliq_user_id");
        briefingUrl = briefingUrl + "&userEmail=" + encodeUrl(userMapping.get("email"));
        
        briefingResponse = invokeurl
        [
            url: briefingUrl
            type: GET
            headers: headers
        ];
        
        if(briefingResponse.get("success") == true)
        {
            data = briefingResponse.get("data");
            
            // Build briefing message
            message = buildBriefingMessage(data);
            
            // Send to user via DM
            sendBriefingToUser(userMapping.get("cliq_user_id"), message);
            
            successCount = successCount + 1;
        }
        else
        {
            failCount = failCount + 1;
        }
    }
    catch (e)
    {
        info "Error sending briefing to user: " + e;
        failCount = failCount + 1;
    }
}

info "Daily briefing complete. Success: " + successCount + ", Failed: " + failCount;

// Helper function to build briefing message
buildBriefingMessage(data)
{
    userName = data.get("userName");
    todaysTasks = data.get("todaysTasks");
    overdueTasks = data.get("overdueTasks");
    yesterdaysCompletions = data.get("yesterdaysCompletions");
    
    // Greeting based on time
    greeting = "☀️ Good morning, " + userName + "!";
    
    // Build main message
    messageText = greeting + "\n\n";
    messageText = messageText + "Here's your day at a glance:\n\n";
    
    // Today's tasks section
    messageText = messageText + "📋 *Tasks Due Today: " + todaysTasks.size() + "*\n";
    
    if(todaysTasks.size() > 0)
    {
        for each task in todaysTasks
        {
            icon = getPriorityIcon(task.get("priority"));
            messageText = messageText + icon + " " + task.get("title") + "\n";
        }
    }
    else
    {
        messageText = messageText + "🎉 No tasks due today!\n";
    }
    
    // Overdue section
    if(overdueTasks.size() > 0)
    {
        messageText = messageText + "\n🔥 *Overdue: " + overdueTasks.size() + "*\n";
        for each task in overdueTasks
        {
            messageText = messageText + "• " + task.get("title") + "\n";
        }
    }
    
    // Yesterday's completions
    if(yesterdaysCompletions > 0)
    {
        messageText = messageText + "\n📊 *Yesterday:* You completed " + yesterdaysCompletions + " task(s)! 🎉\n";
    }
    
    // Build response with buttons
    response = Map();
    response.put("text", messageText);
    
    buttons = List();
    
    viewTasksBtn = Map();
    viewTasksBtn.put("label", "View All Tasks");
    viewTasksBtn.put("type", "invoke.function");
    viewTasksBtn.put("name", "viewMyTasks");
    buttons.add(viewTasksBtn);
    
    createTaskBtn = Map();
    createTaskBtn.put("label", "+ New Task");
    createTaskBtn.put("type", "invoke.function");
    createTaskBtn.put("name", "openQuickTaskForm");
    buttons.add(createTaskBtn);
    
    response.put("buttons", buttons);
    
    return response;
}

// Helper to get priority icon
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

// Helper to send to user
sendBriefingToUser(cliqUserId, message)
{
    // Use Cliq API to send DM to user
    zoho.cliq.postToChat(cliqUserId, message);
}
```

**Briefing Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  ☀️ Good Morning, Mantra!                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Here's your day at a glance:                               │
│                                                             │
│  📋 *Tasks Due Today: 3*                                    │
│  ⚡ Client presentation                                     │
│  🔵 Code review PR #45                                      │
│  🟢 Update documentation                                    │
│                                                             │
│  🔥 *Overdue: 1*                                            │
│  • Fix login bug                                            │
│                                                             │
│  📊 *Yesterday:* You completed 4 tasks! 🎉                  │
│                                                             │
│  [View All Tasks]  [+ New Task]                             │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Briefings sent at 9 AM
- [ ] All mapped users receive briefing
- [ ] Content is accurate
- [ ] Buttons work correctly
- [ ] Failures logged

---

### 4.4 Weekly Report Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Send weekly productivity reports every Monday

**Steps**:
- [ ] Create weekly report scheduler handler
- [ ] Calculate week-over-week stats
- [ ] Generate insights and tips
- [ ] Format report message
- [ ] Send to all users
- [ ] Log delivery

**Code Template** - `weekly-report-scheduler.dg`:
```deluge
// Weekly Report Scheduler Handler
// Runs Monday at 10:00 AM

info "Starting weekly report...";

// Similar structure to daily briefing
// Get users, fetch data, format, send

buildWeeklyReportMessage(data)
{
    userName = data.get("userName");
    stats = data.get("stats");
    comparison = data.get("comparison");
    
    messageText = "📈 *Weekly Productivity Report*\n";
    messageText = messageText + "Week of " + formatWeekRange(data.get("weekRange")) + "\n\n";
    
    // Stats
    messageText = messageText + "✅ *Tasks Completed:* " + stats.get("tasksCompleted") + "\n";
    messageText = messageText + "📝 *Tasks Created:* " + stats.get("tasksCreated") + "\n";
    messageText = messageText + "⏰ *On-Time Rate:* " + stats.get("onTimeRate") + "%\n";
    
    // Top project
    if(stats.get("topProject") != null)
    {
        messageText = messageText + "\n🏆 *Top Project:* " + stats.get("topProject");
        messageText = messageText + " (" + stats.get("topProjectCount") + " tasks)\n";
    }
    
    // Week comparison
    messageText = messageText + "\n📊 *Compared to Last Week:*\n";
    trend = comparison.get("percentChange");
    if(trend > 0)
    {
        messageText = messageText + "📈 +" + trend + "% more productive! 🎉\n";
    }
    else if(trend < 0)
    {
        messageText = messageText + "📉 " + trend + "% - Let's pick it up this week! 💪\n";
    }
    else
    {
        messageText = messageText + "➡️ Steady progress! Keep it up!\n";
    }
    
    // Weekly tip
    tip = getWeeklyTip(stats);
    messageText = messageText + "\n💡 *Tip:* " + tip + "\n";
    
    response = Map();
    response.put("text", messageText);
    
    buttons = List();
    
    detailsBtn = Map();
    detailsBtn.put("label", "View Full Report");
    detailsBtn.put("type", "invoke.function");
    detailsBtn.put("name", "viewFullReport");
    buttons.add(detailsBtn);
    
    goalsBtn = Map();
    goalsBtn.put("label", "Set Weekly Goals");
    goalsBtn.put("type", "invoke.function");
    goalsBtn.put("name", "setWeeklyGoals");
    buttons.add(goalsBtn);
    
    response.put("buttons", buttons);
    
    return response;
}

getWeeklyTip(stats)
{
    onTimeRate = stats.get("onTimeRate");
    
    if(onTimeRate < 50)
    {
        return "Try breaking large tasks into smaller ones to meet deadlines more easily.";
    }
    else if(onTimeRate < 75)
    {
        return "Consider adding buffer time when estimating task deadlines.";
    }
    else
    {
        return "Great job staying on schedule! Try batch-processing similar tasks for even better efficiency.";
    }
}
```

**Report Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  📈 Weekly Productivity Report                              │
│  Week of Nov 18 - Nov 24                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ *Tasks Completed:* 12                                   │
│  📝 *Tasks Created:* 8                                      │
│  ⏰ *On-Time Rate:* 85%                                     │
│                                                             │
│  🏆 *Top Project:* Marketing Campaign (5 tasks)             │
│                                                             │
│  📊 *Compared to Last Week:*                                │
│  📈 +40% more productive! 🎉                                │
│                                                             │
│  💡 *Tip:* Try batch-processing similar tasks for          │
│  even better efficiency.                                    │
│                                                             │
│  [View Full Report]  [Set Weekly Goals]                     │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Reports sent Monday 10 AM
- [ ] Stats accurately calculated
- [ ] Week-over-week comparison correct
- [ ] Tips are relevant
- [ ] Buttons work

---

### 4.5 Smart Reminders System
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Send timely reminders for upcoming task deadlines

**Steps**:
- [ ] Create reminder check scheduler
- [ ] Define reminder intervals (24h, 3h, 1h)
- [ ] Check for tasks due soon
- [ ] Send reminders to assignees
- [ ] Track sent reminders (avoid duplicates)
- [ ] Respect user quiet hours

**Reminder Logic**:
```javascript
const reminderIntervals = [
  { hours: 24, message: 'due tomorrow', sent: false },
  { hours: 3, message: 'due in 3 hours', sent: false },
  { hours: 1, message: 'due in 1 hour', sent: false }
];

// For each task, check if any reminder should be sent
function shouldSendReminder(task, now) {
  const dueDate = task.dueDate.toDate();
  const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
  
  for (const interval of reminderIntervals) {
    if (hoursUntilDue <= interval.hours && hoursUntilDue > interval.hours - 1) {
      // Check if already sent
      if (!task.reminders?.[`${interval.hours}h`]) {
        return { send: true, interval: interval.hours, message: interval.message };
      }
    }
  }
  
  return { send: false };
}
```

**Reminder Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ Reminder: Task Due Soon                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Client presentation" is due in 1 hour!                   │
│                                                             │
│  📁 Project: Marketing Campaign                             │
│  ⚡ Priority: High                                          │
│                                                             │
│  [✓ Complete Now]  [⏰ Snooze 1h]  [👁 View]                │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] 24h, 3h, 1h reminders working
- [ ] No duplicate reminders
- [ ] Snooze function works
- [ ] Quiet hours respected
- [ ] Only pending tasks reminded

---

### 4.6 Overdue Escalation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Escalate overdue tasks with increasing urgency

**Steps**:
- [ ] Create overdue check scheduler
- [ ] Calculate days overdue
- [ ] Send daily reminders for overdue tasks
- [ ] Escalate to project admin after X days
- [ ] Track escalation history
- [ ] Provide quick resolution options

**Escalation Levels**:
| Days Overdue | Action |
|--------------|--------|
| 1 day | Normal reminder to assignee |
| 3 days | Urgent reminder + project admin CC |
| 7 days | Critical alert + option to reassign |
| 14 days | Suggest archiving or closing |

**Overdue Alert Format**:
```
┌─────────────────────────────────────────────────────────────┐
│  🔥 OVERDUE ALERT                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Fix login bug" is 3 days overdue!                         │
│                                                             │
│  📁 Project: Backend API                                    │
│  📅 Was due: Nov 21                                         │
│                                                             │
│  Need help? Consider:                                       │
│  • Breaking it into smaller tasks                           │
│  • Asking for assistance                                    │
│  • Extending the deadline                                   │
│                                                             │
│  [✓ Complete]  [📅 Extend]  [🔄 Reassign]  [📦 Archive]     │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Daily overdue checks running
- [ ] Escalation levels working
- [ ] Project admins notified
- [ ] Resolution actions work
- [ ] History tracked

---

### 4.7 User Schedule Preferences
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Let users customize their automated messages

**Steps**:
- [ ] Create preferences data model
- [ ] Create preferences management command
- [ ] Implement timezone handling
- [ ] Implement delivery time preferences
- [ ] Allow opt-out of specific reports

**Preferences Options**:
```javascript
{
  userId: 'user123',
  
  // Daily briefing
  dailyBriefing: {
    enabled: true,
    time: '09:00',      // Local time
    timezone: 'IST'
  },
  
  // Weekly report
  weeklyReport: {
    enabled: true,
    day: 'monday',
    time: '10:00',
    timezone: 'IST'
  },
  
  // Reminders
  reminders: {
    enabled: true,
    intervals: [24, 3, 1], // hours before due
    quietHours: {
      start: '22:00',
      end: '08:00'
    }
  },
  
  // Overdue alerts
  overdueAlerts: {
    enabled: true,
    frequency: 'daily'    // daily, weekly, once
  }
}
```

**Command** - `/tasker schedule`:
```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ Schedule Preferences                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Daily Briefing                                          │
│  [✓] Enabled  │  Time: 9:00 AM  │  [Edit]                  │
│                                                             │
│  📈 Weekly Report                                           │
│  [✓] Enabled  │  Monday 10:00 AM  │  [Edit]                │
│                                                             │
│  ⏰ Task Reminders                                          │
│  [✓] Enabled  │  24h, 3h, 1h before  │  [Edit]             │
│                                                             │
│  🔥 Overdue Alerts                                          │
│  [✓] Enabled  │  Daily  │  [Edit]                          │
│                                                             │
│  🌙 Quiet Hours: 10 PM - 8 AM                               │
│  Timezone: IST (India Standard Time)                        │
│                                                             │
│  [Save Changes]                                             │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Users can customize times
- [ ] Timezone conversion correct
- [ ] Preferences respected
- [ ] Opt-out works

---

### 4.8 Testing & Monitoring
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Test all scheduled tasks and set up monitoring

**Steps**:
- [ ] Test each scheduler manually
- [ ] Verify timing accuracy
- [ ] Test with multiple timezones
- [ ] Set up logging
- [ ] Set up failure alerts
- [ ] Document troubleshooting

**Test Cases**:
| Test | Expected | Status |
|------|----------|--------|
| Trigger daily briefing manually | Message sent | ⬜ |
| User with no tasks | "All clear" message | ⬜ |
| User with overdue tasks | Overdue section shown | ⬜ |
| Weekly report calculation | Stats accurate | ⬜ |
| Reminder at 24h before | Reminder sent once | ⬜ |
| Snooze reminder | New reminder in 1h | ⬜ |
| Quiet hours active | Message queued | ⬜ |
| User opted out | No message sent | ⬜ |

**Monitoring Dashboard**:
- Scheduler run logs
- Message delivery success rate
- Average processing time
- Error counts by type

**Acceptance Criteria**:
- [ ] All tests passing
- [ ] Logs capturing execution
- [ ] Alerts for failures
- [ ] Documentation complete

---

## 🔗 Dependencies

- **Requires**: Notification system (Feature 3)
- **Requires**: Backend API running
- **Requires**: User mapping working
- **Used by**: TaskerBot (briefing data)
- **Used by**: Gamification (weekly stats)

---

## 📚 Resources

- [Zoho Cliq Schedulers](https://www.zoho.com/cliq/help/developer-guide/schedulers.html)
- [Cron Expression Reference](https://crontab.guru/)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [░░░░░░░░░░] 0%

4.1 Scheduler Setup [░░░░░░░░░░] 0%
4.2 Backend         [░░░░░░░░░░] 0%
4.3 Daily Briefing  [░░░░░░░░░░] 0%
4.4 Weekly Report   [░░░░░░░░░░] 0%
4.5 Smart Reminders [░░░░░░░░░░] 0%
4.6 Overdue Escalate[░░░░░░░░░░] 0%
4.7 Preferences     [░░░░░░░░░░] 0%
4.8 Testing         [░░░░░░░░░░] 0%
```

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: Planning*
