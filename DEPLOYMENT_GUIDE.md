# AIForge Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Vercel (Serverless)             │
├─────────────────────────────────────────┤
│  • Auth App (apps/auth)                 │
│  • Dashboard App (apps/app)             │
└─────────────────────────────────────────┘
              ↓ API calls via HTTP
┌─────────────────────────────────────────┐
│    Compute Engine VM                    │
│    IP: 34.93.216.110                    │
├─────────────────────────────────────────┤
│  • API Service (apps/api)               │
│  • Docker + Docker Compose              │
│  • Port 8000 (FastAPI)                  │
└─────────────────────────────────────────┘
              ↓ Deploys models
┌─────────────────────────────────────────┐
│         Cloud Run                       │
├─────────────────────────────────────────┤
│  • User ML Model Endpoints              │
└─────────────────────────────────────────┘
```

## Deployment Details

### 1. API Service (Compute Engine)

**VM Details:**
- **Name**: `aiforge-api`
- **External IP**: `34.93.216.110`
- **Machine Type**: e2-standard-2 (2 vCPUs, 8GB RAM)
- **Location**: asia-south1-a
- **OS**: Ubuntu 22.04 LTS
- **Port**: 8080 (open to public)

**API Endpoint:**
```
http://34.93.216.110:8080
```

**API Status:**
✅ Running and accessible

**SSH Access:**
```bash
gcloud compute ssh aiforge-api --zone=asia-south1-a --project=aiforge-2026
```

**Restart API:**
```bash
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="cd /opt/aiforge-api && docker-compose restart"
```

**View Logs:**
```bash
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="cd /opt/aiforge-api && docker-compose logs -f"
```

**Update API Code:**
```bash
# On local machine
cd apps/api
tar -czf /tmp/api-code.tar.gz .
gcloud compute scp /tmp/api-code.tar.gz aiforge-api:/opt/aiforge-api/ --zone=asia-south1-a

# On VM
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="cd /opt/aiforge-api && tar -xzf api-code.tar.gz && docker-compose up -d --build"
```

### 2. Auth App (Vercel)

**Deploy to Vercel:**
```bash
cd apps/auth
vercel --prod
```

**Environment Variables:**
```env
# Database
DATABASE_URL=postgres://bd0fdf1fdee23a8403a35bb28d8c0eaa033da222daafdd99515ccc4be2c7e2c3:sk_CHfofoo0xAXYWv2yFIg1v@db.prisma.io:5432/postgres?sslmode=require

# Auth
AUTH_SECRET=nTaS4YOZYo1cGtHi/JDWmcU5cCj7c1kPKqm3gyXiIvM=
AUTH_URL=https://YOUR_AUTH_DOMAIN.vercel.app
AUTH_GITHUB_ID=Ov23liJLNSiltzgXL4X0
AUTH_GITHUB_SECRET=72aa18956ba029ff92cfda4fbd14f173926a3d6d
AUTH_GOOGLE_ID=1058775271837-8euef4bq9gb89134jtklco64up8729l5.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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

# Dashboard URL (your dashboard Vercel deployment)
NEXT_PUBLIC_DASHBOARD_URL=https://YOUR_DASHBOARD_DOMAIN.vercel.app

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=no-reply@aiforge.host
SMTP_PASS=N+43e1I8Pb=e
```

### 3. Dashboard App (Vercel)

**Deploy to Vercel:**
```bash
cd apps/app
vercel --prod
```

**Environment Variables:**
```env
# Database
DATABASE_URL=postgres://bd0fdf1fdee23a8403a35bb28d8c0eaa033da222daafdd99515ccc4be2c7e2c3:sk_CHfofoo0xAXYWv2yFIg1v@db.prisma.io:5432/postgres?sslmode=require

# Auth
AUTH_SECRET=nTaS4YOZYo1cGtHi/JDWmcU5cCj7c1kPKqm3gyXiIvM=
AUTH_URL=https://YOUR_AUTH_DOMAIN.vercel.app

# API Service (Compute Engine VM)
NEXT_PUBLIC_API_URL=http://34.93.216.110:8080
API_INTERNAL_URL=http://34.93.216.110:8080

