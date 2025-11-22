# Tasker Backend

Node.js backend for Tasker Zoho Cliq integration. Provides REST API endpoints for task management and handles bidirectional synchronization with Zoho Cliq.

## 🚀 Features

- **Task Management API** - Create, read, update, delete tasks
- **Zoho Cliq Integration** - Slash commands, webhooks, notifications
- **Firebase Backend** - Firestore database integration
- **User Mapping** - Link Cliq users to Tasker accounts
- **Dual Authentication** - API key + OAuth 2.0 with JWT tokens
- **Security** - Rate limiting, input validation, CORS protection
- **Logging** - Winston logger with file and console output
- **Error Handling** - Comprehensive error handling middleware

## 📁 Project Structure

```
Tasker Backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── firebase.js   # Firebase initialization
│   │   ├── oauth.js      # OAuth 2.0 configuration
│   │   ├── jwt.js        # JWT token management
│   │   └── logger.js     # Winston logger setup
│   ├── controllers/      # Request handlers
│   │   ├── taskController.js
│   │   ├── cliqController.js
│   │   └── authController.js  # OAuth endpoints
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # API key + JWT verification
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/          # API routes
│   │   ├── index.js
│   │   ├── taskRoutes.js
│   │   ├── cliqRoutes.js
│   │   └── authRoutes.js     # Authentication routes
│   ├── services/        # Business logic
│   │   ├── taskService.js
│   │   └── cliqService.js
│   ├── utils/           # Utility functions
│   │   └── validators.js
│   └── server.js        # Entry point
├── docs/                # Documentation
│   ├── API_INTEGRATION.md
│   ├── OAUTH_SETUP.md
│   └── OAUTH_IMPLEMENTATION.md
├── logs/                # Log files (auto-generated)
├── .env                 # Environment variables
├── .env.example         # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd "Tasker Backend"
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `CLIQ_WEBHOOK_URL` - Zoho Cliq incoming webhook URL
- `API_SECRET_KEY` - Secret key for API authentication

### 3. Firebase Setup

Option A: Use service account file
1. Download your Firebase service account JSON file
2. Save it as `serviceAccountKey.json` in the project root
3. Set `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json` in `.env`

Option B: Use environment variables
1. Extract values from service account JSON
2. Set them in `.env` (see `.env.example`)

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```

### Tasks

**Create Task**
```http
POST /api/tasks
Headers: x-api-key: YOUR_API_KEY
Body: {
  "title": "Fix bug",
  "description": "Description here",
  "priority": "high",
  "cliqContext": {
    "userId": "cliq_user_123",
    "userName": "John Doe"
  }
}
```

**List Tasks**
```http
GET /api/tasks?cliqUserId=cliq_user_123&status=pending
Headers: x-api-key: YOUR_API_KEY
```

**Get Task**
```http
GET /api/tasks/:id
Headers: x-api-key: YOUR_API_KEY
```

**Update Task**
```http
PUT /api/tasks/:id
Headers: x-api-key: YOUR_API_KEY
Body: {
  "status": "completed",
  "priority": "medium"
}
```

**Complete Task**
```http
POST /api/tasks/:id/complete
Headers: x-api-key: YOUR_API_KEY
Body: {
  "completedBy": "user_123"
}
```

**Delete Task**
```http
DELETE /api/tasks/:id
Headers: x-api-key: YOUR_API_KEY
```

### Cliq Integration

**Link User**
```http
POST /api/cliq/link-user
Headers: x-api-key: YOUR_API_KEY
Body: {
  "cliqUserId": "cliq_user_123",
  "cliqUserName": "John Doe",
  "taskerUserId": "tasker_user_456"
}
```

**Get User Mapping**
```http
GET /api/cliq/user/:cliqUserId
Headers: x-api-key: YOUR_API_KEY
```

**Webhook Handler**
```http
POST /api/cliq/webhook
Headers: x-api-key: YOUR_API_KEY
Body: {
  "event": "task.completed",
  "data": { ... }
}
```

## 🔐 Security

- **API Key Authentication**: All endpoints require `x-api-key` header
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All inputs validated with express-validator
- **Helmet.js**: Security headers enabled
- **CORS**: Cross-origin requests enabled

## 📊 Logging

Logs are written to:
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs
- Console - Development mode

## 🧪 Testing

Run tests:
```bash
npm test
```

## 🔄 Integration with Zoho Cliq

### Step 1: Get Your API Key
The API key is set in `.env` as `API_SECRET_KEY`

### Step 2: Update Cliq Extension
In your Zoho Cliq slash command handler, use this to call the API:

```deluge
// Call Tasker Backend API
taskData = {
    "title": title,
    "description": description,
    "priority": "medium",
    "cliqContext": {
        "userId": user.get("id"),
        "userName": user.get("name"),
        "channelId": chat.get("id"),
        "source": "slash_command"
    }
};

headers = {
    "x-api-key": "YOUR_API_SECRET_KEY",
    "Content-Type": "application/json"
};

response = invokeurl [
    url: "http://localhost:3000/api/tasks"
    type: POST
    parameters: taskData.toString()
    headers: headers
];

return response;
```

### Step 3: Configure Webhook URL
Set `CLIQ_WEBHOOK_URL` in `.env` to your Cliq extension's incoming webhook URL

## 📝 Development Notes

- Server runs on port 3000 by default (configurable via `PORT` env var)
- Firebase Firestore collections used:
  - `tasks` - Task documents
  - `cliq_user_mappings` - Cliq to Tasker user mappings
  - `cliq_task_mappings` - Task to Cliq context mappings

## 🚢 Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name tasker-backend
   ```
3. Set up reverse proxy (nginx) if needed
4. Configure SSL/TLS certificates
5. Set up monitoring and alerts

## 📄 License

MIT

## 👥 Support

For issues and questions, please refer to the main Tasker documentation or contact the development team.
