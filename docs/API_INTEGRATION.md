# Tasker Backend API Integration Guide

Complete guide for integrating with the Tasker Backend API for Zoho Cliq and other clients.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base Configuration](#base-configuration)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Formats](#requestresponse-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Integration Examples](#integration-examples)
9. [Webhook Integration](#webhook-integration)
10. [Testing](#testing)

---

## Overview

The Tasker Backend API provides RESTful endpoints for task management integrated with Zoho Cliq. It supports:

- Task CRUD operations (Create, Read, Update, Delete)
- User mapping between Cliq and Tasker
- Webhook notifications for task events
- Rich card formatting for Cliq UI

**Base URL**: `http://localhost:3000/api` (Development)

**API Version**: 1.0.0

**Response Format**: JSON

---

## Authentication

The API supports two authentication methods: **API Key** and **OAuth 2.0 with JWT tokens**. You can use either method based on your integration needs.

### Method 1: API Key Authentication

Simple authentication using an API key in the request header.

**Header**: `x-api-key`

**Value**: Your API secret key from `.env` file (`API_SECRET_KEY`)

```http
GET /api/tasks
x-api-key: your-secret-api-key-here
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "x-api-key: your-secret-api-key-here"
```

**Best for**: Server-to-server integrations, internal tools, Zoho Cliq slash commands

---

### Method 2: OAuth 2.0 + JWT Authentication

Secure authentication flow for user-facing applications with token-based access.

#### OAuth 2.0 Flow

1. **Redirect to Login**: User clicks "Login with Zoho"
2. **Authorization**: User grants permissions
3. **Callback**: Backend receives authorization code
4. **Token Exchange**: Backend exchanges code for access token
5. **JWT Generation**: Backend generates JWT tokens
6. **API Access**: Client uses JWT for API requests

#### Step 1: Initiate Login

**Endpoint**: `GET /api/auth/login`

Redirects user to OAuth provider (Zoho) login page.

```html
<a href="http://localhost:3000/api/auth/login">Login with Zoho</a>
```

Or programmatically:
```javascript
window.location.href = 'http://localhost:3000/api/auth/login';
```

#### Step 2: Handle Callback

After user authorizes, they're redirected to `/api/auth/callback` which:
- Exchanges authorization code for access token
- Fetches user profile
- Generates JWT tokens
- Redirects to frontend with tokens

**Frontend receives**:
```
http://yourapp.com/auth/success?accessToken=eyJhbG...&refreshToken=eyJhbG...
```

#### Step 3: Use JWT Token

Include the JWT access token in the `Authorization` header:

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example with JavaScript**:
```javascript
const response = await fetch('http://localhost:3000/api/tasks', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Step 4: Refresh Token

When access token expires, use refresh token to get a new one.

**Endpoint**: `POST /api/auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

#### Get Current User

**Endpoint**: `GET /api/auth/me`

**Authentication**: JWT required

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "provider": "oauth2"
  }
}
```

#### Logout

**Endpoint**: `POST /api/auth/logout`

**Authentication**: JWT required

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note**: With JWT, logout is typically handled client-side by removing tokens from storage.

**Best for**: Web applications, mobile apps, user-facing integrations

---

### Authentication Errors

| Status Code | Error Message                                     | Description                                 |
| ----------- | ------------------------------------------------- | ------------------------------------------- |
| 401         | API key required                                  | No `x-api-key` header provided              |
| 401         | Authorization token is required                   | No `Authorization` header with Bearer token |
| 401         | Invalid or expired token                          | JWT token is invalid or expired             |
| 403         | Invalid API key                                   | The provided API key is incorrect           |
| 403         | Authentication required (API key or Bearer token) | Neither API key nor JWT token provided      |

---

## Base Configuration

### Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=dev-mantra-india
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceKeyTasker.json

# Security
API_SECRET_KEY=your-secure-random-key-here

# OAuth 2.0 Configuration
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback
OAUTH_AUTHORIZATION_URL=https://accounts.zoho.com/oauth/v2/auth
OAUTH_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token
OAUTH_USER_INFO_URL=https://accounts.zoho.com/oauth/user/info

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=30d

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# Zoho Cliq
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/company/YOUR_ORG/api/v2/channelsbyname/YOUR_CHANNEL/message

# Logging
LOG_LEVEL=info
```

### Required Files

1. **serviceKeyTasker.json**: Firebase service account credentials
2. **.env**: Environment configuration (never commit to git)

---

## API Endpoints

### Health Check

#### GET /api/health

Check if the API is running.

**Authentication**: Not required

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-22T15:30:00.000Z",
  "uptime": 12345.67
}
```

---

### Task Management

#### 1. Create Task

**POST** `/api/tasks`

Create a new task from Zoho Cliq or other clients.

**Authentication**: Required

**Rate Limit**: 10 requests/minute

**Request Body**:
```json
{
  "title": "Implement login feature",
  "description": "Add email/password authentication with Firebase",
  "priority": "high",
  "projectId": "project_123",
  "tags": ["auth", "firebase", "backend"],
  "dueDate": "2025-11-30T00:00:00.000Z",
  "cliqContext": {
    "userId": "cliq_user_12345",
    "userName": "Ashutosh Kumar",
    "channelId": "channel_67890",
    "messageId": "msg_11111",
    "source": "slash_command"
  }
}
```

**Required Fields**:
- `title` (string, 1-200 chars)
- `cliqContext.userId` (string)
- `cliqContext.userName` (string)

**Optional Fields**:
- `description` (string, max 2000 chars)
- `priority` (string: "low", "medium", "high", "urgent")
- `projectId` (string)
- `tags` (array of strings)
- `dueDate` (ISO 8601 date string)
- `cliqContext.channelId` (string)
- `cliqContext.messageId` (string)
- `cliqContext.source` (string)

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Task created successfully! 🎉",
  "data": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "status": "pending",
    "priority": "high",
    "createdAt": "2025-11-22T15:30:00.000Z",
    "cliqUserId": "cliq_user_12345",
    "taskerUserId": "user_xyz789"
  },
  "card": {
    "theme": "modern-inline",
    "title": "✅ Task Created",
    "subtitle": "Implement login feature",
    "buttons": [
      {
        "label": "View Task",
        "action": {
          "type": "open.url",
          "url": "https://tasker.app/tasks/task_abc123"
        }
      }
    ]
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Task title is required"
    }
  ]
}
```

