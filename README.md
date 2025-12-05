# Tasker Backend

Node.js backend for Tasker Zoho Cliq integration. Provides REST API endpoints for task management and handles bidirectional synchronization with Zoho Cliq.

---

## 📚 Documentation

**[→ Full Documentation](./docs/README.md)**

| Quick Links                                                        |                        |
| ------------------------------------------------------------------ | ---------------------- |
| [🚀 Quick Start](./docs/getting-started/quick-start.md)             | Get running in minutes |
| [🔧 Environment Setup](./docs/getting-started/environment-setup.md) | Configure .env         |
| [🔌 API Reference](./docs/api/overview.md)                          | Endpoints & usage      |
| [🔗 Zoho Cliq Guide](./docs/zoho-cliq/overview.md)                  | Cliq integration       |

---

## 🚀 Features

- **Task Management API** - Create, read, update, delete tasks
- **Zoho Cliq Integration** - Slash commands, bot, webhooks, widgets
- **Firebase Backend** - Firestore database integration
- **User Mapping** - Link Cliq users to Tasker accounts
- **Dual Authentication** - API key + OAuth 2.0 with JWT tokens
- **Security** - Rate limiting, input validation, CORS protection

---

## 📁 Project Structure

```
Tasker Backend/
├── src/
│   ├── server.js           # Entry point
│   ├── config/             # Firebase, OAuth, JWT, Logger
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, rate limit, errors
│   ├── routes/             # API routes
│   └── services/           # Business logic
├── cliq-scripts/           # Zoho Cliq Deluge scripts
├── docs/                   # Documentation
│   ├── getting-started/    # Setup guides
│   ├── api/                # API reference
│   ├── zoho-cliq/          # Cliq integration
│   ├── architecture/       # Technical docs
│   └── development/        # Dev guides
├── __tests__/              # Jest tests
└── logs/                   # Log files
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start development server
npm run dev

# Server runs at http://localhost:3000
```

See [Quick Start Guide](./docs/getting-started/quick-start.md) for details.

---

## 🔧 Environment Variables

Key variables (see [Environment Setup](./docs/getting-started/environment-setup.md)):

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...

# Auth
API_SECRET_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# Zoho
ZOHO_CLIENT_ID=1000.xxx
ZOHO_CLIENT_SECRET=xxx
```

---

## 📡 API Endpoints

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| GET    | `/api/health`             | Health check         |
| POST   | `/api/tasks`              | Create task          |
| GET    | `/api/tasks`              | List tasks           |
| GET    | `/api/tasks/:id`          | Get task             |
| PUT    | `/api/tasks/:id`          | Update task          |
| POST   | `/api/tasks/:id/complete` | Complete task        |
| DELETE | `/api/tasks/:id`          | Delete task          |
| POST   | `/api/cliq/link-user`     | Link Cliq user       |
| POST   | `/api/cliq/command`       | Handle slash command |
| GET    | `/api/cliq/widget`        | Get widget data      |

See [API Reference](./docs/api/overview.md) for full documentation.

---

## 🔐 Authentication

```http
# API Key (for Cliq, server-to-server)
x-api-key: YOUR_API_KEY

# Bearer Token (for Flutter app)
Authorization: Bearer YOUR_JWT_TOKEN
```

See [Authentication Guide](./docs/api/authentication.md).

---

## 🔗 Zoho Cliq Integration

> ⚠️ **Note**: Zoho Cliq has a **20 function limit** per extension. Some features documented here may not be visible in Cliq due to this limitation. Please check the **Tasker extension** in Zoho Cliq Developer Console for the current implementation status.

### Active Functions (20/20)

| Category     | Function               | Description           |
| ------------ | ---------------------- | --------------------- |
| **Bot**      | `botWelcome`           | Welcome message       |
|              | `botListTasks`         | List user's tasks     |
|              | `botViewTask`          | View task details     |
| **Widget**   | `widgetViewTasks`      | Personal tasks view   |
|              | `widgetViewProjects`   | Projects grouped view |
| **Tasks**    | `createTask`           | Create new task       |
|              | `showCreateTaskForm`   | Show create form      |
|              | `submitCreateTask`     | Handle form submit    |
|              | `getTaskDetails`       | Get task info         |
|              | `editTaskForm`         | Edit task form        |
|              | `updateTask`           | Update task           |
|              | `completeTask`         | Mark complete         |
|              | `deleteTask`           | Delete task           |
|              | `assignTask`           | Assign to user        |
| **Projects** | `createProject`        | Create project        |
|              | `getProjectDetails`    | Get project info      |
|              | `getProjectMembers`    | List members          |
|              | `inviteMember`         | Invite to project     |
| **Account**  | `linkAccount`          | Link Cliq ↔ Tasker    |
|              | `confirmUnlinkAccount` | Unlink account        |

### Feature Status

| Feature               | Status   | Notes                        |
| --------------------- | -------- | ---------------------------- |
| Slash Commands        | ✅ Active | `/tasker`                    |
| TaskerBot             | ✅ Active | Welcome, list, view          |
| Home Widget           | ✅ Active | Tasks & projects tabs        |
| Task CRUD             | ✅ Active | Full operations              |
| Project Management    | ✅ Active | Create, view, members        |
| Account Linking       | ✅ Active | Link/unlink                  |
| Notifications         | ⏸️ Paused | Requires extra functions     |
| Scheduled Automations | ⏸️ Paused | Requires scheduler functions |
| Message Actions       | ⏸️ Paused | Requires extra functions     |

See [Zoho Cliq Guide](./docs/zoho-cliq/overview.md).

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## 🚢 Deployment

```bash
# Production mode
npm start

# With PM2
pm2 start src/server.js --name tasker-backend
```

See [Deployment Guide](./docs/getting-started/deployment.md).

---

## 📝 Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Start with nodemon |
| `npm start`   | Production start   |
| `npm test`    | Run tests          |

---

## 🔗 Related Repositories

| Repository                                                         | Description                                     |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| [📱 Tasker App](https://github.com/ashu-debuger/tasker-app)         | Flutter mobile application                      |
| [⚙️ Tasker Backend](https://github.com/ashu-debuger/tasker-backend) | Node.js API & Zoho Cliq integration (this repo) |
| [📥 Download APK](https://github.com/ashu-debuger/ESD-App-Download) | Latest Android release                          |

---

## 📄 License

MIT

---

<div align="center">

**[📚 Full Documentation](./docs/README.md)** | **[🔌 API Reference](./docs/api/overview.md)** | **[🔗 Cliq Integration](./docs/zoho-cliq/overview.md)**

[📱 Flutter App](https://github.com/ashu-debuger/tasker-app) • [📥 Download](https://github.com/ashu-debuger/ESD-App-Download)

</div>
