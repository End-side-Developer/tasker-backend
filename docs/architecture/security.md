# 🔐 Security

Authentication, authorization, and security best practices.

---

## Authentication Methods

### 1. API Key

Simple authentication for server-to-server calls.

```javascript
// Middleware check
if (req.headers['x-api-key'] === process.env.API_SECRET_KEY) {
  return next();
}
```

**Use for:**
- Zoho Cliq extension calls
- Internal services
- Automated scripts

### 2. JWT Bearer Token

User authentication with JWT tokens.

```javascript
// Verify JWT
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
```

**Use for:**
- Flutter app API calls
- User-specific operations
- OAuth flows

---

## API Key Security

### Generation

```javascript
// Generate secure API key
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
```

### Storage

```env
# .env
API_SECRET_KEY=your-secure-64-char-hex-key
```

### Rotation

1. Generate new key
2. Update Cliq extension
3. Update `.env`
4. Restart server
5. Remove old key

---

## JWT Security

### Configuration

```env
JWT_SECRET=minimum-32-char-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Token Structure

```javascript
const payload = {
  userId: user.id,
  email: user.email,
  iat: Date.now() / 1000,
  exp: (Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
};

const token = jwt.sign(payload, process.env.JWT_SECRET);
```

### Verification

```javascript
// src/config/jwt.js
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
};
```

---

## Rate Limiting

Prevent abuse with request limits.

### Configuration

```javascript
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

module.exports = limiter;
```

### Per-Endpoint Limits

```javascript
// Higher limit for health checks
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

// Stricter limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});
```

---

## Input Validation

Validate all user input.

### Example

```javascript
const createTask = async (req, res) => {
  const { title, priority, dueDate } = req.body;
  
  // Validate required fields
  if (!title || typeof title !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Title is required',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Validate title length
  if (title.length < 1 || title.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Title must be 1-500 characters'
    });
  }
  
  // Validate priority enum
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid priority value'
    });
  }
  
  // Validate date format
  if (dueDate && isNaN(Date.parse(dueDate))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date format'
    });
  }
  
  // Proceed with creation
  // ...
};
```

---

## Firestore Security Rules

Control database access with rules.

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
    
    // Tasks belong to users
    match /tasks/{taskId} {
      allow read: if request.auth != null 
                  && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null 
                            && resource.data.userId == request.auth.uid;
    }
    
    // Projects with member access
    match /projects/{projectId} {
      allow read: if request.auth != null 
                  && (resource.data.userId == request.auth.uid 
                      || request.auth.uid in resource.data.memberIds);
      allow write: if request.auth != null 
                   && resource.data.userId == request.auth.uid;
    }
    
    // Admin SDK bypasses rules
    // Backend uses serviceAccountId for admin access
  }
}
```

---

## HTTPS

Always use HTTPS in production.

### Express HTTPS Redirect

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://tasker-app.com',
    'https://cliq.zoho.com'
  ],
  credentials: true
}));
```

---

## Error Handling

Never expose internal errors.

```javascript
// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Log full error internally
  logger.error('Internal error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  // Return generic error to client
  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  });
};
```

---

## Secrets Management

### Do Not Commit

```gitignore
# .gitignore
.env
serviceKeyTasker.json
*.pem
*.key
```

### Environment Variables

```env
# Required secrets
API_SECRET_KEY=xxx
JWT_SECRET=xxx
FIREBASE_PROJECT_ID=xxx

# OAuth secrets
ZOHO_CLIENT_ID=xxx
ZOHO_CLIENT_SECRET=xxx
```

### Production

Use environment secrets (not files):

- **Azure**: App Settings
- **Railway**: Environment Variables
- **Heroku**: Config Vars

---

## Security Checklist

### ✅ Authentication

- [ ] API key for Cliq integration
- [ ] JWT for user authentication
- [ ] Token expiration configured
- [ ] Refresh token rotation

### ✅ Authorization

- [ ] User can only access own data
- [ ] Firestore rules configured
- [ ] Role-based access for projects

### ✅ Data Validation

- [ ] All inputs validated
- [ ] Type checking
- [ ] Length limits
- [ ] Enum validation

### ✅ Infrastructure

- [ ] HTTPS only in production
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Secrets in environment

### ✅ Monitoring

- [ ] Error logging (Winston)
- [ ] Request logging
- [ ] Failed auth attempts logged

---

## Related Docs

- [Authentication](../api/authentication.md) - API auth
- [Database Schema](./database-schema.md) - Data structure
- [Deployment](../getting-started/deployment.md) - Production setup

---

<div align="center">

**[← Database Schema](./database-schema.md)** | **[Back to Docs](../README.md)**

</div>
