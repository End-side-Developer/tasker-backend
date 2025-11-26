# 📬 Feature 3: Smart Notifications & Webhooks

> **Goal**: Enable real-time bidirectional sync between Tasker Flutter app and Zoho Cliq.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 3.1 | Cliq Webhook Setup | 🔴 High | ⬜ TODO | 2h |
| 3.2 | Firebase Cloud Functions | 🔴 High | ⬜ TODO | 5h |
| 3.3 | Notification Service Backend | 🔴 High | ⬜ TODO | 4h |
| 3.4 | Task Event Notifications | 🟡 Medium | ⬜ TODO | 3h |
| 3.5 | Project Event Notifications | 🟡 Medium | ⬜ TODO | 3h |
| 3.6 | User Notification Preferences | 🟢 Low | ⬜ TODO | 3h |
| 3.7 | Notification Formatting | 🟡 Medium | ⬜ TODO | 2h |
| 3.8 | Testing & Monitoring | 🔴 High | ⬜ TODO | 3h |

**Total Estimated: ~25 hours (4-5 days)**

---

## 📝 Task Details

### 3.1 Cliq Webhook Setup
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Configure Zoho Cliq to receive incoming webhooks from our backend

**Steps**:
- [ ] Go to Zoho Cliq → Admin Settings → Incoming Webhooks
- [ ] Create new webhook named "Tasker Notifications"
- [ ] Note down the webhook URL and token
- [ ] Configure webhook format (JSON)
- [ ] Test with sample payload
- [ ] Add webhook URL to backend environment variables

**Webhook Configuration**:
```json
{
  "name": "Tasker Notifications",
  "description": "Receives task and project updates from Tasker",
  "format": "json",
  "target": "user_or_channel"
}
```

**Environment Variables to Add**:
```env
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/webhook/...
CLIQ_WEBHOOK_TOKEN=your_token_here
```

**Test Payload**:
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🔔 Test notification from Tasker!",
    "card": {
      "title": "Test Notification",
      "theme": "modern-inline"
    }
  }'
```

**Acceptance Criteria**:
- [ ] Webhook created in Cliq
- [ ] Test message appears in Cliq
- [ ] Webhook URL stored securely
- [ ] Token authentication working

**Files to Update**:
```
.env
.env.example
```

---

### 3.2 Firebase Cloud Functions
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 5h

**Description**: Set up Firebase Cloud Functions to trigger on Firestore changes

**Steps**:
- [ ] Initialize Firebase Functions in project
- [ ] Create `functions/` directory structure
- [ ] Set up function triggers for tasks collection
- [ ] Set up function triggers for projects collection
- [ ] Configure Cliq webhook credentials in functions config
- [ ] Deploy functions to Firebase
- [ ] Test triggers locally first

**Project Structure**:
```
functions/
├── package.json
├── index.js
├── src/
│   ├── triggers/
│   │   ├── taskTriggers.js
│   │   ├── projectTriggers.js
│   │   └── commentTriggers.js
│   ├── services/
│   │   └── cliqNotifier.js
│   └── utils/
│       └── formatters.js
└── .env
```

**Code Template** - `functions/index.js`:
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Import triggers
const taskTriggers = require('./src/triggers/taskTriggers');
const projectTriggers = require('./src/triggers/projectTriggers');

// Task triggers
exports.onTaskCreated = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(taskTriggers.onTaskCreated);

exports.onTaskUpdated = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(taskTriggers.onTaskUpdated);

exports.onTaskDeleted = functions.firestore
  .document('tasks/{taskId}')
  .onDelete(taskTriggers.onTaskDeleted);

// Project triggers
exports.onProjectCreated = functions.firestore
  .document('projects/{projectId}')
  .onCreate(projectTriggers.onProjectCreated);

exports.onProjectMemberAdded = functions.firestore
  .document('projects/{projectId}/members/{memberId}')
  .onCreate(projectTriggers.onMemberAdded);

// Comment triggers (optional)
exports.onCommentAdded = functions.firestore
  .document('tasks/{taskId}/comments/{commentId}')
  .onCreate(taskTriggers.onCommentAdded);
```

