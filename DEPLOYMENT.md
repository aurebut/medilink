# Deployment

Recommended free MVP setup:

- Frontend: Vercel, project root `medilink-frontend-v2-polished`
- Backend API: Render, project root `medilink-backend-mvp`
- Database: Supabase Postgres

## 1. Supabase

Create a free Supabase project, then copy the Postgres connection string.

Use the pooled connection string for `DATABASE_URL`, preferably the transaction pooler for the runtime app. Also copy the direct connection string as `DIRECT_URL`; Prisma uses it for migrations so deploys do not compete with the session pooler connection limit.

Create a private Supabase Storage bucket for user documents, then create S3 access keys for that project. The backend uses signed S3-compatible URLs, so files go directly from the Vercel frontend to Supabase Storage while document metadata stays in Supabase Postgres. Configure an automatic deletion policy or a scheduled cleanup for objects under `quarantine/` older than 24 hours; confirmed files are moved under `validated/`.

## 2. Render API

Create a new Render web service from this GitHub repository.

If Render detects `render.yaml`, use the blueprint. Otherwise configure the service manually:

- Root directory: `medilink-backend-mvp`
- Node version: `24.x` (LTS)
- Build command: `npm ci --include=dev && npx prisma generate && npm run build && npm prune --omit=dev`
- Start command: `npx prisma migrate deploy && npm run start:prod`

Environment variables:

```env
NODE_ENV=production
PORT=10000
API_PUBLIC_URL=https://YOUR_RENDER_SERVICE.onrender.com
FRONTEND_URL=https://YOUR_VERCEL_PROJECT.vercel.app
DATABASE_URL=YOUR_SUPABASE_POSTGRES_URL
DIRECT_URL=YOUR_SUPABASE_DIRECT_POSTGRES_URL
SESSION_COOKIE_NAME=__Host-medilink_session
SESSION_SECRET=GENERATE_A_LONG_RANDOM_VALUE
SESSION_MAX_AGE_DAYS=7
STORAGE_PROVIDER=s3
S3_REGION=auto
S3_ENDPOINT=https://YOUR_SUPABASE_PROJECT_REF.supabase.co/storage/v1/s3
S3_BUCKET=YOUR_PRIVATE_STORAGE_BUCKET
S3_ACCESS_KEY_ID=YOUR_SUPABASE_S3_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SUPABASE_S3_SECRET_KEY
S3_FORCE_PATH_STYLE=true
SIGNED_URL_TTL_SECONDS=300
ESCROW_PROVIDER=disabled
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM=Medilink <no-reply@your-verified-domain.example>
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ESTABLISHMENT_MONTHLY=
STRIPE_PRICE_MISSION_PUBLICATION=
```

After the first deployment, copy the Render service URL.

In Supabase Storage, allow your Vercel origin to upload with `PUT` and to read signed downloads with `GET`. At minimum the browser needs the `Content-Type` header allowed.

## 3. Vercel Frontend

Create a new Vercel project from this GitHub repository.

- Framework preset: Next.js
- Root directory: `medilink-frontend-v2-polished`
- Node version: `24.x` (LTS)
- Build command: `npm run build`

Environment variables:

```env
NEXT_PUBLIC_API_URL=/api
API_PROXY_URL=https://YOUR_RENDER_SERVICE.onrender.com
NEXT_PUBLIC_STORAGE_ORIGIN=https://YOUR_SUPABASE_PROJECT_REF.supabase.co
```

After Vercel gives you the frontend URL, update Render's `FRONTEND_URL` with that exact URL and redeploy the API. CORS accepts exact configured origins only. Add a preview URL explicitly to `CORS_ALLOWED_ORIGINS` when a preview must call the production API; never allow all `*.vercel.app` projects.

## Notes

In production, browser traffic must use the same-origin Vercel `/api` proxy. The API sets a `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` session cookie and does not expose session tokens to JavaScript. `NEXT_PUBLIC_STORAGE_ORIGIN` is used only by the frontend Content Security Policy and must be the exact origin that serves signed storage images.

Production refuses to start without `STORAGE_PROVIDER=s3`, `RESEND_API_KEY`, and `EMAIL_FROM`. Keep the Supabase Storage bucket private.

The escrow workflow is deliberately disabled in production until a real provider with signed webhooks and amount reconciliation is implemented. Do not set it to `mock`.

If Prisma is the only database access path, disable the Supabase Data API and revoke `anon`/`authenticated` privileges on application tables. If the Data API is required, enable RLS and explicit least-privilege policies on every exposed table before deployment.

## Stripe billing

For establishment publication payments, create two Stripe Prices:

- recurring monthly price: `59.99 EUR`, used as `STRIPE_PRICE_ESTABLISHMENT_MONTHLY`
- one-time price: `39.99 EUR`, used as `STRIPE_PRICE_MISSION_PUBLICATION`

Create a webhook endpoint pointing to:

```txt
https://YOUR_RENDER_SERVICE.onrender.com/api/billing/webhooks/stripe
```

Listen at minimum to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`, then copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
