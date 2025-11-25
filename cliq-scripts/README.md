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
│   └── cliq-slash-command.dg
│
├── handlers/           # Suggestion and event handlers (.dg)
│   ├── taskerProject-suggestion-handler.dg
│   ├── tasker-suggestion-handler.dg
│   └── slash-tasker-suggestion-script.dg
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
- `/taskerproject details` - View project details (coming soon)
- `/taskerproject members` - View project members (coming soon)

### Task Management
- `/tasker create` - Create new task
- `/tasker list` - List all tasks
- `/tasker assign` - Assign task to member
- `/tasker complete` - Mark task as complete

## 🔗 Related Files

- Backend API: `src/controllers/cliqCommandController.js`
- Routes: `src/routes/cliqCommandRoutes.js`
- Documentation: `docs/ZOHO_CLIQ_FORMS_GUIDE.md`

## 📝 File Extension: .dg

All Deluge scripts use `.dg` extension for:
- Better IDE syntax highlighting
- Clear distinction from other files
- Consistent naming convention
- Easier file filtering

---

**Last Updated**: November 25, 2025
