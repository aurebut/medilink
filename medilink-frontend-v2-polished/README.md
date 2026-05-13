# Médilink Frontend V2 — UI polish

Version visuelle refaite du frontend MVP Médilink, connectée au même backend NestJS déjà testé en local.

## Ce qui a été conservé

- mêmes routes Next.js ;
- mêmes appels API backend ;
- même gestion de session par cookie ;
- même parcours candidat / établissement / admin ;
- correction conservée de la page admin documents ;
- correction conservée de la page candidatures établissement avec boutons `Accepter` / `Refuser` au lieu du sélecteur de statut.

## Ce qui change

- design system visuel revu : cartes, boutons, badges, tableaux, formulaires ;
- sidebar et topbar plus propres ;
- dashboard candidat plus lisible ;
- dashboard établissement amélioré ;
- recherche missions plus propre ;
- cards missions plus professionnelles ;
- messagerie plus proche d’une vraie interface chat ;
- pages admin rendues plus lisibles.

## Installation

Dans ce dossier :

```bash
copy .env.example .env.local
npm install
npm run dev
```

Le backend doit être lancé sur :

```txt
http://localhost:4000/api
```

Le frontend sera disponible sur :

```txt
http://localhost:3000
```

## Configuration

`.env.local` doit contenir :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Test recommandé

Rejouer le parcours déjà validé :

1. connexion admin ;
2. compte candidat ;
3. profil + document ;
4. validation admin ;
5. compte établissement ;
6. création mission publiée ;
7. recherche candidat ;
8. candidature ;
9. messagerie ;
10. acceptation/refus candidature.
