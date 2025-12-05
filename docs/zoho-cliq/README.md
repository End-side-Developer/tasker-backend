# Zoho Cliq Integration

Complete guide for Zoho Cliq integration with Tasker.

---

## Guides

| Guide                                   | Description          |
| --------------------------------------- | -------------------- |
| [🔌 Overview](./overview.md)             | Integration overview |
| [⚡ Slash Commands](./slash-commands.md) | Command reference    |
| [🤖 Bot Integration](./bot.md)           | TaskerBot setup      |
| [🔔 Webhooks](./webhooks.md)             | Event webhooks       |
| [📋 Widgets](./widgets.md)               | Home widgets         |
| [📝 Forms](./forms.md)                   | Interactive forms    |

---

## Quick Links

- [Developer Guide](../ZOHO_CLIQ_DEVELOPER_GUIDE.md) - Comprehensive reference
- [Integration Roadmap](../development/roadmap.md) - Feature roadmap
- [Cliq API Endpoints](../api/cliq-endpoints.md) - Backend endpoints

---

## Architecture

```
Zoho Cliq                    Tasker Backend              Firestore
    │                              │                         │
    ├── Slash Command ────────────►│                         │
    │                              ├── Query Tasks ─────────►│
    │◄──────── Rich Card ──────────┤◄──────── Results ───────┤
    │                              │                         │
    ├── Bot Message ──────────────►│                         │
    │                              ├── Process ─────────────►│
    │◄──────── Response ───────────┤◄──────── Confirm ───────┤
    │                              │                         │
    ├── Widget Request ───────────►│                         │
    │                              ├── Aggregate ───────────►│
    │◄──────── Widget Data ────────┤◄──────── Stats ─────────┤
```

---

## Features

| Feature        | Status | Description         |
| -------------- | ------ | ------------------- |
| Slash Commands | ✅      | `/tasker` command   |
| TaskerBot      | ✅      | Conversational bot  |
| Home Widget    | ✅      | Task overview       |
| Webhooks       | ✅      | Real-time sync      |
| Forms          | ✅      | Interactive dialogs |

---

<div align="center">

**[← Back to Docs](../README.md)**

</div>