**Code Template** - `taskTriggers.js`:
```javascript
const cliqNotifier = require('../services/cliqNotifier');
const admin = require('firebase-admin');

/**
 * Triggered when a task is created
 */
exports.onTaskCreated = async (snapshot, context) => {
  const task = snapshot.data();
  const taskId = context.params.taskId;
  
  console.log(`Task created: ${taskId} - ${task.title}`);
  
  // Notify assignees
  if (task.assignees && task.assignees.length > 0) {
    for (const assigneeId of task.assignees) {
      await cliqNotifier.notifyUser(assigneeId, {
        type: 'task_assigned',
        task: { id: taskId, ...task }
      });
    }
  }
  
  // Notify project channel if linked
  if (task.projectId) {
    await cliqNotifier.notifyProjectChannel(task.projectId, {
      type: 'task_created',
      task: { id: taskId, ...task }
    });
  }
  
  return null;
};

/**
 * Triggered when a task is updated
 */
exports.onTaskUpdated = async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  const taskId = context.params.taskId;
  
  console.log(`Task updated: ${taskId}`);
  
  // Check for status change to completed
  if (before.status !== 'completed' && after.status === 'completed') {
    // Notify task creator (if different from completer)
    // Notify project channel
    await cliqNotifier.notifyProjectChannel(after.projectId, {
      type: 'task_completed',
      task: { id: taskId, ...after }
    });
  }
  
  // Check for assignment change
  const newAssignees = (after.assignees || []).filter(
    a => !(before.assignees || []).includes(a)
  );
  
  for (const assigneeId of newAssignees) {
    await cliqNotifier.notifyUser(assigneeId, {
      type: 'task_assigned',
      task: { id: taskId, ...after }
    });
  }
  
  // Check for due date approaching
  if (after.dueDate && !before.reminderSent) {
    const now = new Date();
    const dueDate = after.dueDate.toDate();
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
      for (const assigneeId of (after.assignees || [])) {
        await cliqNotifier.notifyUser(assigneeId, {
          type: 'task_due_soon',
          task: { id: taskId, ...after },
          hoursUntilDue: Math.round(hoursUntilDue)
        });
      }
    }
  }
  
  return null;
};

/**
 * Triggered when a task is deleted
 */
exports.onTaskDeleted = async (snapshot, context) => {
  const task = snapshot.data();
  const taskId = context.params.taskId;
  
  console.log(`Task deleted: ${taskId}`);
  
  // Optionally notify project channel
  if (task.projectId) {
    await cliqNotifier.notifyProjectChannel(task.projectId, {
      type: 'task_deleted',
      task: { id: taskId, title: task.title }
    });
  }
  
  return null;
};

/**
 * Triggered when a comment is added
 */
exports.onCommentAdded = async (snapshot, context) => {
  const comment = snapshot.data();
  const taskId = context.params.taskId;
  
  // Get the task
  const taskDoc = await admin.firestore()
    .collection('tasks').doc(taskId).get();
  
  if (!taskDoc.exists) return null;
  
  const task = taskDoc.data();
  
  // Notify task assignees (except commenter)
  const toNotify = (task.assignees || []).filter(
    a => a !== comment.authorId
  );
  
  for (const userId of toNotify) {
    await cliqNotifier.notifyUser(userId, {
      type: 'comment_added',
      task: { id: taskId, ...task },
      comment
    });
  }
  
  return null;
};
```

**Acceptance Criteria**:
- [ ] Functions deployed to Firebase
- [ ] Task create trigger working
- [ ] Task update trigger working
- [ ] Comment trigger working
- [ ] Logs visible in Firebase Console

**Files to Create**:
```
functions/
├── package.json
├── index.js
├── src/triggers/taskTriggers.js
├── src/triggers/projectTriggers.js
└── src/services/cliqNotifier.js
```

---

### 3.3 Notification Service Backend
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Create the service that sends notifications to Cliq

**Steps**:
- [ ] Create `cliqNotifier.js` service
- [ ] Implement user notification method
- [ ] Implement channel notification method
- [ ] Add notification templates
- [ ] Implement user preference checks
- [ ] Add rate limiting
- [ ] Add error handling and retries

