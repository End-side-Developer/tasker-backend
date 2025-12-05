# 🗄️ Database Schema

Firestore collections and data models.

---

## Collections Overview

| Collection           | Purpose                  |
| -------------------- | ------------------------ |
| `users`              | User profiles            |
| `tasks`              | Task documents           |
| `projects`           | Project containers       |
| `cliq_user_mappings` | Cliq ↔ Tasker user links |

---

## Users Collection

`/users/{userId}`

### Document Structure

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  email: string;                 // User email
  displayName: string;           // Display name
  photoURL?: string;             // Profile photo URL
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    defaultProject?: string;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### Example

```json
{
  "id": "user_abc123",
  "email": "john@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "defaultProject": "project_xyz"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-12-05T10:00:00Z",
  "lastLoginAt": "2025-12-05T08:00:00Z"
}
```

---

## Tasks Collection

`/tasks/{taskId}`

### Document Structure

```typescript
interface Task {
  id: string;                    // Auto-generated ID
  userId: string;                // Owner user ID
  
  // Core fields
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Organization
  projectId?: string;            // Parent project
  tags?: string[];
  
  // Scheduling
  dueDate?: Timestamp;
  reminderAt?: Timestamp;
  
  // Collaboration
  assignees?: string[];          // User IDs
  
  // Completion
  completedAt?: Timestamp;
  completedBy?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Cliq context (if created from Cliq)
  cliqContext?: {
    userId: string;
    userName: string;
    channelId?: string;
    messageId?: string;
  };
}
```

### Example

```json
{
  "id": "task_abc123",
  "userId": "user_xyz789",
  "title": "Review pull request",
  "description": "Check the new feature branch for issues",
  "status": "pending",
  "priority": "high",
  "projectId": "project_sprint5",
  "tags": ["code-review", "urgent"],
  "dueDate": "2025-12-10T10:00:00Z",
  "assignees": ["user_xyz789"],
  "createdAt": "2025-12-05T08:30:00Z",
  "cliqContext": {
    "userId": "cliq_user_123",
    "userName": "John Doe",
    "channelId": "channel_dev"
  }
}
```

### Indexes

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Projects Collection

`/projects/{projectId}`

### Document Structure

```typescript
interface Project {
  id: string;
  userId: string;                // Owner
  
  // Core fields
  name: string;
  description?: string;
  color?: string;                // Hex color
  icon?: string;                 // Emoji or icon name
  
  // Status
  status: 'active' | 'archived' | 'completed';
  
  // Collaboration
  members?: ProjectMember[];
  
  // Stats (denormalized)
  taskCount: number;
  completedTaskCount: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface ProjectMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Timestamp;
}
```

### Example

```json
{
  "id": "project_sprint5",
  "userId": "user_xyz789",
  "name": "Sprint 5",
  "description": "Q4 feature development",
  "color": "#4A90D9",
  "icon": "🚀",
  "status": "active",
  "members": [
    {
      "userId": "user_xyz789",
      "role": "owner",
      "addedAt": "2025-12-01T00:00:00Z"
    }
  ],
  "taskCount": 15,
  "completedTaskCount": 8,
  "createdAt": "2025-12-01T00:00:00Z"
}
```

---

## Cliq User Mappings Collection

`/cliq_user_mappings/{mappingId}`

### Document Structure

```typescript
interface CliqUserMapping {
  id: string;
  
  // Cliq user info
  cliqUserId: string;            // Zoho Cliq user ID
  cliqUserName: string;
  cliqEmail?: string;
  
  // Tasker user link
  taskerId: string;              // Firebase user ID
  
  // Metadata
  linkedAt: Timestamp;
  lastUsedAt?: Timestamp;
}
```

### Example

```json
{
  "id": "mapping_abc123",
  "cliqUserId": "cliq_user_456",
  "cliqUserName": "John Doe",
  "cliqEmail": "john@company.com",
  "taskerId": "user_xyz789",
  "linkedAt": "2025-12-01T10:00:00Z",
  "lastUsedAt": "2025-12-05T08:30:00Z"
}
```

### Indexes

```javascript
// Index for fast user lookup
{
  "collectionGroup": "cliq_user_mappings",
  "fields": [
    { "fieldPath": "cliqUserId", "order": "ASCENDING" }
  ]
}
```

---

## Subcollections

### Task Subtasks

`/tasks/{taskId}/subtasks/{subtaskId}`

```typescript
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
  order: number;
}
```

### Task Comments

`/tasks/{taskId}/comments/{commentId}`

```typescript
interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## Data Access Patterns

### Query: User's Pending Tasks

```javascript
const getPendingTasks = async (userId) => {
  const snapshot = await db.collection('tasks')
    .where('userId', '==', userId)
    .where('status', '==', 'pending')
    .orderBy('dueDate', 'asc')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
};
```

### Query: Tasks Due Today

```javascript
const getTodaysTasks = async (userId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const snapshot = await db.collection('tasks')
    .where('userId', '==', userId)
    .where('dueDate', '>=', startOfDay)
    .where('dueDate', '<=', endOfDay)
    .get();
  
  return snapshot.docs.map(doc => doc.data());
};
```

### Query: Map Cliq User

```javascript
const getTaskerId = async (cliqUserId) => {
  const snapshot = await db.collection('cliq_user_mappings')
    .where('cliqUserId', '==', cliqUserId)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  return snapshot.docs[0].data().taskerId;
};
```

---

## Timestamps

Firestore uses Timestamp objects. Convert for API responses:

```javascript
const formatTask = (task) => ({
  ...task,
  createdAt: task.createdAt?.toDate?.()?.toISOString() || task.createdAt,
  dueDate: task.dueDate?.toDate?.()?.toISOString() || task.dueDate
});
```

---

## Related Docs

- [Project Structure](./project-structure.md) - Codebase layout
- [Security](./security.md) - Firestore rules
- [Schema Migration](../SCHEMA_MIGRATION.md) - Migration history

---

<div align="center">

**[← Project Structure](./project-structure.md)** | **[Security →](./security.md)**

</div>
