# Setup ngrok for Zoho Cliq Testing

Zoho Cliq cannot access `localhost` or local IP addresses. You need to use **ngrok** to create a public URL.

## Quick Setup

### 1. Start ngrok (in a new PowerShell window)

```powershell
ngrok http 3000
```

### 2. Copy the HTTPS URL

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

Copy the **HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

### 3. Update the Cliq Slash Command Code

Replace all instances of `http://localhost:3000` with your ngrok URL in the Deluge code:

```deluge
// Change this:
url: "http://localhost:3000/api/test/hello"

// To this (use YOUR ngrok URL):
url: "https://YOUR-NGROK-URL.ngrok-free.app/api/test/hello"
```

### 4. Test Commands

Now try in Zoho Cliq:
```
/tasker hello
/tasker echo test=123
/tasker greet name=Ashu
/tasker calc 10 + 5
```

---

## Alternative: Deploy to Cloud (Production)

Instead of ngrok, deploy your backend to a cloud platform:

### Option 1: Render.com (Free)
1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repo
4. Deploy with one click
5. Get your public URL: `https://yourapp.onrender.com`

### Option 2: Railway.app (Free)
1. Go to https://railway.app
2. Create new project from GitHub
3. Deploy automatically
4. Get your public URL: `https://yourapp.railway.app`

### Option 3: Heroku (Paid)
1. Create Heroku account
2. `heroku create yourapp`
3. `git push heroku main`
4. Get URL: `https://yourapp.herokuapp.com`

---

## Quick Replace Script

Once you have your ngrok URL, run this PowerShell command to update the Deluge file:

```powershell
# Replace YOUR_NGROK_URL with your actual ngrok URL
$ngrokUrl = "https://abc123.ngrok-free.app"  # <-- CHANGE THIS
$file = "cliq-slash-command.ds"
(Get-Content $file) -replace 'http://localhost:3000', $ngrokUrl | Set-Content $file
Write-Host "✅ Updated URLs in $file"
```

Then copy the updated code to Zoho Cliq!

---

## Important Notes

- **ngrok URL changes** every time you restart ngrok (unless you have a paid account)
- **Free tier** has limitations but works fine for testing
- For **production**, deploy to a cloud platform instead
- Make sure your **backend server is running** (`npm run dev`)
