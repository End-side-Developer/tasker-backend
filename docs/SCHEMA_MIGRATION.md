# Backend Schema Migration Guide

> **Status**: Backend code updated to match Flutter app Firestore schema  
> **Date**: January 2025  
> **Priority**: HIGH - Required for data consistency

---

## Summary of Changes

### What Was Fixed

1. **Tasks Collection**
   - ❌ Removed: `taskId` (redundant - use document ID)
   - ❌ Removed: `priority` (not in schema)
   - ❌ Removed: `tags` (not in schema)
   - ❌ Removed: `createdBy` (not in schema)
   - ❌ Removed: `createdByName` (not in schema)
   - ❌ Removed: `assignedTo` (single user)
   - ❌ Removed: `assignedToName` (not in schema)
   - ❌ Removed: `completedBy` (not in schema)
   - ❌ Removed: `completedByName` (not in schema)
   - ❌ Removed: `completedAt` (not in schema)
   - ❌ Removed: `completionNotes` (not in schema)
   - ❌ Removed: `cliqContext` (Cliq-specific)
   - ✅ Added: `isDescriptionEncrypted` (boolean)
   - ✅ Added: `reminderEnabled` (boolean)
   - ✅ Added: `assignees` (array of user IDs)
   - ✅ Added: `assignedBy` (string | null)
   - ✅ Added: `assignedAt` (timestamp | null)
   - ✅ Added: `recurrencePattern` (enum string)
   - ✅ Added: `recurrenceInterval` (number)
   - ✅ Added: `recurrenceEndDate` (timestamp | null)
   - ✅ Added: `parentRecurringTaskId` (string | null)
   - ✅ Fixed: `description` now nullable (was empty string)
   - ✅ Fixed: `updatedAt` starts as null (not serverTimestamp)

2. **Projects Collection**
   - ❌ Removed: `projectId` (redundant)
   - ❌ Removed: `color` (not in schema)
   - ❌ Removed: `icon` (not in schema)
   - ❌ Removed: `ownerName` (not in schema)
   - ✅ Added: `members` (array of user IDs)
   - ✅ Added: `memberRoles` (map of userId -> role)
   - ✅ Fixed: `description` now nullable
   - ✅ Fixed: `updatedAt` starts as null
   - ✅ Added: `members` subcollection with detailed member info

3. **Invitations Collection**
   - ❌ Removed: `invitationId` (redundant)
   - ❌ Removed: `invitedBy` (unclear - renamed)
   - ❌ Removed: `invitedByName` (unclear - renamed)
   - ✅ Added: `invitedByUserId` (string)
   - ✅ Added: `invitedByUserName` (string)
   - ✅ Added: `invitedUserId` (string | null - if registered)
   - ✅ Added: `message` (string | null)
   - ✅ Added: `respondedAt` (timestamp | null)
   - ✅ Added: `users/{userId}/pendingInvitations` subcollection

4. **General**
   - ✅ Fixed: All emails stored in lowercase
   - ✅ Fixed: `updatedAt` starts as `null`, not `serverTimestamp()`
   - ✅ Fixed: Enums stored as lowercase strings
   - ✅ Fixed: Document IDs used directly (no redundant ID fields)

---

## Testing Before Deployment

### 1. Local Testing

```bash
# In Tasker Backend directory
npm test  # Run any existing tests

# Manual test with curl
curl -X POST http://localhost:3000/api/cliq/commands/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Testing new schema",
    "projectId": "test-project-id",
    "cliqContext": {
      "userId": "test-user",
      "userName": "Test User",
      "userEmail": "test@example.com"
    }
  }'
```

### 2. Firestore Console Verification

After creating test data, check Firestore console:

**Tasks Document Should Look Like**:
```javascript
{
  projectId: "proj123",
  title: "Test Task",
  description: null,
  isDescriptionEncrypted: false,
  dueDate: null,
  status: "pending",
  reminderEnabled: false,
  assignees: ["user123"],
  assignedBy: "user123",
  assignedAt: Timestamp,
  recurrencePattern: "none",
  recurrenceInterval: 1,
  recurrenceEndDate: null,
  parentRecurringTaskId: null,
  createdAt: Timestamp,
  updatedAt: null
}
```

**Projects Document Should Look Like**:
```javascript
{
  name: "Test Project",
  description: null,
  members: ["user123"],
  ownerId: "user123",
  memberRoles: {
    user123: "owner"
  },
  createdAt: Timestamp,
  updatedAt: null
}
```

### 3. Flutter App Testing

1. **Create task from Zoho Cliq**: `/tasker create "Test task from Cliq"`
2. **Open Flutter app**: Verify task appears correctly
3. **Modify task in Flutter**: Change status, add description
4. **Check Zoho Cliq**: Verify changes sync properly

---

## Deployment Steps

### Option 1: Zero-Downtime Deployment (Recommended)

Since the backend is already deployed and being used:

1. **Deploy code changes** (already backward compatible):
   ```bash
   git add .
   git commit -m "fix: update backend to match Flutter Firestore schema"
   git push origin main
   ```

2. **Monitor logs** for any errors:
   ```bash
   # Check your hosting platform logs
   # Render: https://dashboard.render.com/
   # Heroku: heroku logs --tail
   ```

3. **Test with Flutter app**: Create/update tasks, projects, invitations

4. **Clean up old data** (optional - only if needed):
   ```javascript
   // Firestore console or Cloud Functions
   // Remove redundant fields from existing documents
   ```

### Option 2: Full Migration (If Data Cleanup Needed)

Only use this if you have old documents with incorrect schema:

1. **Backup Firestore**:
   ```bash
   gcloud firestore export gs://[BUCKET_NAME]
   ```

2. **Deploy new code** (as above)

3. **Run migration script**:
   ```javascript
   // migration.js - Run once
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();

   async function migrateTasks() {
     const tasksRef = db.collection('tasks');
     const snapshot = await tasksRef.get();
     
     const batch = db.batch();
     let count = 0;
     
     snapshot.forEach(doc => {
       const data = doc.data();
       const updates = {};
       
       // Remove old fields
       if ('taskId' in data) updates.taskId = admin.firestore.FieldValue.delete();
       if ('priority' in data) updates.priority = admin.firestore.FieldValue.delete();
       if ('tags' in data) updates.tags = admin.firestore.FieldValue.delete();
       if ('createdBy' in data) updates.createdBy = admin.firestore.FieldValue.delete();
       
       // Add new fields if missing
       if (!('isDescriptionEncrypted' in data)) updates.isDescriptionEncrypted = false;
       if (!('reminderEnabled' in data)) updates.reminderEnabled = false;
       if (!('recurrencePattern' in data)) updates.recurrencePattern = 'none';
       if (!('recurrenceInterval' in data)) updates.recurrenceInterval = 1;
       
       // Fix assignees field
       if ('assignedTo' in data && !('assignees' in data)) {
         updates.assignees = [data.assignedTo];
         updates.assignedTo = admin.firestore.FieldValue.delete();
       }
       
       if (Object.keys(updates).length > 0) {
         batch.update(doc.ref, updates);
         count++;
       }
     });
     
     if (count > 0) {
       await batch.commit();
       console.log(`Migrated ${count} tasks`);
     }
   }

   migrateTasks().catch(console.error);
   ```

---

## Backward Compatibility Notes

### Safe Changes (Already Compatible)

✅ **Adding new fields**: Flutter app and backend both handle extra fields gracefully  
✅ **Renaming stored fields**: New code writes correct fields, old data can coexist  
✅ **Changing field types**: Timestamp vs string handled by converters

### Breaking Changes (Handled)

⚠️ **Removing `priority` field**: Zoho Cliq commands no longer accept priority parameter  
⚠️ **Removing `tags` field**: Zoho Cliq commands no longer accept tags parameter  
⚠️ **Changing `assignedTo` to `assignees`**: Backend now uses array instead of single user

**Solution**: Old commands that used these fields will simply ignore them. No data loss.

---

## Verification Checklist

After deployment, verify:

- [ ] **Zoho Cliq slash commands work**: `/tasker create "Test"`, `/tasker list`
- [ ] **Flutter app syncs data**: Create task in Cliq, see in app
- [ ] **Bidirectional sync works**: Edit in app, see in Firestore
- [ ] **Projects creation works**: Both from Cliq and app
- [ ] **Invitations work**: Send via Cliq, receive in app
- [ ] **No console errors**: Check browser console in Flutter web app
- [ ] **No backend errors**: Check deployment logs
- [ ] **Firestore documents match schema**: Spot check in console

---

## Rollback Plan

If issues occur:

1. **Revert code changes**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Restore Firestore backup** (if migration was run):
   ```bash
   gcloud firestore import gs://[BUCKET_NAME]/[EXPORT_FOLDER]
   ```

3. **Check deployment logs** to identify issue

---

## Post-Deployment

1. **Update API documentation**: Reflect new field names in API docs
2. **Update Zoho Cliq help**: Remove mentions of `priority` and `tags` parameters
3. **Monitor error rates**: Check for any schema-related errors in logs
4. **Notify team**: Inform team about field changes if they're querying Firestore directly

---

## Future Schema Changes

To avoid similar issues:

1. **Always check `docs/firebase-firestore-structure.md`** before implementing features
2. **Use TypeScript** for type safety (optional improvement)
3. **Add schema validation** in backend middleware
4. **Run tests** before deploying to catch schema mismatches
5. **Document all changes** in this migration guide

---

## Questions?

If you encounter issues:

1. Check Firestore console for document structure
2. Check Flutter app logs (run `flutter logs`)
3. Check backend logs on your hosting platform
4. Verify indexes exist for queries (Firebase console → Firestore → Indexes)
5. Test with a fresh Firestore instance if needed

---

**Last Updated**: January 2025  
**Status**: ✅ Ready for deployment
