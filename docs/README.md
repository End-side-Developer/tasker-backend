# 📚 Tasker Backend Documentation

Welcome to the Tasker Backend documentation! This guide helps you understand, set up, and integrate with the Node.js backend.

---

## 🗂️ Quick Navigation

| Section                                | Description             |
| -------------------------------------- | ----------------------- |
| [🚀 Getting Started](#-getting-started) | Setup and installation  |
| [🔌 API Reference](#-api-reference)     | Endpoints and usage     |
| [🔗 Zoho Cliq](#-zoho-cliq-integration) | Cliq integration guides |
| [🏗️ Architecture](#️-architecture)       | Backend structure       |
| [📋 Development](#-development)         | Roadmap and testing     |

---

## 🔍 Search by Topic

| Looking for...         | Go to                                                       |
| ---------------------- | ----------------------------------------------------------- |
| How to install?        | [Quick Start](./getting-started/quick-start.md)             |
| Environment variables? | [Environment Setup](./getting-started/environment-setup.md) |
| Firebase setup?        | [Firebase Config](./getting-started/firebase-config.md)     |
| Deploy to production?  | [Deployment](./getting-started/deployment.md)               |
| API endpoints?         | [API Overview](./api/overview.md)                           |
| Authentication?        | [Authentication](./api/authentication.md)                   |
| Task operations?       | [Tasks API](./api/tasks.md)                                 |
| Error handling?        | [Error Codes](./api/error-codes.md)                         |
| Cliq slash commands?   | [Slash Commands](./zoho-cliq/slash-commands.md)             |
| TaskerBot?             | [Bot Integration](./zoho-cliq/bot.md)                       |
| Cliq widgets?          | [Widgets](./zoho-cliq/widgets.md)                           |
| Database schema?       | [Database Schema](./architecture/database-schema.md)        |
| Project structure?     | [Project Structure](./architecture/project-structure.md)    |
| Security?              | [Security](./architecture/security.md)                      |
| Feature roadmap?       | [Roadmap](./development/roadmap.md)                         |
| Testing?               | [Testing](./development/testing.md)                         |

---

## 🚀 Getting Started

New to Tasker Backend? Start here!

| Guide                                                         | Description                     |
| ------------------------------------------------------------- | ------------------------------- |
| [🚀 Quick Start](./getting-started/quick-start.md)             | Get up and running in minutes   |
| [🔧 Environment Setup](./getting-started/environment-setup.md) | Configure environment variables |
| [🔥 Firebase Config](./getting-started/firebase-config.md)     | Firebase service account setup  |
| [🚢 Deployment](./getting-started/deployment.md)               | Deploy to production            |

---

## 🔌 API Reference

Complete API documentation.

| Guide                                       | Description                  |
| ------------------------------------------- | ---------------------------- |
| [🔌 API Overview](./api/overview.md)         | Introduction and conventions |
| [🔐 Authentication](./api/authentication.md) | API key and OAuth/JWT        |
| [✅ Tasks API](./api/tasks.md)               | Task CRUD operations         |
| [🔗 Cliq Endpoints](./api/cliq-endpoints.md) | Cliq-specific endpoints      |
| [⚠️ Error Codes](./api/error-codes.md)       | Error reference              |

### Quick API Reference

| Endpoint                  | Method | Description          |
| ------------------------- | ------ | -------------------- |
| `/api/health`             | GET    | Health check         |
| `/api/tasks`              | POST   | Create task          |
| `/api/tasks`              | GET    | List tasks           |
| `/api/tasks/:id`          | GET    | Get task             |
| `/api/tasks/:id`          | PUT    | Update task          |
| `/api/tasks/:id/complete` | POST   | Complete task        |
| `/api/cliq/link-user`     | POST   | Link Cliq user       |
| `/api/cliq/command`       | POST   | Handle slash command |
| `/api/cliq/widget`        | GET    | Get widget data      |

---

## 🔗 Zoho Cliq Integration

Connect Tasker to Zoho Cliq.

| Guide                                             | Description              |
| ------------------------------------------------- | ------------------------ |
| [🔌 Overview](./zoho-cliq/overview.md)             | Integration architecture |
| [⚡ Slash Commands](./zoho-cliq/slash-commands.md) | `/tasker` command        |
| [🤖 Bot Integration](./zoho-cliq/bot.md)           | TaskerBot setup          |
| [🔔 Webhooks](./zoho-cliq/webhooks.md)             | Real-time events         |
| [📋 Widgets](./zoho-cliq/widgets.md)               | Home widgets             |
| [📝 Forms](./zoho-cliq/forms.md)                   | Interactive forms        |



---

## 🏗️ Architecture

Understand the backend structure.

| Guide                                                      | Description           |
| ---------------------------------------------------------- | --------------------- |
| [📁 Project Structure](./architecture/project-structure.md) | Codebase organization |
| [🗄️ Database Schema](./architecture/database-schema.md)     | Firestore collections |
| [🔐 Security](./architecture/security.md)                   | Auth and security     |

---

## 📋 Development

For contributors and developers.

| Guide                                                          | Description            |
| -------------------------------------------------------------- | ---------------------- |
| [🗺️ Roadmap](./development/roadmap.md)                          | Feature roadmap        |
| [🧪 Testing](./development/testing.md)                          | Testing guide          |
| [📋 Feature Planning](./development/feature-planning/README.md) | Detailed feature plans |

---

## 🛠️ Guides

Practical development and testing guides.

| Guide                                            | Description              |
| ------------------------------------------------ | ------------------------ |
| [🧪 Cliq Test Guide](./guides/CLIQ_TEST_GUIDE.md) | Testing Cliq integration |
| [📋 Quick Reference](./guides/QUICK_REFERENCE.md) | Command syntax reference |
| [🔗 ngrok Setup](./guides/SETUP_NGROK.md)         | Local webhook testing    |

---

## 📖 Reference Documentation

Detailed reference docs for advanced use cases.

**[→ All Reference Docs](./reference/README.md)**

| Document                                                         | Description              |
| ---------------------------------------------------------------- | ------------------------ |
| [API Integration](./reference/API_INTEGRATION.md)                | Complete API reference   |
| [Cliq Developer Guide](./reference/ZOHO_CLIQ_DEVELOPER_GUIDE.md) | Comprehensive Cliq guide |
| [Firestore Schema](./reference/FIRESTORE_SCHEMA.md)              | Database schema details  |
| [Integration Roadmap](./reference/CLIQ_INTEGRATION_ROADMAP.md)   | Feature roadmap          |

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

---

## 🔐 Authentication Quick Reference

| Method       | Header                        | Use Case                      |
| ------------ | ----------------------------- | ----------------------------- |
| API Key      | `x-api-key: YOUR_KEY`         | Cliq extensions, server calls |
| Bearer Token | `Authorization: Bearer TOKEN` | Flutter app, OAuth            |

---

<div align="center">

📖 **Documentation Version**: 2.0  
📅 **Last Updated**: December 2025

**[Main README](../README.md)** | **[Flutter App Docs](../../tasker/docs/README.md)**

</div>