**Code Template** - `cliqNotifier.js`:
```javascript
const axios = require('axios');
const admin = require('firebase-admin');

const CLIQ_WEBHOOK_URL = process.env.CLIQ_WEBHOOK_URL || 
  functions.config().cliq.webhook_url;

/**
 * Cliq Notification Service
 */
class CliqNotifier {
  
  /**
   * Send notification to a user
   */
  async notifyUser(userId, notification) {
    try {
      // Get user's Cliq ID from mapping
      const mapping = await this.getCliqMapping(userId);
      if (!mapping || !mapping.cliqUserId) {
        console.log(`No Cliq mapping for user: ${userId}`);
        return;
      }
      
      // Check user preferences
      const prefs = await this.getUserPreferences(userId);
      if (!this.shouldNotify(prefs, notification.type)) {
        console.log(`User ${userId} has disabled ${notification.type} notifications`);
        return;
      }
      
      // Format the notification
      const message = this.formatNotification(notification);
      
      // Send to user via DM
      await this.sendToCliq({
        ...message,
        access_token: CLIQ_ACCESS_TOKEN,
        chat: {
          id: mapping.cliqUserId
        }
      });
      
      // Log notification
      await this.logNotification(userId, notification);
      
    } catch (error) {
      console.error('Error notifying user:', error);
      throw error;
    }
  }
  
  /**
   * Send notification to a project channel
   */
  async notifyProjectChannel(projectId, notification) {
    try {
      // Get project's linked channel
      const channel = await this.getProjectChannel(projectId);
      if (!channel) {
        console.log(`No Cliq channel linked for project: ${projectId}`);
        return;
      }
      
      // Format the notification
      const message = this.formatNotification(notification);
      
      // Send to channel
      await this.sendToCliq({
        ...message,
        access_token: CLIQ_ACCESS_TOKEN,
        chat: {
          id: channel.channelId
        }
      });
      
    } catch (error) {
      console.error('Error notifying channel:', error);
      throw error;
    }
  }
  
  /**
   * Send message to Cliq via webhook
   */
  async sendToCliq(payload) {
    try {
      const response = await axios.post(CLIQ_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('Cliq notification sent:', response.status);
      return response.data;
      
    } catch (error) {
      console.error('Cliq webhook error:', error.message);
      
      // Retry logic
      if (error.response && error.response.status >= 500) {
        // Server error, retry once
        await this.delay(1000);
        return axios.post(CLIQ_WEBHOOK_URL, payload);
      }
      
      throw error;
    }
  }
  
  /**
   * Format notification based on type
   */
  formatNotification(notification) {
    const templates = {
      task_assigned: this.formatTaskAssigned,
      task_completed: this.formatTaskCompleted,
      task_due_soon: this.formatTaskDueSoon,
      task_overdue: this.formatTaskOverdue,
      comment_added: this.formatCommentAdded,
      project_invite: this.formatProjectInvite,
      member_joined: this.formatMemberJoined
    };
    
    const formatter = templates[notification.type];
    if (!formatter) {
      console.warn(`Unknown notification type: ${notification.type}`);
      return { text: 'Notification from Tasker' };
    }
    
    return formatter.call(this, notification);
  }
  
  /**
   * Task Assigned notification
   */
  formatTaskAssigned(notification) {
    const { task } = notification;
    const priorityIcon = this.getPriorityIcon(task.priority);
    
    return {
      text: `📋 New task assigned to you!`,
      card: {
        title: `${priorityIcon} ${task.title}`,
        theme: 'modern-inline',
        thumbnail: 'https://tasker-app.com/icons/task.png'
      },
      slides: [
        {
          type: 'text',
          title: 'Task Details',
          data: task.description || 'No description'
        },
        {
          type: 'label',
          title: 'Due Date',
          data: this.formatDate(task.dueDate)
        }
      ],
      buttons: [
        {
          label: 'View Task',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'viewTaskDetails',
              taskId: task.id
            }
          }
        },
        {
          label: 'Complete',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'completeTask',
              taskId: task.id
            }
          }
        }
      ]
    };
  }
  
  /**
   * Task Completed notification
   */
  formatTaskCompleted(notification) {
    const { task, completedBy } = notification;
    
    return {
      text: `✅ Task completed!`,
      card: {
        title: `✅ ${task.title}`,
        theme: 'modern-inline'
      },
      slides: [
        {
          type: 'text',
          data: `Completed by @${completedBy || 'someone'}`
        }
      ]
    };
  }
  
  /**
   * Task Due Soon notification
   */
  formatTaskDueSoon(notification) {
    const { task, hoursUntilDue } = notification;
    
    let urgencyText;
    if (hoursUntilDue <= 1) {
      urgencyText = '⚠️ Due in less than 1 hour!';
    } else if (hoursUntilDue <= 3) {
      urgencyText = `⏰ Due in ${hoursUntilDue} hours`;
    } else {
      urgencyText = `📅 Due in ${hoursUntilDue} hours`;
    }
    
    return {
      text: urgencyText,
      card: {
        title: `⏰ ${task.title}`,
        theme: 'modern-inline'
      },
      buttons: [
        {
          label: 'View Task',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'viewTaskDetails',
              taskId: task.id
            }
          }
        },
        {
          label: 'Complete Now',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'completeTask',
              taskId: task.id
            }
          }
        },
        {
          label: 'Snooze 1h',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'snoozeReminder',
              taskId: task.id,
              hours: 1
            }
          }
        }
      ]
    };
  }
  
  /**
   * Task Overdue notification
   */
  formatTaskOverdue(notification) {
    const { task, daysOverdue } = notification;
    
    return {
      text: `🔥 Task is ${daysOverdue} day(s) overdue!`,
      card: {
        title: `🔥 OVERDUE: ${task.title}`,
        theme: 'modern-inline'
      },
      buttons: [
        {
          label: 'Complete Now',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'completeTask',
              taskId: task.id
            }
          }
        },
        {
          label: 'Extend Deadline',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'extendDeadline',
              taskId: task.id
            }
          }
        }
      ]
    };
  }
  
  /**
   * Comment Added notification
   */
  formatCommentAdded(notification) {
    const { task, comment } = notification;
    
    return {
      text: `💬 New comment on "${task.title}"`,
      card: {
        title: `💬 ${comment.authorName}`,
        theme: 'modern-inline'
      },
      slides: [
        {
          type: 'text',
          data: comment.text.substring(0, 200) + (comment.text.length > 200 ? '...' : '')
        }
      ],
      buttons: [
        {
          label: 'View Task',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'viewTaskDetails',
              taskId: task.id
            }
          }
        },
        {
          label: 'Reply',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'replyToComment',
              taskId: task.id,
              commentId: comment.id
            }
          }
        }
      ]
    };
  }
  
  /**
   * Project Invite notification
   */
  formatProjectInvite(notification) {
    const { project, invitedBy } = notification;
    
    return {
      text: `📨 You've been invited to join a project!`,
      card: {
        title: `📁 ${project.name}`,
        theme: 'modern-inline'
      },
      slides: [
        {
          type: 'text',
          data: `Invited by ${invitedBy}`
        },
        {
          type: 'text',
          data: project.description || 'No description'
        }
      ],
      buttons: [
        {
          label: '✓ Accept',
          type: '+',
          action: {
            type: 'invoke.function',
            data: {
              name: 'acceptProjectInvite',
              projectId: project.id
            }
          }
        },
        {
          label: '✗ Decline',
          type: '-',
          action: {
            type: 'invoke.function',
            data: {
              name: 'declineProjectInvite',
              projectId: project.id
            }
          }
        }
      ]
    };
  }
  
  // Helper methods
  
  async getCliqMapping(userId) {
    const doc = await admin.firestore()
      .collection('cliq_user_mappings')
      .where('tasker_user_id', '==', userId)
      .limit(1)
      .get();
    
    return doc.empty ? null : doc.docs[0].data();
  }
  
  async getUserPreferences(userId) {
    const doc = await admin.firestore()
      .collection('users').doc(userId)
      .collection('settings').doc('notifications')
      .get();
    
    return doc.exists ? doc.data() : this.getDefaultPreferences();
  }
  
  getDefaultPreferences() {
    return {
      task_assigned: true,
      task_completed: true,
      task_due_soon: true,
      task_overdue: true,
      comment_added: true,
      project_invite: true,
      member_joined: true,
      quiet_hours: null
    };
  }
  
  shouldNotify(prefs, type) {
    // Check if notification type is enabled
    if (prefs[type] === false) return false;
    
    // Check quiet hours
    if (prefs.quiet_hours) {
      const now = new Date();
      const hour = now.getHours();
      const { start, end } = prefs.quiet_hours;
      
      if (start <= end) {
        if (hour >= start && hour < end) return false;
      } else {
        // Spans midnight
        if (hour >= start || hour < end) return false;
      }
    }
    
    return true;
  }
  
  async getProjectChannel(projectId) {
    const doc = await admin.firestore()
      .collection('project_channels')
      .doc(projectId)
      .get();
    
    return doc.exists ? doc.data() : null;
  }
  
  async logNotification(userId, notification) {
    await admin.firestore()
      .collection('notification_logs')
      .add({
        userId,
        type: notification.type,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        data: notification
      });
  }
  
  getPriorityIcon(priority) {
    const icons = {
      high: '⚡',
      medium: '🔵',
      low: '🟢'
    };
    return icons[priority] || '📋';
  }
  
  formatDate(timestamp) {
    if (!timestamp) return 'No due date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CliqNotifier();
```

**Acceptance Criteria**:
- [ ] User notifications sent correctly
- [ ] Channel notifications working
- [ ] All templates formatted nicely
- [ ] Preferences respected
- [ ] Errors handled gracefully

---

### 3.4 Task Event Notifications
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Implement all task-related notification flows

**Notification Types**:

| Event | Recipients | Message |
|-------|------------|---------|
| Task Created | Assignees | "📋 New task assigned: {title}" |
| Task Assigned | New assignee | "📋 You've been assigned: {title}" |
| Task Completed | Creator, Team | "✅ {user} completed {title}" |
| Task Due Soon | Assignees | "⏰ Due in {hours}h: {title}" |
| Task Overdue | Assignees | "🔥 {days}d overdue: {title}" |
| Task Updated | Assignees | "📝 {title} was updated" |
| Comment Added | Task participants | "💬 New comment on {title}" |

**Steps**:
- [ ] Implement task_created notification
- [ ] Implement task_assigned notification
- [ ] Implement task_completed notification
- [ ] Implement task_due_soon notification
- [ ] Implement task_overdue notification
- [ ] Implement comment_added notification
- [ ] Test all notification flows

**Acceptance Criteria**:
- [ ] All task events trigger notifications
- [ ] Correct recipients receive notifications
- [ ] Buttons work in notifications
- [ ] No duplicate notifications

---

### 3.5 Project Event Notifications
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Implement project-related notification flows

**Notification Types**:

| Event | Recipients | Message |
|-------|------------|---------|
| Project Created | Creator | "📁 Project created: {name}" |
| Member Invited | Invitee | "📨 Invited to: {project}" |
| Member Joined | Team | "👋 {user} joined {project}" |
| Member Left | Team | "👋 {user} left {project}" |
| Project Archived | Team | "📦 {project} was archived" |

**Steps**:
- [ ] Implement project_created notification
- [ ] Implement member_invited notification
- [ ] Implement member_joined notification
- [ ] Implement member_left notification
- [ ] Implement project_archived notification
- [ ] Test all project notifications

**Acceptance Criteria**:
- [ ] All project events trigger notifications
- [ ] Accept/Decline buttons work
- [ ] Team notified of member changes
- [ ] No spam on bulk operations

---

### 3.6 User Notification Preferences
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Allow users to customize their notification preferences

**Steps**:
- [ ] Create preferences data model
- [ ] Create backend endpoints for preferences
- [ ] Create Deluge function for preferences form
- [ ] Implement quiet hours
- [ ] Implement per-type toggles
- [ ] Implement per-project toggles

**Preferences Schema**:
```javascript
{
  userId: 'user123',
  enabled: true,
  
  // By notification type
  taskAssigned: true,
  taskCompleted: true,
  taskDueSoon: true,
  taskOverdue: true,
  commentAdded: true,
  projectInvite: true,
  memberJoined: false,
  
  // Quiet hours (optional)
  quietHours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8     // 8 AM
  },
  
  // Per-project overrides
  projectOverrides: {
    'project123': {
      enabled: false // Mute this project
    }
  },
  
  // DND mode
  doNotDisturb: {
    enabled: false,
    until: null
  }
}
```

**Backend Endpoints**:
```javascript
GET  /api/cliq/notifications/settings?userId=xxx
PUT  /api/cliq/notifications/settings
POST /api/cliq/notifications/mute-project
POST /api/cliq/notifications/dnd
```

**Cliq Command** - `/tasker notifications`:
```
┌─────────────────────────────────────────────────────────────┐
│  🔔 Notification Settings                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [✓] Task Assigned          [✓] Task Completed             │
│  [✓] Due Soon Reminders     [✓] Overdue Alerts             │
│  [✓] New Comments           [✓] Project Invites            │
│  [ ] Member Updates                                         │
│                                                             │
│  ⏰ Quiet Hours: 10 PM - 8 AM  [Edit]                       │
│                                                             │
│  [Save Changes]  [Enable DND for 1h]                        │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Users can toggle notification types
- [ ] Quiet hours respected
- [ ] Per-project muting works
- [ ] DND mode functional

