# Médilink Backend MVP

Backend NestJS + Prisma + PostgreSQL pour le MVP 1 : inscription/connexion, profil candidat, documents, établissements, missions, candidatures, messagerie simple, emails simples, admin minimal.

## Démarrage local

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

API : `http://localhost:4000/api`

## Notes importantes

- `STORAGE_PROVIDER=local` permet de développer sans vrai bucket. Pour la production Vercel/Render/Supabase, utiliser `STORAGE_PROVIDER=s3` avec un bucket Supabase Storage privé et les clés S3 du projet.
- Si `RESEND_API_KEY` est vide, les emails sont simulés et enregistrés en base.
- Les permissions sensibles sont vérifiées côté backend : rôle, appartenance établissement, participant conversation, propriétaire document.
- L’admin minimal repose sur le rôle `MEDILINK_ADMIN`. Pour créer le premier admin, modifier le rôle directement en base ou ajouter un seed.

## Endpoints principaux

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Profil
- `GET /api/me/profile`
- `PATCH /api/me/profile`

### Documents
- `GET /api/me/documents`
- `POST /api/documents/upload-url`
- `POST /api/documents/:id/confirm-upload`
- `GET /api/documents/:id/download-url`
- `DELETE /api/documents/:id`

### Établissements
- `POST /api/establishments`
- `GET /api/establishments/me`
- `PATCH /api/establishments/:id`
- `POST /api/establishments/:id/members`

### Missions
- `GET /api/missions`
- `GET /api/missions/:id`
- `POST /api/missions`
- `PATCH /api/missions/:id`
- `POST /api/missions/:id/publish`
- `POST /api/missions/:id/pause`
- `POST /api/missions/:id/archive`

### Candidatures
- `POST /api/missions/:id/apply`
- `GET /api/me/applications`
- `GET /api/establishment/applications?establishmentId=...`
- `PATCH /api/applications/:id/status`
- `POST /api/applications/:id/withdraw`

### Messagerie
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `POST /api/conversations/:id/read`
- `POST /api/conversations/:id/archive`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

### Admin
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/suspend`
- `GET /api/admin/documents?status=PENDING_VERIFICATION`
- `POST /api/admin/documents/:id/approve`
- `POST /api/admin/documents/:id/reject`
- `GET /api/admin/establishments`
- `POST /api/admin/establishments/:id/verify`
- `GET /api/admin/missions`
- `POST /api/admin/missions/:id/unpublish`
