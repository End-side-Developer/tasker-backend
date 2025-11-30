# Zoho Cliq Scripts - Folder Structure

This directory contains all Zoho Cliq bot scripts for the Tasker project.

## ⚠️ IMPORTANT: Security Notice

**This folder is git-ignored because it contains sensitive API keys and credentials.**

- Never commit these files to version control
- API keys are embedded in the scripts for Zoho Cliq bot functionality
- Keep this folder secure and private

## 📁 Folder Structure

```
cliq-scripts/
├── bot/                # Bot-specific handlers
│   └── menus/          # Bot menu handlers with native sub-menus (.dg)
│       ├── myTasks-menu-handler.dg      # 5 sub-menus inline
│       ├── newTask-menu-handler.dg      # 5 sub-menus inline
│       ├── dailyBriefing-menu-handler.dg # 5 sub-menus inline
│       ├── settings-menu-handler.dg      # 5 sub-menus inline
│       └── linkAccount-menu-handler.dg   # 5 sub-menus inline
│
├── commands/           # Slash command handlers (.dg)
│   ├── taskerProject-slash-command.dg
│   ├── tasker-slash-command.dg
│   └── taskerTask-slash-command.dg
│
├── handlers/           # Suggestion and event handlers (.dg)
│   ├── taskerProject-suggestion-handler.dg
│   ├── tasker-suggestion-handler.dg
│   └── taskerTask-suggestion-handler.dg
│
├── functions/          # Form handlers and functions (.dg)
│   ├── createProject-function.dg
│   ├── inviteMember-function.dg
│   ├── showCreateTaskFromMessageForm-function.dg
│   ├── submitTaskFromMessage-function.dg
│   ├── showAddNoteForm-function.dg
│   ├── submitAddNote-function.dg
│   └── inviteMemberChangeHandler.dg
│
├── message-actions/    # Message action handlers (.dg)
│   ├── createTaskFromMessage-action-handler.dg
│   └── addNoteToTask-action-handler.dg
│
├── schedulers/         # Scheduled task handlers (.dg)
│
└── README.md          # This file
```

## 📝 File Types

### Commands (`.dg` in `commands/`)
- **Purpose**: Handle slash commands like `/taskerproject`, `/tasker`
- **Examples**: `/taskerproject create`, `/taskerproject list`, `/taskerproject invite`
- **Upload to**: Zoho Cliq Bot → Message Actions → Slash Commands

### Bot Menus (`.dg` in `bot/menus/`)
- **Purpose**: Quick-access buttons displayed below the chat composer in bot DMs
- **Limit**: Maximum 5 menus per bot
- **Examples**: "📋 My Tasks", "➕ New Task", "☀️ Daily Briefing"
- **Upload to**: Zoho Cliq → Bots → TaskerBot → Edit Handlers → Menu

### Handlers (`.dg` in `handlers/`)
- **Purpose**: Provide autocomplete suggestions and handle user interactions
- **Examples**: Show suggestions when user types `/taskerproject cr...`
- **Upload to**: Zoho Cliq Bot → Message Actions → Slash Commands → Suggestions

### Functions (`.dg` in `functions/`)
- **Purpose**: Process form submissions and handle form changes
- **Examples**: Submit handler for invite form, change handler for dynamic fields
- **Upload to**: Zoho Cliq Bot → Functions

### Message Actions (`.dg` in `message-actions/`)
- **Purpose**: Allow users to perform actions on messages (right-click → Installed Apps)
- **Examples**: Create task from message, add message as note to existing task
- **Upload to**: Zoho Cliq Extension → Message Actions
- **How it works**: User selects a message → clicks "..." → Installed Apps → "Create Task" or "Add to Task"

## 🎯 Message Actions

Message Actions provide a powerful way to convert conversations into actionable tasks.

### Available Message Actions

| Action      | Handler File                              | Description                               |
| ----------- | ----------------------------------------- | ----------------------------------------- |
| Create Task | `createTaskFromMessage-action-handler.dg` | Convert a message into a new Tasker task  |
| Add to Task | `addNoteToTask-action-handler.dg`         | Add message as a note to an existing task |

### How Users Access Message Actions

1. **Single Message**: Hover over a message → Click "..." → Installed Apps → Select action
2. **Multiple Messages**: Select up to 25 messages → Same menu → Action applies to all
3. **Attachments**: Files attached to messages are captured in task description

### Message Action Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ User clicks     │ --> │ Action handler runs   │ --> │ Form displayed  │
│ "Create Task"   │     │ (extracts message)    │     │ (pre-filled)    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                                              │
                                                              v
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Task created    │ <-- │ Submit handler runs   │ <-- │ User submits    │
│ in Tasker       │     │ (calls backend API)   │     │ form            │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