---

### 3.7 Notification Formatting
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Create consistent, beautiful notification cards

**Steps**:
- [ ] Design notification card templates
- [ ] Implement card builder functions
- [ ] Add proper icons and colors
- [ ] Test on different devices
- [ ] Ensure accessibility

**Card Design Guidelines**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Icon] Title                                    [Timestamp] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Primary message text with context                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Additional details in a subtle box                  │    │
│ │ - Due: Tomorrow 3:00 PM                             │    │
│ │ - Priority: High                                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [Primary Action]  [Secondary Action]  [Dismiss]             │
└─────────────────────────────────────────────────────────────┘
```

**Color Coding**:
- 🔴 Red: Overdue, Critical
- 🟠 Orange: Due soon, Warning
- 🔵 Blue: New task, Info
- 🟢 Green: Completed, Success
- ⚫ Gray: Updates, Neutral

**Acceptance Criteria**:
- [ ] Cards look consistent
- [ ] Colors convey meaning
- [ ] Actions are clear
- [ ] Responsive on mobile

---

### 3.8 Testing & Monitoring
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Test notification flows and set up monitoring

**Steps**:
- [ ] Write unit tests for formatters
- [ ] Test all trigger scenarios
- [ ] Test preference filtering
- [ ] Set up monitoring dashboard
- [ ] Add alerting for failures
- [ ] Document troubleshooting

**Test Scenarios**:

| Scenario | Expected | Status |
|----------|----------|--------|
| Create task with assignee | Assignee gets notification | ⬜ |
| Complete task | Creator notified | ⬜ |
| Task due in 1 hour | Assignee notified | ⬜ |
| Task becomes overdue | Daily reminder sent | ⬜ |
| Add comment | Participants notified | ⬜ |
| Invite to project | Invitee notified | ⬜ |
| Accept invite | Team notified | ⬜ |
| User has notifications disabled | No notification sent | ⬜ |
| Quiet hours active | Notification queued | ⬜ |

**Monitoring**:
- Firebase Functions logs
- Notification delivery rate
- Error rate tracking
- Latency monitoring

**Acceptance Criteria**:
- [ ] All tests passing
- [ ] Monitoring in place
- [ ] Alerts configured
- [ ] Documentation complete

---

## 🔗 Dependencies

- **Requires**: Firebase project configured
- **Requires**: Cliq webhook set up
- **Requires**: User mapping working
- **Blocks**: Scheduled Automations (uses same notification system)
- **Blocks**: Channel Integration (uses channel notifications)

---

## 📚 Resources

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Zoho Cliq Webhooks](https://www.zoho.com/cliq/help/developer-guide/incoming-webhooks.html)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [░░░░░░░░░░] 0%

3.1 Webhook Setup   [░░░░░░░░░░] 0%
3.2 Cloud Functions [░░░░░░░░░░] 0%
3.3 Notifier Service[░░░░░░░░░░] 0%
3.4 Task Events     [░░░░░░░░░░] 0%
3.5 Project Events  [░░░░░░░░░░] 0%
3.6 Preferences     [░░░░░░░░░░] 0%
3.7 Formatting      [░░░░░░░░░░] 0%
3.8 Testing         [░░░░░░░░░░] 0%
```

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: Planning*
