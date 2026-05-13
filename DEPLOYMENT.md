# Deployment

Recommended free MVP setup:

- Frontend: Vercel, project root `medilink-frontend-v2-polished`
- Backend API: Render, project root `medilink-backend-mvp`
- Database: Supabase Postgres

## 1. Supabase

Create a free Supabase project, then copy the Postgres connection string.

Use the pooled connection string if Supabase offers one. Prisma accepts both the direct and pooled Postgres URLs.

## 2. Render API

Create a new Render web service from this GitHub repository.

If Render detects `render.yaml`, use the blueprint. Otherwise configure the service manually:

- Root directory: `medilink-backend-mvp`
- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npx prisma migrate deploy && npm run start:prod`

Environment variables:

```env
NODE_ENV=production
PORT=10000
API_PUBLIC_URL=https://YOUR_RENDER_SERVICE.onrender.com
FRONTEND_URL=https://YOUR_VERCEL_PROJECT.vercel.app
DATABASE_URL=YOUR_SUPABASE_POSTGRES_URL
SESSION_COOKIE_NAME=medilink_session
SESSION_SECRET=GENERATE_A_LONG_RANDOM_VALUE
SESSION_MAX_AGE_DAYS=30
STORAGE_PROVIDER=mock
RESEND_API_KEY=
EMAIL_FROM=Medilink <no-reply@medilink.local>
```

After the first deployment, copy the Render service URL.

## 3. Vercel Frontend

Create a new Vercel project from this GitHub repository.

- Framework preset: Next.js
- Root directory: `medilink-frontend-v2-polished`
- Build command: `npm run build`

Environment variables:

```env
NEXT_PUBLIC_API_URL=https://YOUR_RENDER_SERVICE.onrender.com/api
```

After Vercel gives you the frontend URL, update Render's `FRONTEND_URL` with that exact URL and redeploy the API.

## Notes

In production, the API sets the session cookie with `SameSite=None` and `Secure` so login works when the frontend is hosted on Vercel and the API is hosted on Render.

For a real production app, replace `STORAGE_PROVIDER=mock` with S3-compatible storage and configure a real email sender.
