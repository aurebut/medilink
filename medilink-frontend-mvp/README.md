# Médilink Frontend MVP

Frontend **Next.js + React + TypeScript** connecté au backend `medilink-backend-mvp`.

## Démarrage local

1. Lancer le backend :

```bash
cd ../medilink-backend-mvp
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

2. Créer le fichier `.env.local` du frontend :

```bash
cp .env.example .env.local
```

3. Lancer le frontend :

```bash
npm install
npm run dev
```

Frontend : `http://localhost:3000`  
Backend : `http://localhost:4000/api`

## Compte admin de test

Créé par le seed du backend :

```txt
email: admin@medilink.local
password: ChangeMe123!
```

## Parcours MVP inclus

- Accueil public
- Inscription candidat / établissement
- Connexion / déconnexion
- Vérification email
- Mot de passe oublié / reset
- Espace candidat
  - dashboard
  - profil
  - upload documents
  - recherche missions
  - détail mission
  - candidature
  - messagerie simple
  - notifications
- Espace établissement
  - onboarding établissement
  - création mission
  - candidatures reçues
  - messagerie
- Admin minimal
  - utilisateurs
  - documents à valider
  - établissements
  - missions

## Note importante

Le backend MVP fourni ne contient pas encore d’endpoint dédié pour lister **les missions privées d’un établissement**, par exemple `GET /establishments/:id/missions`. La page établissement “Missions” utilise donc `GET /missions` et affiche les missions publiées visibles publiquement, filtrées côté frontend par établissement. Les brouillons créés sans `publishNow` ne sont pas visibles dans cette liste tant que cet endpoint backend n’est pas ajouté.

## Upload document en local

Si le backend est en `STORAGE_PROVIDER=mock`, le frontend détecte l’URL `mock://...`, ignore le vrai `PUT`, puis confirme l’upload. En production, avec S3/R2/Supabase Storage, le frontend fera un vrai `PUT` vers l’URL temporaire.