---

#### 2. Get Task by ID

**GET** `/api/tasks/:taskId`

Retrieve a specific task by its ID.

**Authentication**: Required

**URL Parameters**:
- `taskId` (string): The task ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "description": "Add email/password authentication with Firebase",
    "status": "in_progress",
    "priority": "high",
    "projectId": "project_123",
    "tags": ["auth", "firebase", "backend"],
    "cliqUserId": "cliq_user_12345",
    "taskerUserId": "user_xyz789",
    "createdAt": "2025-11-22T15:30:00.000Z",
    "updatedAt": "2025-11-22T16:45:00.000Z",
    "dueDate": "2025-11-30T00:00:00.000Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "message": "Task not found"
}
```

---

#### 3. List Tasks

**GET** `/api/tasks`

Retrieve a list of tasks with optional filtering.

**Authentication**: Required

**Query Parameters**:
- `status` (string): Filter by status ("pending", "in_progress", "completed", "cancelled")
- `priority` (string): Filter by priority ("low", "medium", "high", "urgent")
- `projectId` (string): Filter by project ID
- `cliqUserId` (string): Filter by Cliq user ID
- `taskerUserId` (string): Filter by Tasker user ID
- `limit` (number): Max results (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/tasks?status=in_progress&priority=high&limit=20" \
  -H "x-api-key: your-secret-api-key-here"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "taskId": "task_abc123",
      "title": "Implement login feature",
      "status": "in_progress",
      "priority": "high",
      "createdAt": "2025-11-22T15:30:00.000Z"
    },
    {
      "taskId": "task_def456",
      "title": "Design user dashboard",
      "status": "in_progress",
      "priority": "high",
      "createdAt": "2025-11-22T14:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### 4. Update Task

**PUT** `/api/tasks/:taskId`

Update an existing task.

**Authentication**: Required

**URL Parameters**:
- `taskId` (string): The task ID

**Request Body** (all fields optional):
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "urgent",
  "projectId": "project_456",
  "tags": ["auth", "security"],
  "dueDate": "2025-12-15T00:00:00.000Z"
}
```

