# Phase 1 Implementation Guide - Advanced Slash Commands

## ✅ Completed (As of Nov 22, 2025)

### Backend Implementation
- [x] Created `cliqCommandController.js` with 8 command handlers
- [x] Created `cliqCommandRoutes.js` for command routing
- [x] Created `cardFormatter.js` utility for rich card responses
- [x] Integrated routes into main router
- [x] Deployed to Render

### Slash Command Implementation  
- [x] Created `cliq-slash-command-advanced.ds` with advanced parsing
- [x] Implemented 10+ commands with parameters
- [x] Added help system

### Commands Ready
1. ✅ `/tasker create` - Create task with parameters
2. ✅ `/tasker list` - List tasks with filters
3. ✅ `/tasker my tasks` - Show assigned tasks
4. ✅ `/tasker complete` - Mark task complete
5. ✅ `/tasker assign` - Assign task to user
6. ✅ `/tasker search` - Search tasks
7. ✅ `/tasker projects` - List projects
8. ✅ `/tasker project create` - Create project
9. ✅ `/tasker overdue` - Show overdue tasks

---

## 📋 What YOU Need to Do Now

### Step 1: Deploy Backend Updates ⚡ (5 minutes)

1. **Commit and push code to GitHub:**
```powershell
cd "E:\AndroidStudioProjects\Tasker by Mantra\Tasker Backend"
git add .
git commit -m "feat: Add advanced Cliq command endpoints and handlers"
git push origin main
```

2. **Render will auto-deploy** (wait 2-3 minutes)
   - Go to: https://dashboard.render.com
   - Watch the deployment log
   - Wait for "Deploy live" message

3. **Verify deployment:**
```powershell
# Test health check
Invoke-RestMethod -Uri "https://tasker-backend-b10p.onrender.com/api/health"

# Test info endpoint (should show new commands endpoint)
Invoke-RestMethod -Uri "https://tasker-backend-b10p.onrender.com/api/info"
```

---

### Step 2: Update Zoho Cliq Slash Command 🔧 (10 minutes)

1. **Go to Zoho Cliq Developer Console**
   - URL: https://cliq.zoho.com/company/devapp
   - Or: Cliq → Menu (☰) → Bots & Tools → Slash Commands

2. **Find your `/tasker` command**
   - Click on it to edit

3. **Replace ALL the code** with the new version:
   - Open: `E:\AndroidStudioProjects\Tasker by Mantra\Tasker Backend\cliq-slash-command-advanced.ds`
   - Copy all content (Ctrl+A, Ctrl+C)
   - Paste into Cliq editor (replace everything)

4. **Save and Publish**
   - Click **Save**
   - Click **Publish** or **Update**

---

### Step 3: Test Commands in Cliq 🧪 (15 minutes)

#### Test 1: Create Task
```
/tasker create "Test task from advanced command" priority:high due:2025-12-01
```
**Expected:** ✅ Task created card with details

#### Test 2: List Tasks
```
/tasker list status:pending
```
**Expected:** 📋 List of pending tasks

#### Test 3: My Tasks
```
/tasker my tasks
```
**Expected:** Your assigned tasks

#### Test 4: Search
```
/tasker search "test"
```
**Expected:** 🔍 Search results

#### Test 5: Create Project
```
/tasker project create "Test Project"
```
**Expected:** ✅ Project created

#### Test 6: List Projects
```
/tasker projects
```
**Expected:** 📁 Your projects list

---

### Step 4: Create Firestore Collections 🗄️ (10 minutes)

Your backend expects these Firestore collections. Let's create them:

1. **Go to Firebase Console**
   - URL: https://console.firebase.google.com
   - Select your project

2. **Go to Firestore Database**
   - Left menu → Firestore Database

3. **Create Collections** (if they don't exist):

   **a) Create `tasks` collection:**
   - Click **Start collection**
   - Collection ID: `tasks`
   - Add first document:
     - Document ID: (auto-generate)
     - Fields:
       ```
       taskId: "task_test_001"
       title: "Sample Task"
       status: "pending"
       priority: "medium"
       createdBy: "test_user"
       createdByName: "Test User"
       createdAt: (timestamp - now)
       updatedAt: (timestamp - now)
       ```

   **b) Create `projects` collection:**
   - Click **Start collection**
   - Collection ID: `projects`
   - Add first document:
     - Document ID: (auto-generate)
     - Fields:
       ```
       projectId: "proj_test_001"
       name: "Sample Project"
       ownerId: "test_user"
       ownerName: "Test User"
       members: ["test_user"] (array)
       createdAt: (timestamp - now)
       ```

   **c) Create `invitations` collection:**
   - Click **Start collection**
   - Collection ID: `invitations`
   - Add first document:
     - Document ID: (auto-generate)
     - Fields:
       ```
       invitationId: "inv_test_001"
       projectId: "proj_test_001"
       status: "pending"
       createdAt: (timestamp - now)
       ```