# App URLs
NEXT_PUBLIC_APP_URL=https://YOUR_DASHBOARD_DOMAIN.vercel.app
NEXT_PUBLIC_API_URL=https://YOUR_DASHBOARD_DOMAIN.vercel.app

# Google Cloud (for metrics and model deployment)
GOOGLE_CLOUD_PROJECT=aiforge-2026
GCS_BUCKET_MODELS=aiforge-models
GCS_BUCKET_BUILD=aiforge-build-sources
ARTIFACT_REGISTRY_REPO=asia-south1-docker.pkg.dev/aiforge-2026/aiforge-models-repo
CLOUD_RUN_REGION=asia-south1

# Google Cloud Credentials (upload service-account.json as secret)
# In Vercel: Settings > Environment Variables > Add File
GOOGLE_APPLICATION_CREDENTIALS=/var/task/service-account.json
```

**Upload Service Account:**
1. Go to Vercel Project Settings
2. Navigate to Environment Variables
3. Click "Add New"
4. Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
5. Upload: `apps/app/service-account.json`
6. Update code to use this env var to write the file

## Post-Deployment Steps

### 1. Update OAuth Redirect URLs

**Google OAuth:**
- Go to: https://console.cloud.google.com/apis/credentials
- Select your OAuth client ID
- Add redirect URIs:
  - `https://YOUR_AUTH_DOMAIN.vercel.app/api/auth/callback/google`

**GitHub OAuth:**
- Go to: https://github.com/settings/developers
- Select your OAuth app
- Update callback URL:
  - `https://YOUR_AUTH_DOMAIN.vercel.app/api/auth/callback/github`

### 2. Test API Connection

```bash
# Test API health
curl http://34.93.216.110:8080/health

# Expected response:
# {"status":"initializing","model_loaded":false,"model_id":null,"framework":null}

# Test from dashboard
# The dashboard should be able to call http://34.93.216.110:8080
```

### 3. Optional: Set up Custom Domain & SSL

**For Production:**
1. Point your domain to Vercel (auth.yourdomain.com, app.yourdomain.com)
2. Add SSL certificate
3. Update all environment variables with production URLs
4. Consider setting up Cloud Load Balancer for API service with SSL

**Add HTTPS to API (Optional):**
```bash
# Install Nginx on VM as reverse proxy
gcloud compute ssh aiforge-api --zone=asia-south1-a

sudo apt-get install nginx certbot python3-certbot-nginx
# Configure Nginx to proxy to localhost:8000
# Use Let's Encrypt for SSL
```

## Monitoring & Logs

### API Service
```bash
# View live logs
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="docker-compose -f /opt/aiforge-api/docker-compose.yml logs -f"

# Check service status
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="docker ps"
```

### Vercel Logs
```bash
vercel logs YOUR_DEPLOYMENT_URL
```

## Cost Estimate

- **Compute Engine VM** (e2-standard-2): ~$50/month
- **Vercel** (Hobby): Free (or Pro ~$20/month for teams)
- **Cloud Run**: Pay per use (~$0.24 per million requests)
- **Database** (Prisma Accelerate): Varies based on plan
- **Total**: ~$50-70/month

## Troubleshooting

### API Not Accessible
```bash
# Check firewall rules
gcloud compute firewall-rules list --filter="name=allow-api-port"

# Check if API is running
gcloud compute ssh aiforge-api --zone=asia-south1-a --command="docker ps"
```

### Dashboard Can't Connect to API
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check if VM IP is accessible: `curl http://34.93.216.110:8000/health`
- Ensure port 8000 is open in firewall

### OAuth Not Working
- Verify redirect URLs match exactly in OAuth provider settings
- Check AUTH_URL environment variable
- Ensure NEXT_PUBLIC_DASHBOARD_URL is correct

## Backup & Recovery

### Database
```bash
# Database is managed by Prisma - backups handled automatically
```

### API Code
```bash
# Code is in GitHub - redeploy from repository
# Or backup from VM:
gcloud compute scp --recurse aiforge-api:/opt/aiforge-api ./backup-api --zone=asia-south1-a
```
