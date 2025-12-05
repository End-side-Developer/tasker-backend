# ⚠️ Error Codes

API error codes reference.

---

## Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

## Authentication Errors

| Code                       | HTTP | Description                |
| -------------------------- | ---- | -------------------------- |
| `AUTH_REQUIRED`            | 401  | No authentication provided |
| `INVALID_API_KEY`          | 401  | API key is invalid         |
| `INVALID_TOKEN`            | 401  | JWT token is invalid       |
| `TOKEN_EXPIRED`            | 401  | JWT token has expired      |
| `INSUFFICIENT_PERMISSIONS` | 403  | User lacks permission      |

---

## Validation Errors

| Code                     | HTTP | Description                 |
| ------------------------ | ---- | --------------------------- |
| `VALIDATION_ERROR`       | 400  | Input validation failed     |
| `MISSING_REQUIRED_FIELD` | 400  | Required field not provided |
| `INVALID_FORMAT`         | 400  | Field format is invalid     |
| `INVALID_PRIORITY`       | 400  | Invalid priority value      |
| `INVALID_STATUS`         | 400  | Invalid status value        |

---

## Resource Errors

| Code                 | HTTP | Description            |
| -------------------- | ---- | ---------------------- |
| `TASK_NOT_FOUND`     | 404  | Task does not exist    |
| `PROJECT_NOT_FOUND`  | 404  | Project does not exist |
| `USER_NOT_FOUND`     | 404  | User does not exist    |
| `USER_NOT_LINKED`    | 404  | Cliq user not linked   |
| `RESOURCE_NOT_FOUND` | 404  | Generic not found      |

---

## Rate Limiting Errors

| Code                  | HTTP | Description       |
| --------------------- | ---- | ----------------- |
| `RATE_LIMIT_EXCEEDED` | 429  | Too many requests |

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701781200
```

---

## Server Errors

| Code                     | HTTP | Description                    |
| ------------------------ | ---- | ------------------------------ |
| `INTERNAL_ERROR`         | 500  | Unexpected server error        |
| `DATABASE_ERROR`         | 500  | Database operation failed      |
| `EXTERNAL_SERVICE_ERROR` | 502  | External API failed            |
| `SERVICE_UNAVAILABLE`    | 503  | Server temporarily unavailable |

---

## Cliq-Specific Errors

| Code                   | HTTP | Description               |
| ---------------------- | ---- | ------------------------- |
| `CLIQ_USER_NOT_LINKED` | 400  | User not linked to Tasker |
| `CLIQ_COMMAND_INVALID` | 400  | Invalid slash command     |
| `CLIQ_WEBHOOK_FAILED`  | 500  | Webhook processing failed |
| `CLIQ_CONTEXT_MISSING` | 400  | Missing Cliq context      |

---

## Example Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Title is required",
  "code": "MISSING_REQUIRED_FIELD",
  "field": "title"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 15 minutes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR"
}
```

---

## Handling Errors

### JavaScript Example

```javascript
try {
  const response = await fetch('/api/tasks', {
    headers: { 'x-api-key': API_KEY }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    switch (data.code) {
      case 'AUTH_REQUIRED':
        redirectToLogin();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        await wait(data.retryAfter * 1000);
        retry();
        break;
      default:
        showError(data.error);
    }
  }
} catch (error) {
  showError('Network error');
}
```

### Deluge Example (Cliq)

```deluge
response = invokeurl[...];

if (response.get("success") == false) {
    errorCode = response.get("code");
    if (errorCode == "USER_NOT_LINKED") {
        return {"text": "Please link your account first"};
    }
    return {"text": "Error: " + response.get("error")};
}
```

---

## Related Docs

- [API Overview](./overview.md) - API introduction
- [Authentication](./authentication.md) - Auth methods

---

<div align="center">

**[← Cliq Endpoints](./cliq-endpoints.md)** | **[Back to Docs](../README.md)**

</div>
