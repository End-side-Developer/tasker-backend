# 🔐 Authentication

API authentication methods for Tasker Backend.

---

## Overview

The API supports two authentication methods:

| Method                     | Best For               | Header                  |
| -------------------------- | ---------------------- | ----------------------- |
| [API Key](#api-key)        | Server-to-server, Cliq | `x-api-key`             |
| [OAuth + JWT](#oauth--jwt) | User-facing apps       | `Authorization: Bearer` |

---

## API Key

Simple authentication for server-to-server communication.

### Usage

Include the API key in the request header:

```http
GET /api/tasks
x-api-key: your-api-key
```

### Example

```bash
curl http://localhost:3000/api/tasks \
  -H "x-api-key: your-secret-api-key"
```

### Configuration

Set in `.env`:

```env
API_SECRET_KEY=your-secure-api-key-here
```

Generate a secure key:

```javascript
require('crypto').randomBytes(32).toString('hex')
```

### Best For

- Zoho Cliq slash commands
- Server-to-server integration
- Internal tools
- Automated scripts

---

## OAuth + JWT

Secure user authentication with token-based access.

### Flow Overview

```
1. User clicks "Login with Zoho"
       ↓
2. Redirect to Zoho login page
       ↓
3. User grants permission
       ↓
4. Callback with authorization code
       ↓
5. Exchange code for access token
       ↓
6. Generate JWT tokens
       ↓
7. Use JWT for API requests
```

### Step 1: Initiate Login

```html
<a href="http://localhost:3000/api/auth/login">Login with Zoho</a>
```

Or programmatically:

```javascript
window.location.href = 'http://localhost:3000/api/auth/login';
```

### Step 2: Handle Callback

After authorization, the user is redirected to your frontend with tokens:

```
https://your-app.com/callback?accessToken=xxx&refreshToken=xxx
```

### Step 3: Use Access Token

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Step 4: Refresh Token

When the access token expires:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

**Response:**

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

### Token Expiration

| Token         | Default Expiration |
| ------------- | ------------------ |
| Access Token  | 7 days             |
| Refresh Token | 30 days            |

Configure in `.env`:

```env
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Configuration

Required `.env` variables:

```env
# Zoho OAuth
ZOHO_CLIENT_ID=1000.xxxx
ZOHO_CLIENT_SECRET=xxxx
ZOHO_REDIRECT_URI=http://localhost:3000/api/auth/callback

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

---

## Error Responses

### Missing Authentication

```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```
**HTTP Status:** 401

### Invalid API Key

```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```
**HTTP Status:** 401

### Expired Token

```json
{
  "success": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```
**HTTP Status:** 401

### Invalid Token

```json
{
  "success": false,
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```
**HTTP Status:** 401

---

## Security Best Practices

### ✅ Do

- Use HTTPS in production
- Store tokens securely (httpOnly cookies or secure storage)
- Rotate API keys periodically
- Use short-lived access tokens
- Validate tokens on every request

### ❌ Don't

- Expose API keys in client-side code
- Store tokens in localStorage (for sensitive apps)
- Use the same keys across environments
- Ignore token expiration

---

## Middleware Implementation

The auth middleware checks both methods:

```javascript
// src/middleware/auth.js
const verifyAuth = async (req, res, next) => {
  // Check API Key
  const apiKey = req.headers['x-api-key'];
  if (apiKey === process.env.API_SECRET_KEY) {
    return next();
  }

  // Check Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);
    req.user = decoded;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
};
```

---

## Related Docs

- [API Overview](./overview.md) - API introduction
- [OAuth Setup](../OAUTH_SETUP.md) - Detailed OAuth config
- [OAuth Implementation](../OAUTH_IMPLEMENTATION.md) - Technical details

---

<div align="center">

**[← API Overview](./overview.md)** | **[Tasks API →](./tasks.md)**

</div>
