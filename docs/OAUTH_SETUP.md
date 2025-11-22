# OAuth 2.0 Setup Guide for Tasker Backend

Complete guide to configure OAuth 2.0 authentication with Zoho for the Tasker Backend API.

## Table of Contents

1. [Overview](#overview)
2. [Zoho OAuth Setup](#zoho-oauth-setup)
3. [Backend Configuration](#backend-configuration)
4. [Testing OAuth Flow](#testing-oauth-flow)
5. [Frontend Integration](#frontend-integration)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

OAuth 2.0 provides secure, delegated access to the Tasker API without sharing passwords. The flow:

1. User clicks "Login with Zoho"
2. Redirects to Zoho authorization page
3. User grants permissions
4. Zoho redirects back with authorization code
5. Backend exchanges code for access token
6. Backend generates JWT tokens
7. Client uses JWT for API requests

**Benefits**:
- Secure user authentication
- No password sharing
- Token-based access control
- Automatic token refresh
- User profile information

---

## Zoho OAuth Setup

### Step 1: Create Zoho API Client

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click **"Add Client"**
3. Select **"Server-based Applications"**
4. Fill in details:
   - **Client Name**: Tasker Backend
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorized Redirect URIs**: 
     - `http://localhost:3000/api/auth/callback` (development)
     - `https://yourdomain.com/api/auth/callback` (production)
5. Click **"Create"**

### Step 2: Get Client Credentials

After creation, you'll receive:
- **Client ID**: `1000.XXXXXXXXXXXXXXXXXXXXX`
- **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Important**: Keep these credentials secure. Never commit them to version control.

### Step 3: Configure Scopes

Required scopes for Tasker integration:
- `ZohoCliq.Channels.READ` - Read channel information
- `ZohoCliq.Messages.CREATE` - Send messages to channels
- `ZohoCliq.Users.READ` - Read user information
- `Aaaserver.profile.READ` - Read user profile

Optional scopes:
- `ZohoCliq.Bots.READ`
- `ZohoCliq.Bots.CREATE`
- `ZohoCliq.Webhooks.CREATE`

### Step 4: Set Redirect URI

Ensure your redirect URI exactly matches the one in your `.env` file:

**Development**: `http://localhost:3000/api/auth/callback`

**Production**: `https://yourdomain.com/api/auth/callback`

---

## Backend Configuration

### Step 1: Install Dependencies

The OAuth dependencies should already be installed. If not:

```bash
npm install jsonwebtoken passport passport-oauth2 express-session
```

### Step 2: Configure Environment Variables

Update your `.env` file with OAuth credentials:

```env
# OAuth 2.0 Configuration
OAUTH_CLIENT_ID=1000.XXXXXXXXXXXXXXXXXXXXX
OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Zoho OAuth URLs (for different data centers)
# US: accounts.zoho.com
# EU: accounts.zoho.eu
# IN: accounts.zoho.in
# AU: accounts.zoho.com.au
# CN: accounts.zoho.com.cn

OAUTH_AUTHORIZATION_URL=https://accounts.zoho.com/oauth/v2/auth
OAUTH_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token
OAUTH_USER_INFO_URL=https://accounts.zoho.com/oauth/user/info

# JWT Configuration (generate strong random strings)
JWT_SECRET=your-very-long-random-secret-key-at-least-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-different-long-random-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Session Configuration
SESSION_SECRET=your-session-secret-at-least-32-chars

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

### Step 3: Generate Secure Secrets

Generate secure random strings for JWT and session secrets:

**Using Node.js**:
```javascript
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Using PowerShell**:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Using OpenSSL**:
```bash
openssl rand -hex 64
```

### Step 4: Update Zoho Data Center

If you're not in the US, update the OAuth URLs for your data center:

| Data Center | Base URL               |
| ----------- | ---------------------- |
| US          | `accounts.zoho.com`    |
| EU          | `accounts.zoho.eu`     |
| India       | `accounts.zoho.in`     |
| Australia   | `accounts.zoho.com.au` |
| China       | `accounts.zoho.com.cn` |

### Step 5: Restart Backend

```bash
npm run dev
```

Check logs for:
```
✅ Firebase Admin initialized successfully
✅ OAuth 2.0 configured successfully
🚀 Tasker Backend running on port 3000
```

---

## Testing OAuth Flow

### Test 1: Initiate Login

Open in browser:
```
http://localhost:3000/api/auth/login
```

**Expected**: Redirects to Zoho login page

### Test 2: Complete Authorization

1. Login with your Zoho account
2. Grant requested permissions
3. **Expected**: Redirects to `http://localhost:3000/auth/success?accessToken=...&refreshToken=...`

**Note**: If you see a redirect error, your frontend isn't set up yet. That's OK for testing.

### Test 3: Use JWT Token

Copy the `accessToken` from the URL and test API access:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "12345",
    "email": "user@example.com",
    "name": "John Doe",
    "provider": "oauth2"
  }
}
```

### Test 4: Create Task with JWT

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "OAuth test task",
    "description": "Created using JWT authentication",
    "priority": "medium",
    "cliqContext": {
      "userId": "cliq_test_123",
      "userName": "Test User",
      "source": "oauth_test"
    }
  }'
```

### Test 5: Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "new_access_token...",
    "refreshToken": "new_refresh_token...",
    "expiresIn": "7d"
  }
}
```

---

## Frontend Integration

### React/Next.js Example

**1. Create Auth Service** (`services/authService.js`):

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class AuthService {
  // Redirect to OAuth login
  initiateLogin() {
    window.location.href = `${API_BASE_URL}/auth/login`;
  }

  // Handle OAuth callback
  handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      this.setTokens(accessToken, refreshToken);
      return true;
    }
    return false;
  }

  // Store tokens
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  // Refresh access token
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (data.success) {
      this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return data.tokens.accessToken;
    }
    throw new Error('Token refresh failed');
  }

  // Authenticated fetch with auto-retry
  async fetch(url, options = {}) {
    let token = this.getAccessToken();

    const makeRequest = async (accessToken) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Token expired, refresh and retry
      if (response.status === 401) {
        const newToken = await this.refreshToken();
        return makeRequest(newToken);
      }

      return response;
    };

    return makeRequest(token);
  }

  // Get current user
  async getCurrentUser() {
    const response = await this.fetch(`${API_BASE_URL}/auth/me`);
    return response.json();
  }

  // Logout
  async logout() {
    try {
      await this.fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
  }
}

export const authService = new AuthService();
```

**2. Login Component** (`components/LoginButton.jsx`):

```javascript
import { authService } from '../services/authService';

export default function LoginButton() {
  return (
    <button 
      onClick={() => authService.initiateLogin()}
      className="btn btn-primary"
    >
      Login with Zoho
    </button>
  );
}
```

**3. Callback Page** (`pages/auth/callback.js`):

```javascript
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { authService } from '../../services/authService';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const success = authService.handleCallback();
    if (success) {
      router.push('/dashboard');
    } else {
      router.push('/auth/error');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="spinner"></div>
        <p className="mt-4">Completing login...</p>
      </div>
    </div>
  );
}
```

**4. Protected Route Component** (`components/ProtectedRoute.jsx`):

```javascript
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { authService } from '../services/authService';

export default function ProtectedRoute({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, []);

  return authService.isAuthenticated() ? children : null;
}
```

**5. Use in API Calls** (`pages/tasks.js`):

```javascript
import { authService } from '../services/authService';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const response = await authService.fetch(
        'http://localhost:3000/api/tasks?limit=20'
      );
      const data = await response.json();
      setTasks(data.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async function createTask(taskData) {
    try {
      const response = await authService.fetch(
        'http://localhost:3000/api/tasks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTasks([...tasks, data.data]);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  return (
    <ProtectedRoute>
      <div>
        <h1>Tasks</h1>
        {/* Task list UI */}
      </div>
    </ProtectedRoute>
  );
}
```

### Vue.js Example

**Auth Plugin** (`plugins/auth.js`):

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';

export default {
  install(app) {
    const auth = {
      initiateLogin() {
        window.location.href = `${API_BASE_URL}/auth/login`;
      },

      handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');

        if (accessToken && refreshToken) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          return true;
        }
        return false;
      },

      getAccessToken() {
        return localStorage.getItem('accessToken');
      },

      isAuthenticated() {
        return !!this.getAccessToken();
      },

      async logout() {
        try {
          await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${this.getAccessToken()}` }
          });
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    // Setup Axios interceptor for automatic token refresh
    axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken
            });
            const newToken = response.data.tokens.accessToken;
            localStorage.setItem('accessToken', newToken);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return axios.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );

    app.config.globalProperties.$auth = auth;
    app.provide('auth', auth);
  }
};
```

---

## Security Best Practices

### 1. Secure Token Storage

**Good**:
- Store tokens in `localStorage` or `sessionStorage`
- Use `httpOnly` cookies for web apps (requires backend modification)

**Avoid**:
- Storing tokens in URL parameters
- Exposing tokens in console logs
- Sending tokens in query strings

### 2. Token Expiration

- Access tokens expire in 7 days (configurable)
- Refresh tokens expire in 30 days (configurable)
- Implement automatic token refresh
- Clear tokens on logout

### 3. HTTPS in Production

Always use HTTPS in production:
```env
# Production .env
OAUTH_CALLBACK_URL=https://yourdomain.com/api/auth/callback
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

### 4. Environment Variables

Never commit `.env` file:
```bash
# .gitignore
.env
.env.local
.env.production
```

### 5. CORS Configuration

Restrict CORS to your frontend domain:

```javascript
// src/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### 6. Rate Limiting

OAuth endpoints are rate-limited by default. Monitor for abuse.

### 7. Token Revocation

Implement token blacklisting for logout:

```javascript
// Store revoked tokens in Redis or database
const revokedTokens = new Set();

function revokeToken(token) {
  revokedTokens.add(token);
}

function isTokenRevoked(token) {
  return revokedTokens.has(token);
}
```

---

## Troubleshooting

### Issue 1: "Redirect URI mismatch"

**Error**: OAuth callback fails with redirect URI error

**Solution**:
- Ensure `OAUTH_CALLBACK_URL` in `.env` exactly matches the URI in Zoho API Console
- Check for trailing slashes
- Verify http vs https
- Verify port number

### Issue 2: "Invalid client credentials"

**Error**: Token exchange fails

**Solution**:
- Verify `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` are correct
- Check for extra spaces in `.env` file
- Regenerate credentials if needed

### Issue 3: "Token expired"

**Error**: API requests fail with 401

**Solution**:
- Implement automatic token refresh
- Check token expiration times
- Ensure refresh token is stored

### Issue 4: "CORS error"

**Error**: Browser blocks OAuth requests

**Solution**:
```javascript
// src/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Issue 5: "Session error"

**Error**: OAuth callback fails with session error

**Solution**:
- Ensure `SESSION_SECRET` is set
- Check cookie settings
- For production, enable secure cookies

### Issue 6: Wrong Data Center

**Error**: OAuth endpoints return 404

**Solution**:
Update OAuth URLs for your Zoho data center (see Backend Configuration Step 4)

---

## Additional Resources

- [Zoho OAuth Documentation](https://www.zoho.com/accounts/protocol/oauth.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Passport.js Documentation](http://www.passportjs.org/)

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0