**Allowed Status Values**:
- `pending`
- `in_progress`
- `completed`
- `cancelled`

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Task updated successfully! ✨",
  "data": {
    "taskId": "task_abc123",
    "title": "Updated task title",
    "status": "in_progress",
    "priority": "urgent",
    "updatedAt": "2025-11-22T17:00:00.000Z"
  }
}
```

---

#### 5. Complete Task

**POST** `/api/tasks/:taskId/complete`

Mark a task as completed and trigger webhook notification.

**Authentication**: Required

**URL Parameters**:
- `taskId` (string): The task ID

**Request Body** (optional):
```json
{
  "completionNotes": "All tests passing, ready for review"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Task completed! 🎉",
  "data": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "status": "completed",
    "completedAt": "2025-11-22T18:00:00.000Z"
  },
  "webhookSent": true
}
```

---

#### 6. Delete Task

**DELETE** `/api/tasks/:taskId`

Delete a task permanently.

**Authentication**: Required

**URL Parameters**:
- `taskId` (string): The task ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Cliq Integration

#### 1. Link User

**POST** `/api/cliq/link-user`

Create a mapping between a Cliq user and Tasker user.

**Authentication**: Required

**Request Body**:
```json
{
  "cliqUserId": "cliq_user_12345",
  "cliqUserName": "Ashutosh Kumar",
  "cliqUserEmail": "ashutosh@example.com",
  "taskerUserId": "user_xyz789",
  "taskerUserEmail": "ashutosh@example.com"
}
```

**Required Fields**:
- `cliqUserId` (string)
- `cliqUserName` (string)
- `taskerUserId` (string)

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "User linked successfully! 🔗",
  "data": {
    "mappingId": "mapping_abc123",
    "cliqUserId": "cliq_user_12345",
    "taskerUserId": "user_xyz789",
    "createdAt": "2025-11-22T15:00:00.000Z"
  }
}
```

---

#### 2. Get User Mapping

**GET** `/api/cliq/user/:cliqUserId`

Retrieve the Tasker user mapping for a Cliq user.

**Authentication**: Required

