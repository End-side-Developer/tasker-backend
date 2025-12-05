# 🛠️ Development Guides

Practical guides for developing and testing Tasker Backend.

---

## Guides

| Guide                                     | Description              |
| ----------------------------------------- | ------------------------ |
| [🧪 Cliq Test Guide](./CLIQ_TEST_GUIDE.md) | Testing Cliq integration |
| [📋 Quick Reference](./QUICK_REFERENCE.md) | Command syntax reference |
| [🔗 ngrok Setup](./SETUP_NGROK.md)         | Local webhook testing    |

---

## Quick Links

### Testing Locally

```bash
# Start server
npm run dev

# Use ngrok for Cliq testing
ngrok http 3000
```

### Command Testing

```
/tasker hello
/tasker list
/tasker create "Task" priority:high
```

---

<div align="center">

**[← Back to Docs](../README.md)**

</div>
