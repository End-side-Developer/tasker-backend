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
│   └── inviteMemberChangeHandler.dg
│
└── README.md          # This file
```

## 📝 File Types

### Commands (`.dg` in `commands/`)
- **Purpose**: Handle slash commands like `/taskerproject`, `/tasker`
- **Examples**: `/taskerproject create`, `/taskerproject list`, `/taskerproject invite`
- **Upload to**: Zoho Cliq Bot → Message Actions → Slash Commands

### Handlers (`.dg` in `handlers/`)
- **Purpose**: Provide autocomplete suggestions and handle user interactions
- **Examples**: Show suggestions when user types `/taskerproject cr...`
- **Upload to**: Zoho Cliq Bot → Message Actions → Slash Commands → Suggestions

### Functions (`.dg` in `functions/`)
- **Purpose**: Process form submissions and handle form changes
- **Examples**: Submit handler for invite form, change handler for dynamic fields
- **Upload to**: Zoho Cliq Bot → Functions

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

**Last Updated**: November 29, 2025