**URL Parameters**:
- `cliqUserId` (string): The Cliq user ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "cliqUserId": "cliq_user_12345",
    "cliqUserName": "Ashutosh Kumar",
    "taskerUserId": "user_xyz789",
    "taskerUserEmail": "ashutosh@example.com",
    "linkedAt": "2025-11-22T15:00:00.000Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "message": "User mapping not found"
}
```

---

#### 3. Handle Webhook

**POST** `/api/cliq/webhook`

Receive webhook events from Tasker app (task created, completed, assigned).

**Authentication**: Required

**Request Body**:
```json
{
  "event": "task.completed",
  "timestamp": "2025-11-22T18:00:00.000Z",
  "task": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "status": "completed",
    "priority": "high",
    "completedBy": "user_xyz789"
  },
  "target": {
    "type": "channel",
    "channelId": "channel_67890"
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## Request/Response Formats

### Standard Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Cliq Card Response

For Cliq integration, responses include a `card` object:

```json
{
  "success": true,
  "message": "Task created successfully! 🎉",
  "data": { /* task data */ },
  "card": {
    "theme": "modern-inline",
    "title": "✅ Task Created",
    "subtitle": "Task title here",
    "buttons": [
      {
        "label": "View Task",
        "action": {
          "type": "open.url",
          "url": "https://tasker.app/tasks/task_id"
        }
      },
      {
        "label": "Mark Complete",
        "action": {
          "type": "invoke.function",
          "name": "completeTask",
          "id": "task_id"
        }
      }
    ]
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description           | Example                            |
| ---- | --------------------- | ---------------------------------- |
| 200  | OK                    | Successful GET, PUT, DELETE        |
| 201  | Created               | Successful POST (resource created) |
| 400  | Bad Request           | Validation errors, missing fields  |
| 401  | Unauthorized          | Missing API key                    |
| 403  | Forbidden             | Invalid API key                    |
| 404  | Not Found             | Resource doesn't exist             |
| 429  | Too Many Requests     | Rate limit exceeded                |
| 500  | Internal Server Error | Server-side error                  |

### Error Response Format

```json
{
  "success": false,
  "message": "Primary error message",
  "errors": [
    {
      "field": "title",
      "message": "Task title is required",
      "code": "VALIDATION_ERROR"
    }
  ],
  "timestamp": "2025-11-22T18:30:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication failed
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server-side error

---

## Rate Limiting

### Limits

| Endpoint Category | Limit        | Window     |
| ----------------- | ------------ | ---------- |
| General API       | 100 requests | 15 minutes |
| Task Creation     | 10 requests  | 1 minute   |
| Webhook           | 50 requests  | 1 minute   |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700665800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

---

## Integration Examples

### Example 1: OAuth 2.0 Web Application Integration

**React/Next.js Frontend Example**:

```javascript
// authService.js
const API_BASE_URL = 'http://localhost:3000/api';

export const authService = {
  // Redirect to OAuth login
  initiateLogin() {
    window.location.href = `${API_BASE_URL}/auth/login`;
  },

  // Handle OAuth callback (extract tokens from URL)
  handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      // Store tokens securely
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      return { accessToken, refreshToken };
    }
    return null;
  },

  // Get stored access token
  getAccessToken() {
    return localStorage.getItem('accessToken');
  },

  // Get stored refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },

  // Refresh access token
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      return data.tokens.accessToken;
    }
    throw new Error('Token refresh failed');
  },

  // Get current user
  async getCurrentUser() {
    const accessToken = this.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.json();
  },

  // Logout
  async logout() {
    const accessToken = this.getAccessToken();
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  // Make authenticated API request with auto-retry on token expiry
  async authenticatedFetch(url, options = {}) {
    let accessToken = this.getAccessToken();
    
    const makeRequest = async (token) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      // If token expired, refresh and retry
      if (response.status === 401) {
        const newToken = await this.refreshToken();
        return makeRequest(newToken);
      }

      return response;
    };

    return makeRequest(accessToken);
  },
};

// Usage in components
import { authService } from './authService';

// Login component
function LoginButton() {
  return (
    <button onClick={() => authService.initiateLogin()}>
      Login with Zoho
    </button>
  );
}

// Callback page
function CallbackPage() {
  useEffect(() => {
    const tokens = authService.handleCallback();
    if (tokens) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  return <div>Completing login...</div>;
}

// API usage with JWT
async function createTask(taskData) {
  const response = await authService.authenticatedFetch(
    'http://localhost:3000/api/tasks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    }
  );
  return response.json();
}
```

---

### Example 2: Create Task from Zoho Cliq Slash Command

**Deluge Code (Zoho Cliq Handler)**:

```deluge
response = Map();

// Parse command arguments
commandText = arguments.trim();
parts = commandText.toList(" ");

if (parts.size() == 0) {
    response.put("text", "❌ Please provide a task title");
    return response;
}

// Extract title and optional description
taskTitle = parts.get(0);
taskDescription = "";

if (parts.size() > 1) {
    descParts = parts.subList(1, parts.size());
    taskDescription = descParts.toString(" ");
}

// Prepare API request
apiUrl = "http://your-backend-url.com/api/tasks";
headers = Map();
headers.put("x-api-key", "your-api-key-here");
headers.put("Content-Type", "application/json");

payload = Map();
payload.put("title", taskTitle);
payload.put("description", taskDescription);
payload.put("priority", "medium");

// Add Cliq context
cliqContext = Map();
cliqContext.put("userId", user.get("id"));
cliqContext.put("userName", user.get("name"));
cliqContext.put("channelId", channel.get("id"));
cliqContext.put("source", "slash_command");
payload.put("cliqContext", cliqContext);

// Make API call
apiResponse = invokeurl [
    url: apiUrl
    type: POST
    parameters: payload.toString()
    headers: headers
];

// Return rich card response
if (apiResponse.get("success") == true) {
    card = apiResponse.get("card");
    response.put("text", apiResponse.get("message"));
    response.put("card", card);
} else {
    response.put("text", "❌ " + apiResponse.get("message"));
}

return response;
```

---

### Example 2: Node.js Client Integration

```javascript
const axios = require('axios');

class TaskerClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async createTask(taskData) {
    try {
      const response = await this.client.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error.response?.data || error.message);
      throw error;
    }
  }

  async getTask(taskId) {
    try {
      const response = await this.client.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting task:', error.response?.data || error.message);
      throw error;
    }
  }

  async listTasks(filters = {}) {
    try {
      const response = await this.client.get('/tasks', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error listing tasks:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const response = await this.client.put(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error.response?.data || error.message);
      throw error;
    }
  }

  async completeTask(taskId, notes = '') {
    try {
      const response = await this.client.post(`/tasks/${taskId}/complete`, {
        completionNotes: notes
      });
      return response.data;
    } catch (error) {
      console.error('Error completing task:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await this.client.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error.response?.data || error.message);
      throw error;
    }
  }

  async linkUser(cliqUser, taskerUser) {
    try {
      const response = await this.client.post('/cliq/link-user', {
        cliqUserId: cliqUser.id,
        cliqUserName: cliqUser.name,
        cliqUserEmail: cliqUser.email,
        taskerUserId: taskerUser.id,
        taskerUserEmail: taskerUser.email
      });
      return response.data;
    } catch (error) {
      console.error('Error linking user:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Usage example
const client = new TaskerClient('http://localhost:3000/api', 'your-api-key-here');

async function demo() {
  // Create a task
  const task = await client.createTask({
    title: 'Review pull request #42',
    description: 'Check code quality and test coverage',
    priority: 'high',
    tags: ['code-review', 'urgent'],
    cliqContext: {
      userId: 'cliq_123',
      userName: 'John Doe',
      channelId: 'channel_456',
      source: 'api'
    }
  });
  
  console.log('Task created:', task.data.taskId);

  // List tasks
  const tasks = await client.listTasks({
    status: 'pending',
    priority: 'high',
    limit: 10
  });
  
  console.log('Found tasks:', tasks.data.length);

  // Complete task
  const completed = await client.completeTask(task.data.taskId, 'All checks passed');
  console.log('Task completed:', completed.message);
}

demo().catch(console.error);
```

---

### Example 3: Python Client Integration

```python
import requests
from typing import Dict, List, Optional

class TaskerClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_task(self, task_data: Dict) -> Dict:
        """Create a new task"""
        response = requests.post(
            f"{self.base_url}/tasks",
            json=task_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_task(self, task_id: str) -> Dict:
        """Get task by ID"""
        response = requests.get(
            f"{self.base_url}/tasks/{task_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def list_tasks(self, filters: Optional[Dict] = None) -> Dict:
        """List tasks with optional filters"""
        response = requests.get(
            f"{self.base_url}/tasks",
            params=filters,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def update_task(self, task_id: str, updates: Dict) -> Dict:
        """Update a task"""
        response = requests.put(
            f"{self.base_url}/tasks/{task_id}",
            json=updates,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def complete_task(self, task_id: str, notes: str = '') -> Dict:
        """Mark task as completed"""
        response = requests.post(
            f"{self.base_url}/tasks/{task_id}/complete",
            json={'completionNotes': notes},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def delete_task(self, task_id: str) -> Dict:
        """Delete a task"""
        response = requests.delete(
            f"{self.base_url}/tasks/{task_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = TaskerClient('http://localhost:3000/api', 'your-api-key-here')

# Create task
task = client.create_task({
    'title': 'Update documentation',
    'description': 'Add API examples',
    'priority': 'medium',
    'cliqContext': {
        'userId': 'cliq_123',
        'userName': 'Alice Smith',
        'source': 'python_client'
    }
})

print(f"Created task: {task['data']['taskId']}")

# List high priority tasks
tasks = client.list_tasks({'priority': 'high', 'status': 'pending'})
print(f"Found {len(tasks['data'])} high priority tasks")
```

---

### Example 4: cURL Commands

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users cannot reset password",
    "priority": "urgent",
    "cliqContext": {
      "userId": "cliq_123",
      "userName": "Bob Wilson",
      "source": "curl"
    }
  }'

# Get task
curl -X GET http://localhost:3000/api/tasks/task_abc123 \
  -H "x-api-key: your-api-key-here"

# List tasks with filters
curl -X GET "http://localhost:3000/api/tasks?status=in_progress&limit=5" \
  -H "x-api-key: your-api-key-here"

# Update task
curl -X PUT http://localhost:3000/api/tasks/task_abc123 \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }'

# Complete task
curl -X POST http://localhost:3000/api/tasks/task_abc123/complete \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "completionNotes": "Bug fixed and tested"
  }'

