# API Reference

Complete API documentation for Tasker Backend.

---

## Guides

| Guide                                   | Description       |
| --------------------------------------- | ----------------- |
| [🔌 Overview](./overview.md)             | API introduction  |
| [🔐 Authentication](./authentication.md) | API key and OAuth |
| [✅ Tasks API](./tasks.md)               | Task endpoints    |
| [🔗 Cliq Endpoints](./cliq-endpoints.md) | Cliq integration  |
| [⚠️ Error Codes](./error-codes.md)       | Error reference   |

---

## Quick Reference

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-api.com/api
```

### Authentication

```http
x-api-key: YOUR_API_KEY
# or
Authorization: Bearer YOUR_JWT_TOKEN
```

### Common Endpoints

| Method | Endpoint          | Description  |
| ------ | ----------------- | ------------ |
| GET    | `/health`         | Health check |
| POST   | `/tasks`          | Create task  |
| GET    | `/tasks`          | List tasks   |
| POST   | `/cliq/link-user` | Link user    |

---

<div align="center">

**[← Back to Docs](../README.md)**

</div>
