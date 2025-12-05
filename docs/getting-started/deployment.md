# 🚢 Deployment Guide

Deploy Tasker Backend to production.

---

## Deployment Options

| Platform                                | Difficulty | Cost                |
| --------------------------------------- | ---------- | ------------------- |
| [Azure App Service](#azure-app-service) | Easy       | Pay-as-you-go       |
| [Heroku](#heroku)                       | Easy       | Free tier available |
| [DigitalOcean](#digitalocean)           | Medium     | $5+/month           |
| [VPS with PM2](#vps-with-pm2)           | Medium     | Varies              |

---

## Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `API_SECRET_KEY`
- [ ] Configure production Firebase credentials
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for your domains
- [ ] Set up logging/monitoring

---

## Azure App Service

### Step 1: Create App Service

```bash
# Login to Azure
az login

# Create resource group
az group create --name tasker-rg --location eastus

# Create App Service plan
az appservice plan create --name tasker-plan --resource-group tasker-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group tasker-rg --plan tasker-plan --name tasker-backend --runtime "NODE:18-lts"
```

### Step 2: Configure Environment

```bash
az webapp config appsettings set --resource-group tasker-rg --name tasker-backend --settings \
  NODE_ENV=production \
  API_SECRET_KEY=your-key \
  FIREBASE_PROJECT_ID=your-project \
  FIREBASE_CLIENT_EMAIL=your-email \
  FIREBASE_PRIVATE_KEY="your-key"
```

### Step 3: Deploy

```bash
# Deploy from local
az webapp up --name tasker-backend --resource-group tasker-rg

# Or use GitHub Actions
```

---

## Heroku

### Step 1: Create App

```bash
heroku create tasker-backend
```

### Step 2: Set Environment

```bash
heroku config:set NODE_ENV=production
heroku config:set API_SECRET_KEY=your-key
heroku config:set FIREBASE_PROJECT_ID=your-project
heroku config:set FIREBASE_CLIENT_EMAIL=your-email
heroku config:set FIREBASE_PRIVATE_KEY="your-key"
```

### Step 3: Deploy

```bash
git push heroku main
```

---

## VPS with PM2

### Step 1: Install PM2

```bash
npm install -g pm2
```

### Step 2: Create Ecosystem File

`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'tasker-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Step 3: Start Application

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Nginx Reverse Proxy

Configure Nginx for HTTPS:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Environment Variables for Production

```env
NODE_ENV=production
PORT=3000

# Firebase (use production project)
FIREBASE_PROJECT_ID=tasker-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tasker-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="..."

# Strong API key
API_SECRET_KEY=<64-character-random-string>

# Zoho Cliq
CLIQ_WEBHOOK_URL=https://cliq.zoho.com/...

# JWT (for OAuth)
JWT_SECRET=<secure-random-string>
JWT_EXPIRES_IN=7d
```

---

## Monitoring

### Health Check Endpoint

```bash
curl https://your-api.com/api/health
```

### PM2 Monitoring

```bash
pm2 monit
pm2 logs tasker-backend
```

### Log Files

Production logs are written to:
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs

---

## SSL/TLS Certificates

### Let's Encrypt (Free)

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Azure/Heroku

SSL is included with custom domains.

---

## Related Docs

- [Environment Setup](./environment-setup.md) - Configuration
- [Quick Start](./quick-start.md) - Local development

---

<div align="center">

**[← Firebase Config](./firebase-config.md)** | **[Back to Docs](../README.md)**

</div>
