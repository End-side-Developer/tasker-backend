# 🔧 Environment Setup

Complete guide to configuring environment variables.

---

## Environment File

Create `.env` in the project root:

```bash
cp .env.example .env
```

---

## Required Variables

### Server Configuration

```env
# Server port (default: 3000)
PORT=3000

# Environment: development, production
NODE_ENV=development
```

### Firebase Configuration

```env
# Firebase project ID
FIREBASE_PROJECT_ID=your-firebase-project-id

# Firebase private key (from service account JSON)
# Keep the quotes and \n characters
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n"

# Firebase client email
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# OR use service account file path
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### API Security

```env
# API key for authentication (generate a secure random string)
API_SECRET_KEY=your-secure-api-key-here

# Example: Generate with Node.js
# require('crypto').randomBytes(32).toString('hex')
```

---

## Optional Variables

### Zoho Cliq Integration

```env
# Cliq incoming webhook URL
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/company/xxx/api/v2/webhooks/incoming/xxx

# Cliq OAuth (for user auth flow)
ZOHO_CLIENT_ID=1000.xxxx
ZOHO_CLIENT_SECRET=xxxx
ZOHO_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### OAuth Configuration

```env
# JWT secret for token signing
JWT_SECRET=your-jwt-secret-key

# Token expiration
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Logging

```env
# Log level: error, warn, info, debug
LOG_LEVEL=info
```

---

## Firebase Service Account

### Option 1: Environment Variables (Recommended)

Extract from your `serviceAccountKey.json`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

### Option 2: Service Account File

1. Download from Firebase Console → Project Settings → Service Accounts
2. Save as `serviceAccountKey.json` in project root
3. Set in `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```

> ⚠️ **Never commit `serviceAccountKey.json` to Git!**

---

## Security Best Practices

### ✅ Do

- Use strong, random API keys
- Keep `.env` out of version control
- Use different keys per environment
- Rotate keys periodically

### ❌ Don't

- Commit `.env` or service account files
- Share API keys in public channels
- Use the same key for dev and prod
- Hardcode secrets in code

---

## Validate Configuration

Run the server and check logs:

```bash
npm run dev
```

**Success Output:**
```
[info] Firebase initialized successfully
[info] Server running on port 3000
```

**Common Errors:**

| Error                            | Solution                        |
| -------------------------------- | ------------------------------- |
| `Firebase initialization failed` | Check Firebase credentials      |
| `Missing API_SECRET_KEY`         | Add API key to `.env`           |
| `ENOENT: serviceAccountKey.json` | Check file path or use env vars |

---

## Related Docs

- [Firebase Config](./firebase-config.md) - Detailed Firebase setup
- [Quick Start](./quick-start.md) - Get running fast
- [Deployment](./deployment.md) - Production config

---

<div align="center">

**[← Quick Start](./quick-start.md)** | **[Firebase Config →](./firebase-config.md)**

</div>