# Delete task
curl -X DELETE http://localhost:3000/api/tasks/task_abc123 \
  -H "x-api-key: your-api-key-here"

# Link Cliq user to Tasker user
curl -X POST http://localhost:3000/api/cliq/link-user \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "cliqUserId": "cliq_123",
    "cliqUserName": "Bob Wilson",
    "cliqUserEmail": "bob@example.com",
    "taskerUserId": "user_456",
    "taskerUserEmail": "bob@example.com"
  }'

# Get user mapping
curl -X GET http://localhost:3000/api/cliq/user/cliq_123 \
  -H "x-api-key: your-api-key-here"
```

---

## Webhook Integration

### Webhook Flow

1. **Tasker App Event** → Task status changes (created, completed, assigned)
2. **Backend Receives** → POST to `/api/cliq/webhook`
3. **Backend Processes** → Validates, formats, logs
4. **Cliq Service Sends** → POST to Zoho Cliq channel with rich card
5. **Cliq Displays** → User sees notification in channel

### Webhook Payload Structure

```json
{
  "event": "task.created | task.completed | task.assigned",
  "timestamp": "2025-11-22T18:00:00.000Z",
  "task": {
    "taskId": "task_abc123",
    "title": "Task title",
    "description": "Task description",
    "status": "pending | in_progress | completed | cancelled",
    "priority": "low | medium | high | urgent",
    "projectId": "project_123",
    "tags": ["tag1", "tag2"],
    "createdBy": "user_xyz789",
    "assignedTo": "user_def456",
    "completedBy": "user_xyz789",
    "createdAt": "2025-11-22T15:00:00.000Z",
    "completedAt": "2025-11-22T18:00:00.000Z"
  },
  "target": {
    "type": "channel | user | bot",
    "channelId": "channel_67890",
    "userId": "cliq_user_12345"
  },
  "metadata": {
    "source": "tasker_app",
    "version": "1.0.0"
  }
}
```

### Event Types

#### 1. task.created

Triggered when a new task is created.

```json
{
  "event": "task.created",
  "timestamp": "2025-11-22T15:30:00.000Z",
  "task": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "status": "pending",
    "priority": "high",
    "createdBy": "user_xyz789"
  },
  "target": {
    "type": "channel",
    "channelId": "channel_67890"
  }
}
```

#### 2. task.completed

Triggered when a task is marked as completed.

```json
{
  "event": "task.completed",
  "timestamp": "2025-11-22T18:00:00.000Z",
  "task": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "status": "completed",
    "completedBy": "user_xyz789",
    "completedAt": "2025-11-22T18:00:00.000Z"
  },
  "target": {
    "type": "channel",
    "channelId": "channel_67890"
  }
}
```

#### 3. task.assigned

Triggered when a task is assigned to a user.

```json
{
  "event": "task.assigned",
  "timestamp": "2025-11-22T16:00:00.000Z",
  "task": {
    "taskId": "task_abc123",
    "title": "Implement login feature",
    "assignedTo": "user_def456",
    "assignedBy": "user_xyz789"
  },
  "target": {
    "type": "user",
    "userId": "cliq_user_67890"
  }
}
```

### Setting Up Webhooks

#### 1. Configure Webhook URL

In `.env` file:
```env
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/company/YOUR_ORG/api/v2/channelsbyname/YOUR_CHANNEL/message
```

#### 2. Get Cliq Webhook URL

1. Go to Zoho Cliq
2. Create or select a channel
3. Click **Integrations** → **Webhooks**
4. Copy the webhook URL
5. Add to `.env` file

#### 3. Test Webhook

```bash
curl -X POST http://localhost:3000/api/cliq/webhook \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task.completed",
    "timestamp": "2025-11-22T18:00:00.000Z",
    "task": {
      "taskId": "task_test_123",
      "title": "Test task",
      "status": "completed",
      "completedBy": "user_test"
    },
    "target": {
      "type": "channel",
      "channelId": "channel_test"
    }
  }'