### Setting Up Message Actions in Zoho Cliq

1. Go to **Zoho Cliq → Extensions → Your Extension → Message Actions**
2. Click **"Create Message Action"**
3. Configure:
   - **Name**: "Create Task" or "Add to Task"
   - **Description**: Brief explanation shown to users
   - **Handler**: Paste the action handler script
4. Link supporting functions from the Functions section
5. Save and test

## 🍔 Bot Menus (Native Sub-Menus Architecture)

Bot Menus provide quick-access buttons directly in the bot's chat interface. We use **Zoho Cliq's native sub-menu feature** for a cleaner UX - users click sub-menus directly instead of button responses!

### Architecture: 5 Menus × 5 Sub-Menus = 25 Actions

All sub-menu logic is **inline** in the menu handler using `target.get("name")` to detect which sub-menu was clicked.

```
┌─────────────────────────────────────────────────────┐
│  TaskerBot Menu Bar                                 │
├─────────────────────────────────────────────────────┤
│  [📋 My Tasks ▼] [➕ New Task ▼] [☀️ Briefing ▼]   │
│  [⚙️ Settings ▼] [🔗 Link Account ▼]                │
└─────────────────────────────────────────────────────┘
        │
        ▼ (Native sub-menu dropdown)
   ┌────────────────┐
   │ 📄 View All    │ ← sub_action = "view_all"
   │ 🔴 By Priority │ ← sub_action = "by_priority"
   │ 📅 Today       │ ← sub_action = "today"
   │ ⚠️ Overdue     │ ← sub_action = "overdue"
   │ 🔍 Search      │ ← sub_action = "search"
   └────────────────┘
```

### Code Pattern (in each menu handler)

```deluge
sub_action = target.get("name");

if(sub_action == "view_all") {
    // Handle view all tasks
}
if(sub_action == "by_priority") {
    // Handle by priority filter
}
// ... more conditions
```

### Complete Sub-Menu Map

#### 📋 My Tasks (`myTasks-menu-handler.dg`)
| Sub-Menu        | sub_action    | Description                        |
| --------------- | ------------- | ---------------------------------- |
| 📄 View All      | `view_all`    | List all pending/in-progress tasks |
| 🔴 By Priority   | `by_priority` | Tasks grouped by priority          |
| 📅 Today's Tasks | `today`       | Tasks due today                    |
| ⚠️ Overdue       | `overdue`     | Overdue tasks                      |
| 🔍 Search        | `search`      | Search tasks by keyword            |

#### ➕ New Task (`newTask-menu-handler.dg`)
| Sub-Menu        | sub_action      | Description                     |
| --------------- | --------------- | ------------------------------- |
| ⚡ Quick Task    | `quick`         | Create with just a title        |
| 📝 Detailed Task | `detailed`      | Full form with all fields       |
| 🔴 Urgent Task   | `urgent`        | Pre-set urgent priority         |
| 📅 Due Today     | `due_today`     | Pre-set due date to today       |
| 🔔 With Reminder | `with_reminder` | Task with reminder notification |

#### ☀️ Daily Briefing (`dailyBriefing-menu-handler.dg`)
| Sub-Menu          | sub_action  | Description                    |
| ----------------- | ----------- | ------------------------------ |
| 📅 Today's Summary | `today`     | Full today briefing            |
| 📆 Week Ahead      | `week`      | Tasks for next 7 days          |
| 📊 My Stats        | `stats`     | Productivity statistics        |
| 📁 Projects        | `projects`  | Project overview with progress |
| ⏰ Deadlines       | `deadlines` | Upcoming deadlines sorted      |

#### ⚙️ Settings (`settings-menu-handler.dg`)
| Sub-Menu           | sub_action      | Description                              |
| ------------------ | --------------- | ---------------------------------------- |
| 🔔 Notifications    | `notifications` | Uses existing `editNotificationSettings` |
| 🌙 Do Not Disturb   | `dnd`           | DND mode options                         |
| 🎯 Default Priority | `priority`      | Set default task priority                |
| 👤 Account Info     | `account`       | View linked account details              |
| 🔓 Unlink Account   | `unlink`        | Disconnect accounts (with confirm)       |

#### 🔗 Link Account (`linkAccount-menu-handler.dg`)
| Sub-Menu       | sub_action     | Description                  |
| -------------- | -------------- | ---------------------------- |
| 🔗 Link Now     | `link_now`     | Uses existing `showLinkForm` |
| ✅ Check Status | `status`       | View link status             |
| 🔄 Re-link      | `relink`       | Switch to different account  |
| ❓ How It Works | `help`         | Step-by-step guide           |
| 🔧 Troubleshoot | `troubleshoot` | Common issues & fixes        |

### Key Benefits of Native Sub-Menus

