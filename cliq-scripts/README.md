# Tasker Zoho Cliq Scripts

This folder contains all Deluge scripts for Tasker's Zoho Cliq integration.

## 📁 Files

### 1. `tasker-slash-command.ds`
**Purpose:** Main slash command handler for `/tasker`

**Setup in Zoho Cliq:**
1. Go to https://cliq.zoho.com/company/devapp
2. Click "Create Command" or edit existing `/tasker` command
3. Set command name: `tasker`
4. Copy entire content from `tasker-slash-command.ds`
5. Paste into the "Handler" section
6. Click "Save"

**Commands Supported:**
- `/tasker create "title" priority:high due:2025-12-31` - Create task
- `/tasker list status:pending` - List tasks with filters
- `/tasker my tasks` - Show assigned tasks
- `/tasker complete <task_id>` - Mark complete
- `/tasker assign <task_id> @user` - Assign task
- `/tasker search "keyword"` - Search tasks
- `/tasker projects` - List projects
- `/tasker project create "name"` - Create project
- `/tasker overdue` - Show overdue tasks

### 2. `tasker-suggestion-handler.ds`
**Purpose:** Smart suggestions that appear when typing `/tasker`

**Setup in Zoho Cliq:**
1. Go to https://cliq.zoho.com/company/devapp
2. Edit your `/tasker` command
3. Click "Add Suggestion Handler"
4. Copy entire content from `tasker-suggestion-handler.ds`
5. Paste into the "Suggestion Handler" section
6. Click "Save"

**Features:**
- Shows 10 helpful command suggestions with images
- Displays as users type `/tasker`
- Includes example syntax for each command
- Visual GIF icons for better UX

## 🚀 Quick Setup Guide

### Step 1: Create Slash Command
```bash
1. Open Zoho Cliq Developer Console
2. Navigate to "Commands" section
3. Click "Create Command"
4. Name: tasker
5. Description: Task management for your team
6. Usage Hint: create, list, my tasks, complete, assign, search, projects
```

### Step 2: Add Command Handler
```bash
1. In the command editor, find "Handler" section
2. Copy all code from tasker-slash-command.ds
3. Paste into Handler textarea
4. Verify BASE_URL and API_KEY are correct
5. Click "Save"
```

### Step 3: Add Suggestion Handler
```bash
1. In the same command editor, find "Suggestion Handler" section
2. Click "Add Suggestion Handler"
3. Copy all code from tasker-suggestion-handler.ds
4. Paste into Suggestion Handler textarea
5. Click "Save"
```

### Step 4: Test the Command
```bash
1. Open any Cliq channel or chat
2. Type /tasker and press space
3. You should see 10 suggestion cards appear
4. Try: /tasker create "Test task" priority:high
5. Verify task creation response
```

## 🔧 Configuration

### Backend URL
Current: `https://tasker-backend-b10p.onrender.com/api/cliq/commands`

To change:
1. Open `tasker-slash-command.ds`
2. Update `BASE_URL` variable (line 18)
3. Save and redeploy to Cliq

### API Key
Current: `34a8176cd72297093e2b349a6fb9b2443dffb51d8291cfe6711063cb4b6eafb3`

To change:
1. Generate new key in backend `.env` file
2. Update `API_KEY` variable in `tasker-slash-command.ds` (line 19)
3. Save and redeploy to Cliq

## 📝 Deluge Constraints

**Important limitations to remember:**
- ❌ No function definitions allowed (use inline code only)
- ❌ No `split()` method (use `indexOf()` + `subString()`)
- ❌ Limited variable scope (channel context not always available)
- ✅ Use `Map()` and `List()` for data structures
- ✅ Use `invokeUrl` for API calls
- ✅ Use `for each` loops for iteration

## 🐛 Troubleshooting

### Error: "Variable 'channel' is not defined"
**Solution:** Already fixed - using empty string for channelId

### Error: "Not able to find 'split' function"
**Solution:** Already fixed - using `indexOf()` and `subString()`

### Error: "Function definitions are not supported"
**Solution:** All helper logic is inlined, no function definitions

### API Returns 401/403
**Solution:** Check API_KEY matches backend environment variable

### Backend not responding
**Solution:** 
1. Check Render deployment status
2. Verify backend URL is correct
3. Check Firebase initialization

## 📚 Additional Resources

- [Zoho Cliq Developer Docs](https://www.zoho.com/cliq/help/platform/slash-commands.html)
- [Deluge Script Reference](https://www.zoho.com/deluge/help/)
- [Tasker Backend API Docs](../docs/API_INTEGRATION.md)
- [Phase 1 Deployment Guide](../docs/PHASE_1_DEPLOYMENT_GUIDE.md)

## ✅ Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Firebase collections created (tasks, projects, invitations)
- [ ] API_KEY matches backend .env
- [ ] BASE_URL points to production server
- [ ] Slash command handler copied to Cliq
- [ ] Suggestion handler copied to Cliq
- [ ] Command tested with `/tasker`
- [ ] Suggestions appear when typing
- [ ] Task creation works
- [ ] Task listing works
- [ ] All 10 commands tested

## 🎯 Next Steps

After deploying these scripts:
1. Create Firestore collections (tasks, projects, invitations)
2. Update Firestore security rules
3. Test all commands thoroughly
4. Proceed to Phase 2: Interactive Cards & Buttons
5. Implement message actions
6. Add bot notifications

---

**Last Updated:** November 23, 2025
**Backend Version:** 1.0.0
**Cliq Integration:** Phase 1 Complete
