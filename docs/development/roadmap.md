# 🗺️ Roadmap

Tasker Backend feature roadmap.

---

## Current Version: Phase 1 ✅

Core integration complete.

### Completed Features

| Feature        | Status | Description                        |
| -------------- | ------ | ---------------------------------- |
| API Foundation | ✅      | Express server with Firebase       |
| Task CRUD      | ✅      | Create, read, update, delete tasks |
| Authentication | ✅      | API key + OAuth/JWT                |
| Slash Command  | ✅      | `/tasker` command basics           |
| User Mapping   | ✅      | Cliq ↔ Tasker user linking         |

---

## Phase 2: Enhanced Cliq 🔄

**Status**: In Progress

### Features

| Feature       | Status | Description          |
| ------------- | ------ | -------------------- |
| TaskerBot     | 🔄      | Conversational bot   |
| Home Widget   | 🔄      | Task overview widget |
| Rich Cards    | ✅      | Card-based responses |
| Quick Actions | 🔄      | Button interactions  |

### Timeline

- Start: December 2025
- Target: January 2026

---

## Phase 3: Notifications 📋

**Status**: Planned

### Features

| Feature         | Status | Description                 |
| --------------- | ------ | --------------------------- |
| Task Reminders  | 📋      | Due date notifications      |
| Daily Summary   | 📋      | Morning task digest         |
| Overdue Alerts  | 📋      | Past-due notifications      |
| @Mention Alerts | 📋      | Collaboration notifications |

### Dependencies

- TaskerBot completion
- Cliq webhook integration

---

## Phase 4: Automation 📋

**Status**: Planned

### Features

| Feature         | Status | Description             |
| --------------- | ------ | ----------------------- |
| Scheduled Tasks | 📋      | Recurring task creation |
| Auto-Complete   | 📋      | Rule-based completion   |
| Template Tasks  | 📋      | Reusable task templates |
| Workflow Rules  | 📋      | Custom automation       |

---

## Phase 5: Collaboration 📋

**Status**: Planned

### Features

| Feature         | Status | Description            |
| --------------- | ------ | ---------------------- |
| Team Projects   | 📋      | Shared project spaces  |
| Task Assignment | 📋      | Assign to team members |
| Comments        | 📋      | Task discussions       |
| Activity Feed   | 📋      | Team activity stream   |

---

## Phase 6: Gamification 📋

**Status**: Planned

### Features

| Feature       | Status | Description              |
| ------------- | ------ | ------------------------ |
| Points System | 📋      | Earn points for tasks    |
| Streaks       | 📋      | Daily completion streaks |
| Achievements  | 📋      | Unlock badges            |
| Leaderboard   | 📋      | Team rankings            |

---

## Feature Requests

### High Priority

- [ ] Project filtering in Cliq
- [ ] Due date parsing (natural language)
- [ ] Subtask support
- [ ] File attachments

### Medium Priority

- [ ] Labels/tags support
- [ ] Task dependencies
- [ ] Time tracking
- [ ] Calendar integration

### Low Priority

- [ ] AI task suggestions
- [ ] Voice input
- [ ] Mobile push notifications
- [ ] Third-party integrations

---

## Contributing

1. Check existing issues/roadmap
2. Propose in GitHub Issues
3. Discuss approach
4. Submit PR

---

## Related Docs

- [Testing](./testing.md) - Test guide
- [Cliq Roadmap](../CLIQ_INTEGRATION_ROADMAP.md) - Detailed Cliq features
- [Deployment](../getting-started/deployment.md) - Production setup

---

<div align="center">

**[← Development](./README.md)** | **[Testing →](./testing.md)**

</div>