✅ **Cleaner UX** - Users see sub-menus directly, no extra button clicks
✅ **Less Code** - All logic in one file per menu (no 25 separate functions)
✅ **Faster** - No additional function invocations
✅ **Easier Maintenance** - Single file to update per menu
✅ **Reuses Existing Functions** - `showLinkForm`, `editNotificationSettings`, `submitCreateTask`

### Setting Up in Zoho Cliq

1. **Add Main Menu** (5 total)
   - Go to Zoho Cliq → Bots → TaskerBot → Edit Handlers
   - Click "Add Menu" → Name: e.g., "📋 My Tasks"
   - Paste code from corresponding `bot/menus/*.dg` file

2. **Add Sub-Menus** (5 per menu)
   - Under each main menu, click "Add Sub-menu"
   - Name must match `sub_action` values exactly!
   - Example for My Tasks:
     - Sub-menu 1: Name = `view_all`, Label = "📄 View All"
     - Sub-menu 2: Name = `by_priority`, Label = "🔴 By Priority"
     - etc.

3. **Test the Flow**
   - Click main menu → Native dropdown appears
   - Click sub-menu → Handler executes matching if-block

### Bot Menu Limits
- **Maximum 5 menus** per bot ✅ (we're using all 5!)
- Native sub-menus appear as dropdown when menu is clicked
- Each sub-menu triggers the same handler with different `sub_action` value

## 🔧 Configuration

All scripts use the following configuration:

```deluge
BASE_URL = "https://tasker-backend-b10p.onrender.com/api/cliq/commands";
API_KEY = "your_api_key_here";
```

**Remember to update the API_KEY** when rotating credentials.

## 📚 Documentation

For detailed information about form handlers and patterns, see:
- `docs/ZOHO_CLIQ_FORMS_GUIDE.md` - Comprehensive guide to Zoho Cliq forms and handlers

## 🚀 Deployment

1. Open Zoho Cliq → Bots → Your Bot
2. Navigate to the appropriate section:
   - Commands → Upload command scripts
   - Functions → Upload function scripts
3. Test each command after deployment

## 🔄 Update Workflow

1. Edit scripts locally in VS Code
2. Test changes in Zoho Cliq (cannot run locally)
3. Keep this folder structure for organization
4. **Never commit to git** - folder is auto-ignored

## 📋 Available Commands

### Project Management
- `/taskerproject create` - Create new project
- `/taskerproject list` - List all projects
- `/taskerproject invite` - Invite member to project
- `/taskerproject details` - View project details
- `/taskerproject members` - View project members
- `/taskerproject delete` - Delete a project

### Task Management
- `/taskertask create` - Create new task
- `/taskertask list` - List all tasks
- `/taskertask assign` - Assign task to member
- `/taskertask complete` - Mark task as complete
- `/taskertask delete` - Delete a task

## ⏰ Schedulers

Schedulers are located in `schedulers/` folder and automate routine notifications.

### Available Schedulers

| Scheduler      | File                             | Schedule       | Description                          |
| -------------- | -------------------------------- | -------------- | ------------------------------------ |
| Daily Reminder | `dailyTaskReminder-scheduler.dg` | Daily 9:00 AM  | Sends pending/overdue task reminders |
| Weekly Digest  | `weeklyDigest-scheduler.dg`      | Monday 9:00 AM | Sends weekly productivity summary    |

### Setting Up Schedulers in Zoho Cliq

1. **Navigate to Extension Settings**
   - Go to Zoho Cliq → Admin Settings → Extensions
   - Select your Tasker extension

2. **Create a Scheduler**
   - Click "Schedulers" → "Create Scheduler"
   - Name: `Daily Task Reminder` or `Weekly Digest`
   - Copy script content from respective `.dg` file

3. **Configure Recurrence**
   - **Daily Reminder**: Every day at 9:00 AM
   - **Weekly Digest**: Every Monday at 9:00 AM
   - Set timezone to your organization's timezone

4. **Enable and Test**
   - Save the scheduler
   - Use "Run Now" to test immediately
   - Check Cliq bot DMs for messages

### Scheduler Limits
- Maximum 4 schedulers per extension
- Minimum interval: 1 hour for custom schedules

## 🔗 Related Files

- Backend API: `src/controllers/cliqCommandController.js`
- Routes: `src/routes/cliqCommandRoutes.js`
- Scheduler Endpoints: `/api/cliq/scheduler/daily-reminders`, `/api/cliq/scheduler/weekly-digest`
- Documentation: `docs/ZOHO_CLIQ_FORMS_GUIDE.md`

## 📝 File Extension: .dg

All Deluge scripts use `.dg` extension for:
- Better IDE syntax highlighting
- Clear distinction from other files
- Consistent naming convention
- Easier file filtering

---

**Last Updated**: November 30, 2025