```

---

## Testing

### 1. Health Check Test

```bash
curl http://localhost:3000/api/health
```

**Expected Output**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-22T18:30:00.000Z",
  "uptime": 123.45
}
```

---

### 2. Create Task Test

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "x-api-key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task creation",
    "description": "This is a test task",
    "priority": "medium",
    "cliqContext": {
      "userId": "test_user_123",
      "userName": "Test User",
      "source": "test"
    }
  }'
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Task created successfully! 🎉",
  "data": {
    "taskId": "task_...",
    "title": "Test task creation",
    "status": "pending",
    "priority": "medium"
  }
}
```

---

### 3. List Tasks Test

```bash
curl -X GET "http://localhost:3000/api/tasks?limit=5" \
  -H "x-api-key: test-key-12345"
```

---

### 4. Update Task Test

```bash
curl -X PUT http://localhost:3000/api/tasks/task_abc123 \
  -H "x-api-key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }'
```

---

### 5. Complete Task Test

```bash
curl -X POST http://localhost:3000/api/tasks/task_abc123/complete \
  -H "x-api-key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "completionNotes": "Test completion"
  }'
```

---

### 6. Link User Test

```bash
curl -X POST http://localhost:3000/api/cliq/link-user \
  -H "x-api-key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "cliqUserId": "test_cliq_123",
    "cliqUserName": "Test User",
    "cliqUserEmail": "test@example.com",
    "taskerUserId": "test_tasker_456",
    "taskerUserEmail": "test@example.com"
  }'
