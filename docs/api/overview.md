# 🔌 API Overview

Introduction to the Tasker Backend API.

---

## Base URL

| Environment | URL                         |
| ----------- | --------------------------- |
| Development | `http://localhost:3000/api` |
| Production  | `https://your-api.com/api`  |

---

## Authentication

All endpoints (except `/health`) require authentication.

### API Key (Simple)

```http
GET /api/tasks
x-api-key: your-api-key
```

### Bearer Token (OAuth)

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

See [Authentication](./authentication.md) for details.

---

## Response Format

All responses are JSON:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Available Endpoints

### Health

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

### Tasks

| Method | Endpoint              | Description   |
| ------ | --------------------- | ------------- |
| POST   | `/tasks`              | Create task   |
| GET    | `/tasks`              | List tasks    |
| GET    | `/tasks/:id`          | Get task      |
| PUT    | `/tasks/:id`          | Update task   |
| POST   | `/tasks/:id/complete` | Complete task |
| DELETE | `/tasks/:id`          | Delete task   |

### Cliq Integration

| Method | Endpoint                 | Description      |
| ------ | ------------------------ | ---------------- |
| POST   | `/cliq/link-user`        | Link Cliq user   |
| GET    | `/cliq/user/:cliqUserId` | Get user mapping |
| POST   | `/cliq/webhook`          | Webhook handler  |
| POST   | `/cliq/command`          | Command handler  |
| GET    | `/cliq/widget`           | Widget data      |

### Auth (OAuth)

| Method | Endpoint         | Description      |
| ------ | ---------------- | ---------------- |
| GET    | `/auth/login`    | Start OAuth flow |
| GET    | `/auth/callback` | OAuth callback   |
| POST   | `/auth/refresh`  | Refresh token    |
| POST   | `/auth/logout`   | Logout           |

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Common Headers

| Header          | Required | Description                     |
| --------------- | -------- | ------------------------------- |
| `x-api-key`     | Yes*     | API key authentication          |
| `Authorization` | Yes*     | Bearer token (OAuth)            |
| `Content-Type`  | Yes      | `application/json` for POST/PUT |

*One of `x-api-key` or `Authorization` required.

---

## Quick Examples

### Create Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Task", "priority": "high"}'
```

### List Tasks

```bash
curl http://localhost:3000/api/tasks \
  -H "x-api-key: YOUR_KEY"
```

---

## Related Docs

- [Authentication](./authentication.md) - API key and OAuth
- [Tasks API](./tasks.md) - Task endpoints
- [Cliq API](./cliq-endpoints.md) - Cliq integration
- [Error Codes](./error-codes.md) - Error reference

---

<div align="center">

**[← Back to Docs](../README.md)** | **[Authentication →](./authentication.md)**

</div>
