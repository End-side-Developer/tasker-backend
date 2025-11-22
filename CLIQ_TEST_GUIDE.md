# Tasker Backend - Cliq Integration Test

## Test Endpoints Created

### 1. **GET /api/test/hello** (Public)
Simple greeting endpoint to test connectivity.

**Example:**
```bash
GET http://localhost:3000/api/test/hello
```

**Response:**
```json
{
  "success": true,
  "message": "Hello from Tasker Backend! 👋",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

---

### 2. **GET /api/test/echo** (Public)
Echo back any query parameters sent.

**Example:**
```bash
GET http://localhost:3000/api/test/echo?name=John&city=Mumbai
```

**Response:**
```json
{
  "success": true,
  "message": "Echo response",
  "receivedParams": {
    "name": "John",
    "city": "Mumbai"
  },
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

---

### 3. **POST /api/test/greet** (Protected - Requires API Key/JWT)
Personalized greeting with name.

**Example:**
```bash
POST http://localhost:3000/api/test/greet
Headers: x-api-key: YOUR_API_KEY
Body: { "name": "John" }
```

**Response:**
```json
{
  "success": true,
  "message": "Hello, John! Welcome to Tasker Backend! 🎉",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

---

### 4. **POST /api/test/calculate** (Protected - Requires API Key/JWT)
Simple calculator for math operations.

**Example:**
```bash
POST http://localhost:3000/api/test/calculate
Headers: x-api-key: YOUR_API_KEY
Body: {
  "num1": 10,
  "num2": 5,
  "operation": "add"
}
```

**Operations:** `add`, `subtract`, `multiply`, `divide`

**Response:**
```json
{
  "success": true,
  "operation": "add",
  "num1": 10,
  "num2": 5,
  "result": 15,
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

---

## Zoho Cliq Slash Command Setup

### Step 1: Create Slash Command in Cliq

1. Go to Zoho Cliq → **Bots & Tools** → **Slash Commands**
2. Click **Create Slash Command**
3. Fill in:
   - **Command Name:** `/tasker`
   - **Description:** Test commands for Tasker Backend API
   - **Function Name:** `taskerTest` (or any name)

### Step 2: Copy Deluge Code

Copy the code from `cliq-slash-command.ds` into the slash command function editor.

### Step 3: Test Commands

Try these commands in any Cliq channel or chat:

#### Basic Commands (No Auth Required):
```
/tasker
/tasker hello
/tasker echo message=test&user=john&status=active
```

#### Protected Commands (Requires API Key):
```
/tasker greet name=John
/tasker calc 10 + 5
/tasker calc 100 / 4
/tasker calc 15 * 3
```

---

## Command Usage

### `/tasker`
Shows help with all available commands.

### `/tasker hello`
Simple greeting from the API.

**Example:**
```
/tasker hello
```
**Response:** ✅ Hello from Tasker Backend! 👋

---

### `/tasker echo param1=value1&param2=value2`
Echo back parameters.

**Example:**
```
/tasker echo name=John&role=Developer&location=Mumbai
```
**Response:**
```
Echo Response:
• name: John
• role: Developer
• location: Mumbai
```

---

### `/tasker greet name=YourName`
Personalized greeting.

**Example:**
```
/tasker greet name=Ashu
```
**Response:** ✅ Hello, Ashu! Welcome to Tasker Backend! 🎉

---

### `/tasker calc <num1> <operator> <num2>`
Calculator with operations: `+`, `-`, `*`, `/`

**Examples:**
```
/tasker calc 10 + 5
/tasker calc 100 - 25
/tasker calc 7 * 8
/tasker calc 50 / 2
```
**Response:**
```
🧮 Calculator Result:
10 + 5 = 15
```

---

## Testing Locally

### Start the Backend Server
```bash
cd "E:\AndroidStudioProjects\Tasker by Mantra\Tasker Backend"
npm run dev
```

### Test Endpoints Manually

**PowerShell:**
```powershell
# Test hello endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/test/hello"

# Test echo endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/test/echo?name=John&city=Mumbai"

# Test greet endpoint (requires API key)
$headers = @{ "x-api-key" = "34a8176cd72297093e2b349a6fb9b2443dffb51d8291cfe6711063cb4b6eafb3" }
$body = @{ name = "John" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/test/greet" -Method POST -Headers $headers -Body $body -ContentType "application/json"

# Test calculate endpoint (requires API key)
$body = @{ num1 = 10; num2 = 5; operation = "add" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/test/calculate" -Method POST -Headers $headers -Body $body -ContentType "application/json"
```

---

## Troubleshooting

### Connection Refused
- Make sure your backend server is running (`npm run dev`)
- Check if port 3000 is accessible
- For Cliq testing, use ngrok or deploy to cloud

### Authentication Failed (401)
- Verify API key is correct in Zoho Cliq connection settings
- Check `.env` file has correct `API_SECRET_KEY`

### Command Not Found
- Make sure slash command is saved and published in Cliq
- Try refreshing Cliq or re-typing the command

---

## Next Steps

1. ✅ Test all commands locally
2. 🚀 Deploy backend to production (Render/Railway/Heroku)
3. 🔄 Update Cliq connection with production URL
4. 📱 Create more advanced commands for task management
5. 🤖 Build a full Cliq bot with interactive cards and buttons

---

## Files Created

- `src/routes/testRoutes.js` - Test API endpoints
- `cliq-slash-command.ds` - Deluge code for Cliq slash command
- `CLIQ_TEST_GUIDE.md` - This guide

Happy testing! 🎉
