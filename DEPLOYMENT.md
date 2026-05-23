# Deployment

Recommended free MVP setup:

- Frontend: Vercel, project root `medilink-frontend-v2-polished`
- Backend API: Render, project root `medilink-backend-mvp`
- Database: Supabase Postgres

## 1. Supabase

Create a free Supabase project, then copy the Postgres connection string.

Use the pooled connection string if Supabase offers one. Prisma accepts both the direct and pooled Postgres URLs.

Create a private Supabase Storage bucket for user documents, then create S3 access keys for that project. The backend uses signed S3-compatible URLs, so files go directly from the Vercel frontend to Supabase Storage while document metadata stays in Supabase Postgres.

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
STORAGE_PROVIDER=s3
S3_REGION=auto
S3_ENDPOINT=https://YOUR_SUPABASE_PROJECT_REF.supabase.co/storage/v1/s3
S3_BUCKET=YOUR_PRIVATE_STORAGE_BUCKET
S3_ACCESS_KEY_ID=YOUR_SUPABASE_S3_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SUPABASE_S3_SECRET_KEY
S3_FORCE_PATH_STYLE=true
SIGNED_URL_TTL_SECONDS=300
RESEND_API_KEY=
EMAIL_FROM=Medilink <no-reply@medilink.local>
```

After the first deployment, copy the Render service URL.

In Supabase Storage, allow your Vercel origin to upload with `PUT` and to read signed downloads with `GET`. At minimum the browser needs the `Content-Type` header allowed.

## 3. Vercel Frontend

Create a new Vercel project from this GitHub repository.

- Framework preset: Next.js
- Root directory: `medilink-frontend-v2-polished`
- Build command: `npm run build`

Environment variables:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_URL=https://YOUR_RENDER_SERVICE.onrender.com
```

After Vercel gives you the frontend URL, update Render's `FRONTEND_URL` with that exact URL and redeploy the API.

## Notes

In production, the API sets the session cookie with `SameSite=None` and `Secure` so login works when the frontend is hosted on Vercel and the API is hosted on Render.

For a real production app, keep `STORAGE_PROVIDER=s3` with the private Supabase Storage bucket and configure a real email sender.
