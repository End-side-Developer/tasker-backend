# Quick Reference - Tasker Cliq Commands

## 🚀 Quick Start Checklist

```
[ ] 1. Deploy backend (git push)
[ ] 2. Update Cliq command code
[ ] 3. Create Firestore collections
[ ] 4. Test commands
```

---

## 📝 Command Syntax Reference

### Task Management
```bash
# Create task
/tasker create "Task title" priority:high due:2025-12-01 tags:bug,urgent

# List tasks
/tasker list status:pending priority:high
/tasker list project:proj_123

# My tasks
/tasker my tasks

# Complete task
/tasker complete task_abc123

# Assign task
/tasker assign task_abc123 @username

# Search tasks
/tasker search "keyword"
/tasker search "login bug"
```

### Project Management
```bash
# List projects
/tasker projects

# Create project
/tasker project create "Project Name"
```

### Quick Filters
```bash
# Overdue tasks
/tasker overdue

# Help
/tasker
```

---

## 🎯 Testing Script

Copy and paste these commands one by one in Cliq:

```
# 1. Create a project
/tasker project create "Test Project"

# 2. Create a high-priority task
/tasker create "Urgent: Fix login bug" priority:high

# 3. Create a normal task
/tasker create "Update documentation" priority:medium

# 4. List all tasks
/tasker list

# 5. List only high priority
/tasker list priority:high

# 6. My tasks
/tasker my tasks

# 7. Search for a task
/tasker search "login"

# 8. Get task ID from previous results, then complete it
/tasker complete task_[ID_HERE]

# 9. List projects
/tasker projects

# 10. Show help
/tasker
```

---

## 🔧 API Endpoints

Base URL: `https://tasker-backend-b10p.onrender.com/api/cliq/commands`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/create-task` | Create new task |
| GET | `/list-tasks` | List tasks with filters |
| POST | `/assign-task` | Assign task to user |
| POST | `/complete-task` | Mark task complete |
| GET | `/search` | Search tasks |
| POST | `/create-project` | Create project |
| GET | `/list-projects` | List projects |
| POST | `/invite-member` | Send invitation |

---

## 📊 Expected Response Format

### Success Response
```json
{
  "success": true,
  "message": "✅ Task created successfully!",
  "data": { ... },
  "card": { ... },
  "text": "✅ Task created: \"Task title\""
}
```

### Error Response
```json
{
  "success": false,
  "message": "❌ Error description",
  "text": "❌ User-friendly error message"
}
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to connect" | Check if backend is deployed: `https://tasker-backend-b10p.onrender.com/api/health` |
| "Task not found" | Verify Firestore collections exist |
| "Authentication failed" | Check API key in Cliq code matches .env |
| No response | Check Render logs for errors |
| Commands don't work | Verify Cliq command code was updated |

---

## ✅ Deployment Checklist

### Backend
- [ ] Code changes committed
- [ ] Pushed to GitHub
- [ ] Render deployment completed
- [ ] Health check works: `/api/health`
- [ ] Info shows new routes: `/api/info`

### Cliq
- [ ] Opened Cliq Developer Console
- [ ] Found `/tasker` command
- [ ] Replaced with `cliq-slash-command-advanced.ds`
- [ ] Saved changes
- [ ] Published command

### Firestore
- [ ] Created `tasks` collection
- [ ] Created `projects` collection  
- [ ] Created `invitations` collection
- [ ] Updated security rules

### Testing
- [ ] `/tasker` shows help
- [ ] Create task works
- [ ] List tasks works
- [ ] My tasks works
- [ ] Search works
- [ ] Complete works
- [ ] Assign works
- [ ] Create project works
- [ ] List projects works

---

## 📁 Files Created

```
Tasker Backend/
├── src/
│   ├── controllers/
│   │   └── cliqCommandController.js ✅ NEW
│   ├── routes/
│   │   ├── cliqCommandRoutes.js ✅ NEW
│   │   └── index.js ✅ UPDATED
│   └── utils/
│       └── cardFormatter.js ✅ NEW
├── docs/
│   ├── CLIQ_INTEGRATION_ROADMAP.md ✅ UPDATED
│   └── PHASE_1_DEPLOYMENT_GUIDE.md ✅ NEW
└── cliq-slash-command-advanced.ds ✅ NEW
```

---

## 🎉 Success Indicators

You're done when:

✅ All commands return responses (not errors)  
✅ Rich cards display properly  
✅ Tasks appear in Firestore  
✅ Projects can be created  
✅ Search finds tasks  
✅ Complete/assign work  

---

**Quick Links:**
- Backend: https://tasker-backend-b10p.onrender.com
- Cliq Console: https://cliq.zoho.com/company/devapp
- Firebase Console: https://console.firebase.google.com
- Render Dashboard: https://dashboard.render.com

---

**Need the full guide?** See: `PHASE_1_DEPLOYMENT_GUIDE.md`
