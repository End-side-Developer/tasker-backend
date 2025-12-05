# 🚀 Quick Start

Get the Tasker Backend running in minutes.

---

## Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Firebase** project with Firestore
- **Git**

---

## Installation

```bash
# Clone the repository
git clone https://github.com/ashu-debuger/tasker-app.git
cd "Tasker Backend"

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

---

## Configuration

Edit `.env` with your values:

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# API Security
API_SECRET_KEY=your-secure-api-key

# Zoho Cliq (optional)
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/...
```

See [Environment Setup](./environment-setup.md) for details.

---

## Run the Server

### Development Mode
```bash
npm run dev
```
Server starts at `http://localhost:3000` with auto-reload.

### Production Mode
```bash
npm start
```

---

## Verify Installation

### Health Check
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-05T..."
}
```

### Test API Endpoint
```bash
curl http://localhost:3000/api/tasks \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Next Steps

- [Environment Setup](./environment-setup.md) - Complete configuration
- [Firebase Config](./firebase-config.md) - Database setup
- [API Overview](../api/overview.md) - Start using the API
- [Deployment](./deployment.md) - Deploy to production

---

<div align="center">

**[← Back to Docs](../README.md)** | **[Environment Setup →](./environment-setup.md)**

</div>
