# 🔥 Firebase Configuration

Setting up Firebase for the Tasker Backend.

---

## Prerequisites

- Firebase project created
- Firestore database enabled
- Service account credentials

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project**
3. Follow the setup wizard

---

## Step 2: Enable Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a region (same as your Flutter app)

---

## Step 3: Get Service Account

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Keep it secure!

---

## Step 4: Configure Backend

### Option A: Environment Variables

Extract values from the JSON file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Option B: Service Account File

1. Save JSON as `serviceAccountKey.json` in project root
2. Add to `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```
3. Ensure it's in `.gitignore`

---

## Firestore Collections

The backend uses these collections:

| Collection           | Purpose                   |
| -------------------- | ------------------------- |
| `tasks`              | Task documents            |
| `projects`           | Project documents         |
| `users`              | User profiles             |
| `cliq_user_mappings` | Cliq ↔ Tasker user links  |
| `cliq_task_mappings` | Task ↔ Cliq context links |

---

## Security Rules

Recommended Firestore rules for backend access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Backend has full access via Admin SDK
    // These rules apply to client access only
    
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /cliq_user_mappings/{mappingId} {
      allow read, write: if false; // Backend only
    }
  }
}
```

> 💡 The Admin SDK bypasses security rules. These rules protect client-side access.

---

## Verify Connection

Start the server and check logs:

```bash
npm run dev
```

**Success:**
```
[info] Firebase initialized successfully
[info] Connected to Firestore
```

**Test Query:**
```bash
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Invalid Credentials

```
Error: Credential implementation provided to initializeApp() via the "credential" property failed to fetch a valid Google OAuth2 access token
```

**Solution:** Check your service account credentials are correct.

### Project Not Found

```
Error: Project 'xxx' not found
```

**Solution:** Verify `FIREBASE_PROJECT_ID` matches your project.

### Permission Denied

```
Error: 7 PERMISSION_DENIED
```

**Solution:** Ensure the service account has proper IAM roles.

---

## Related Docs

- [Environment Setup](./environment-setup.md) - All environment variables
- [Database Schema](../architecture/database-schema.md) - Collection structure
- [Quick Start](./quick-start.md) - Get started

---

<div align="center">

**[← Environment Setup](./environment-setup.md)** | **[Deployment →](./deployment.md)**

</div>