4. **Update Firestore Security Rules:**
   
   Go to **Firestore Database → Rules** and add:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write for authenticated users
       match /tasks/{taskId} {
         allow read, write: if request.auth != null;
       }
       
       match /projects/{projectId} {
         allow read, write: if request.auth != null;
       }
       
       match /invitations/{invitationId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   - Click **Publish**

---

### Step 5: Test End-to-End Flow 🎯 (10 minutes)

#### Full Workflow Test:

1. **Create a project:**
```
/tasker project create "Marketing Campaign"
```

2. **Create a task in that project:**
```
/tasker create "Design landing page" priority:high
```

3. **List your tasks:**
```
/tasker my tasks
```

4. **Search for the task:**
```
/tasker search "landing"
```

5. **Complete the task:**
```
/tasker complete task_<id_from_step_2>
```

6. **List projects:**
```
/tasker projects
```

---

## 🐛 Troubleshooting

### Issue: "Failed to connect to Tasker Backend"

**Solutions:**
1. Check if backend is running:
   ```powershell
   Invoke-RestMethod -Uri "https://tasker-backend-b10p.onrender.com/api/health"
   ```

2. Check Render logs:
   - Go to Render dashboard
   - Click on your service
   - View logs

3. Verify API key in Cliq code matches your `.env` file

### Issue: "Task not found" or "Project not found"

**Solutions:**
1. Make sure Firestore collections exist
2. Check Firestore security rules allow read/write
3. Verify task/project IDs are correct

### Issue: "Authentication failed"

**Solutions:**
1. Check if Firebase credentials are set in Render environment variables
2. Verify API key is correct
3. Check if user has permission in Firestore rules

### Issue: Commands show help text instead of working

**Solutions:**
1. Check command syntax (case-sensitive)
2. Make sure you updated the Cliq slash command code
3. Verify Cliq bot is published

---

## 📊 Progress Tracking

Use this checklist to track your implementation:

### Backend Deployment
- [ ] Code committed to GitHub
- [ ] Render auto-deployment completed
- [ ] Health check endpoint works
- [ ] Info endpoint shows new routes

### Cliq Configuration  
- [ ] Slash command code updated
- [ ] Command saved in Cliq
- [ ] Command published

### Firestore Setup
- [ ] `tasks` collection created
- [ ] `projects` collection created
- [ ] `invitations` collection created
- [ ] Security rules updated

### Testing
- [ ] Create task works
- [ ] List tasks works
- [ ] My tasks works
- [ ] Search works
- [ ] Create project works
- [ ] List projects works
- [ ] Complete task works
- [ ] Assign task works

### Integration Tests
- [ ] Full workflow tested (create → assign → complete)
- [ ] Rich cards display correctly
- [ ] Error messages are clear
- [ ] Help command works

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ All commands return proper responses (not errors)
2. ✅ Rich cards display with proper formatting
3. ✅ Tasks are visible in Firestore after creation
4. ✅ Projects can be created and listed
5. ✅ Search finds relevant tasks
6. ✅ Assignment and completion work correctly

---

## 📚 Next Steps (Phase 2)

Once Phase 1 is complete and tested:

1. **Interactive Bot** - Natural language task creation
2. **Notifications** - Automatic alerts for assignments
3. **Channel Integration** - Auto-post updates to channels
4. **Rich Cards** - More interactive buttons and actions

---

## 💡 Tips

1. **Test incrementally** - Test each command one by one
2. **Check logs** - Always check Render logs for errors
3. **Use Firestore console** - Verify data is being saved
4. **Take screenshots** - Document successful tests
5. **Keep notes** - Write down any issues you encounter

---

## 📞 Need Help?

If you encounter issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Check Render deployment logs
4. Verify Firestore data exists
5. Test API endpoints directly using PowerShell

---

**Last Updated:** November 22, 2025  
**Status:** ✅ Ready for Deployment  
**Estimated Time:** 45-60 minutes total