```

---

### 7. Error Handling Tests

**Missing API Key**:
```bash
curl -X GET http://localhost:3000/api/tasks
# Expected: 401 Unauthorized
```

**Invalid API Key**:
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "x-api-key: wrong-key"
# Expected: 403 Forbidden
```

**Validation Error**:
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "x-api-key: test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 Bad Request with validation errors
```

**Not Found**:
```bash
curl -X GET http://localhost:3000/api/tasks/nonexistent_id \
  -H "x-api-key: test-key-12345"
# Expected: 404 Not Found
```

---

## Postman Collection

Import this JSON into Postman for quick testing:

```json
{
  "info": {
    "name": "Tasker Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "api_key",
      "value": "your-api-key-here"
    },
    {
      "key": "jwt_token",
      "value": "your-jwt-access-token-here"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "OAuth Login (Browser)",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{base_url}}/auth/login",
        "description": "Redirects to OAuth provider login page. Open this URL in a browser."
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"your-refresh-token-here\"\n}"
        },
        "url": "{{base_url}}/auth/refresh"
      }
    },
    {
      "name": "Get Current User (JWT)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "url": "{{base_url}}/auth/me"
      }
    },
    {
      "name": "Logout (JWT)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "url": "{{base_url}}/auth/logout"
      }
    },
    {
      "name": "Create Task (API Key)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Sample task\",\n  \"description\": \"Task description\",\n  \"priority\": \"high\",\n  \"cliqContext\": {\n    \"userId\": \"cliq_123\",\n    \"userName\": \"Test User\",\n    \"source\": \"postman\"\n  }\n}"
        },
        "url": "{{base_url}}/tasks"
      }
    },
    {
      "name": "List Tasks",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/tasks?limit=10&status=pending",
          "host": ["{{base_url}}"],
          "path": ["tasks"],
          "query": [
            {
              "key": "limit",
              "value": "10"
            },
            {
              "key": "status",
              "value": "pending"
            }
          ]
        }
      }
    },
    {
      "name": "Get Task",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          }
        ],
        "url": "{{base_url}}/tasks/:taskId"
      }
    },
    {
      "name": "Update Task",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"status\": \"in_progress\",\n  \"priority\": \"urgent\"\n}"
        },
        "url": "{{base_url}}/tasks/:taskId"
      }
    },
    {
      "name": "Complete Task",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"completionNotes\": \"Task completed successfully\"\n}"
        },
        "url": "{{base_url}}/tasks/:taskId/complete"
      }
    },
    {
      "name": "Delete Task",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          }
        ],
        "url": "{{base_url}}/tasks/:taskId"
      }
    },
    {
      "name": "Link User",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"cliqUserId\": \"cliq_123\",\n  \"cliqUserName\": \"Test User\",\n  \"cliqUserEmail\": \"test@example.com\",\n  \"taskerUserId\": \"user_456\",\n  \"taskerUserEmail\": \"test@example.com\"\n}"
        },
        "url": "{{base_url}}/cliq/link-user"
      }
    },
    {
      "name": "Get User Mapping",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          }
        ],
        "url": "{{base_url}}/cliq/user/:cliqUserId"
      }
    },
    {
      "name": "Handle Webhook",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-api-key",
            "value": "{{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"event\": \"task.completed\",\n  \"timestamp\": \"2025-11-22T18:00:00.000Z\",\n  \"task\": {\n    \"taskId\": \"task_123\",\n    \"title\": \"Sample task\",\n    \"status\": \"completed\"\n  },\n  \"target\": {\n    \"type\": \"channel\",\n    \"channelId\": \"channel_456\"\n  }\n}"
        },
        "url": "{{base_url}}/cliq/webhook"
      }
    }
  ]
}
```

---

## Support & Resources

- **Backend Code**: `Tasker Backend/` directory
- **Documentation**: 
  - `docs/zoho-cliq-integration.md` - Complete integration guide
  - `docs/zoho-cliq-step-by-step.md` - Implementation steps
  - `Tasker Backend/README.md` - Backend overview
- **Logs**: `Tasker Backend/logs/` directory
  - `error.log` - Error logs only
  - `combined.log` - All logs

---

## Changelog

### Version 1.0.0 (2025-11-22)
- Initial API release
- Task CRUD endpoints
- Cliq integration endpoints
- Webhook support
- User mapping
- Rich card formatting
- Rate limiting
- API key authentication

---

**Last Updated**: November 22, 2025  
**API Version**: 1.0.0  
**Backend Version**: 1.0.0
