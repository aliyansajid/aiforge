# Vercel Deployment Guide

This guide explains how to deploy the AIForge applications to Vercel.

## Applications

- **Auth App**: https://aiforge-auth.vercel.app
- **Main App**: https://aiforge-app.vercel.app

## Prerequisites

1. Vercel account
2. GitHub repository connected to Vercel
3. Google Cloud service account credentials
4. Database (Prisma) setup

## Environment Variables Setup

### For `apps/auth` (aiforge-auth.vercel.app)

Set these environment variables in Vercel dashboard for the auth app:

```bash
# Authentication
AUTH_SECRET="nTaS4YOZYo1cGtHi/JDWmcU5cCj7c1kPKqm3gyXiIvM="
AUTH_URL=https://aiforge-auth.vercel.app
NEXT_PUBLIC_DASHBOARD_URL=https://aiforge-app.vercel.app

# OAuth Providers
AUTH_GITHUB_ID="Ov23liJLNSiltzgXL4X0"
AUTH_GITHUB_SECRET="72aa18956ba029ff92cfda4fbd14f173926a3d6d"
AUTH_GOOGLE_ID="1058775271837-8euef4bq9gb89134jtklco64up8729l5.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="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"

# SMTP Configuration
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
SMTP_USER="no-reply@aiforge.host"
SMTP_PASS="N+43e1I8Pb=e"

# Database
DATABASE_URL="postgres://bd0fdf1fdee23a8403a35bb28d8c0eaa033da222daafdd99515ccc4be2c7e2c3:sk_CHfofoo0xAXYWv2yFIg1v@db.prisma.io:5432/postgres?sslmode=require"
```

### For `apps/app` (aiforge-app.vercel.app)

Set these environment variables in Vercel dashboard for the main app:

```bash
# Authentication
AUTH_SECRET="nTaS4YOZYo1cGtHi/JDWmcU5cCj7c1kPKqm3gyXiIvM="
AUTH_URL=https://aiforge-app.vercel.app
NEXT_PUBLIC_APP_URL=https://aiforge-app.vercel.app
NEXT_PUBLIC_API_URL=https://aiforge-app.vercel.app
NEXT_PUBLIC_AUTH_URL=https://aiforge-auth.vercel.app

# OAuth Providers (same as auth app for unified auth)
AUTH_GITHUB_ID="Ov23liJLNSiltzgXL4X0"
AUTH_GITHUB_SECRET="72aa18956ba029ff92cfda4fbd14f173926a3d6d"
AUTH_GOOGLE_ID="1058775271837-8euef4bq9gb89134jtklco64up8729l5.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="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"

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=aiforge-2026
GOOGLE_APPLICATION_CREDENTIALS_BASE64=<BASE64_ENCODED_SERVICE_ACCOUNT_JSON>
GCS_BUCKET_MODELS=aiforge-models
GCS_BUCKET_BUILD=aiforge-build-sources
ARTIFACT_REGISTRY_REPO=asia-south1-docker.pkg.dev/aiforge-2026/aiforge-models-repo
CLOUD_RUN_REGION=asia-south1

# SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=no-reply@aiforge.host
SMTP_PASS="N+43e1I8Pb=e"
SMTP_REPLY_TO=no-reply@aiforge.host

# Database
DATABASE_URL="postgres://bd0fdf1fdee23a8403a35bb28d8c0eaa033da222daafdd99515ccc4be2c7e2c3:sk_CHfofoo0xAXYWv2yFIg1v@db.prisma.io:5432/postgres?sslmode=require"
```

## Google Cloud Service Account Setup

### Converting service-account.json to Base64

Vercel doesn't support file-based credentials, so you need to encode your `service-account.json` as base64:

#### On macOS/Linux:
```bash
cd apps/app
base64 -i service-account.json | tr -d '\n' > service-account-base64.txt
cat service-account-base64.txt
```

#### On Windows (PowerShell):
```powershell
cd apps\app
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json")) | Out-File -Encoding ASCII service-account-base64.txt
Get-Content service-account-base64.txt
```

Copy the output and set it as the `GOOGLE_APPLICATION_CREDENTIALS_BASE64` environment variable in Vercel.

### How It Works

The application automatically detects the environment:

- **Local Development**: Uses `GOOGLE_APPLICATION_CREDENTIALS` file path
- **Vercel Production**: Uses `GOOGLE_APPLICATION_CREDENTIALS_BASE64` environment variable

The `lib/gcp-credentials.ts` utility handles this automatically:
1. Checks for file-based credentials first (local)
2. Falls back to base64-encoded credentials (Vercel)
3. Decodes and writes to a temp file for GCP client libraries

## OAuth Provider Configuration

Since both apps have auth capabilities, you need to configure callbacks for BOTH domains:

### GitHub OAuth
Update your GitHub OAuth App settings:
- Homepage URL: `https://aiforge-auth.vercel.app`
- Authorization callback URLs:
  - `https://aiforge-auth.vercel.app/api/auth/callback/github`
  - `https://aiforge-app.vercel.app/api/auth/callback/github`

### Google OAuth
Update your Google OAuth Client settings:
- Authorized JavaScript origins:
  - `https://aiforge-auth.vercel.app`
  - `https://aiforge-app.vercel.app`
- Authorized redirect URIs:
  - `https://aiforge-auth.vercel.app/api/auth/callback/google`
  - `https://aiforge-app.vercel.app/api/auth/callback/google`

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Create two separate projects:
     - One for `apps/auth` → aiforge-auth.vercel.app
     - One for `apps/app` → aiforge-app.vercel.app

3. **Configure Project Settings**

   For **Auth App** (`apps/auth`):
   - Root Directory: `apps/auth`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

   For **Main App** (`apps/app`):
   - Root Directory: `apps/app`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from the respective section above
   - Select appropriate environment (Production, Preview, Development)

5. **Deploy**
   - Vercel will automatically deploy when you push to main
   - Or manually trigger deployment from Vercel dashboard

## Monorepo Configuration

Since this is a monorepo using npm workspaces, Vercel needs to build from the root:

### vercel.json (for apps/auth)
```json
{
  "buildCommand": "cd ../.. && npm run build --workspace=apps/auth",
  "installCommand": "cd ../.. && npm install"
}
```

### vercel.json (for apps/app)
```json
{
  "buildCommand": "cd ../.. && npm run build --workspace=apps/app",
  "installCommand": "cd ../.. && npm install"
}
```

## Troubleshooting

### Build Fails with "GOOGLE_APPLICATION_CREDENTIALS not found"
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_BASE64` is set in Vercel environment variables
- Verify the base64 string is properly encoded (no line breaks)

### OAuth Redirect Errors
- Check that callback URLs match exactly in OAuth provider settings
- Ensure `AUTH_URL` is set correctly

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if Prisma migrations are applied
- Ensure database allows connections from Vercel IPs

### Module Not Found Errors
- Clear build cache in Vercel
- Ensure all workspace dependencies are properly installed
- Check that `transpilePackages` in next.config.ts includes all internal packages

## Local Development

For local development, use the commented-out localhost URLs in your `.env` files:

```bash
# Uncomment these for local development
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
```

## Security Notes

- Never commit `.env` files to Git
- Rotate secrets regularly
- Use Vercel's encrypted environment variables for sensitive data
- Restrict service account permissions to minimum required

## Support

For issues:
1. Check Vercel deployment logs
2. Review Next.js build output
3. Verify all environment variables are set correctly
4. Ensure OAuth providers are configured for production URLs
