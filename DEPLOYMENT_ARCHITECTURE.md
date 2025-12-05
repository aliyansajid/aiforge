# Deployment Architecture - IMPORTANT

## ⚠️ Cross-Domain Session Issue

**Problem:** Cookies don't work across different domains (`aiforge-auth.vercel.app` vs `aiforge-app.vercel.app`)

When you log in on `aiforge-auth.vercel.app`, the session cookie is set for that domain only. When you navigate to `aiforge-app.vercel.app`, the browser doesn't send the cookie, so you appear logged out.

## ✅ Recommended Solution: Single App Deployment

Deploy **ONLY** `apps/app` which contains:
- ✅ Authentication routes (`/api/auth/[...nextauth]`)
- ✅ Login pages (can be copied from `apps/auth`)
- ✅ Dashboard and all features

### Deployment Steps:

1. **Deploy only `aiforge-app.vercel.app`**
   - Root Directory: `apps/app`
   - This app has everything needed

2. **Do NOT deploy `apps/auth` separately**
   - The auth app was designed for local development
   - It won't work properly on a separate domain

3. **Update OAuth Callbacks**
   - Use only `https://aiforge-app.vercel.app/api/auth/callback/google`
   - Use only `https://aiforge-app.vercel.app/api/auth/callback/github`

4. **Add Login/Signup Pages to `apps/app`**
   - Copy from `apps/auth/app/(auth)/*` to `apps/app/app/(auth)/*`
   - Update imports and paths

## Alternative: Custom Domain with Subdomains

If you have a custom domain (e.g., `aiforge.com`):

1. **Set up subdomains:**
   - `auth.aiforge.com` → `apps/auth`
   - `app.aiforge.com` → `apps/app`

2. **Configure cookie domain:**
   - Set cookie domain to `.aiforge.com` (note the leading dot)
   - This allows cookies to work across subdomains

3. **Update NextAuth config:**
   ```typescript
   cookies: {
     sessionToken: {
       name: `__Secure-next-auth.session-token`,
       options: {
         httpOnly: true,
         sameSite: 'lax',
         path: '/',
         secure: true,
         domain: '.aiforge.com' // Works for all subdomains
       }
     }
   }
   ```

## Current Status

- ✅ `apps/app` deployed at `https://aiforge-app.vercel.app`
- ⚠️ `apps/auth` deployed at `https://aiforge-auth.vercel.app` (won't work due to cross-domain)
- ✅ Database and Google Cloud configured
- ⚠️ Need to add login pages to `apps/app`

## Next Steps

1. Copy login/signup pages from `apps/auth` to `apps/app`
2. Update `apps/app/.env` to use itself for auth
3. Redeploy `apps/app`
4. Pause/delete `apps/auth` deployment (it's not needed)
