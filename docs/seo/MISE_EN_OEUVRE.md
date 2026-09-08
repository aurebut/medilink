# Premier lot SEO MédiLink — 8 septembre 2026

Ce document décrit le premier lot. Le [deuxième lot éditorial du même jour](CONTENU_2026-09-08.md) porte désormais le total à six guides et dix URL publiques dans le sitemap.

Le 9 septembre, la [présentation d’origine des landings a été restaurée](RESTAURATION_LANDING_2026-09-09.md) à la demande de l’utilisateur ; les descriptions des modifications visuelles ci-dessous sont donc historiques.

## Périmètre

Domaine canonique : https://medilink-web.com. Cible prioritaire : médecins généralistes remplaçants en France. Conversion principale : création d’un profil candidat ; parcours cabinet complémentaire.

| URL publique | Intention | Action principale |
|---|---|---|
| `/` | Marque et remplacement médical | Créer un profil candidat |
| `/remplacement-medical` | Remplacement médecin généraliste / médecine générale | Créer un profil candidat |
| `/trouver-medecin-remplacant` | Trouver un médecin remplaçant | Créer un espace cabinet |
| `/guides` | Ressources du remplacement | Choisir un guide |
| `/guides/premier-remplacement-medical-checklist` | Premier remplacement en médecine générale | Créer un profil candidat |
| `/guides/annonce-remplacement-medical-cabinet` | Rédiger une annonce de remplacement médical | Créer un espace cabinet |

## Architecture

- Le groupe `(platform)` conserve les URL et les composants de l’application existante, ses styles et son AuthProvider. Son layout ajoute `noindex, follow`. Les pages de connexion, compte, administration, démonstration, recherche et fiches mission restent ainsi hors de l’indexation dans ce lot.
- Quatre layouts publics légers utilisent `PublicDocument` : accueil, médecin, cabinet et guides. Ils conservent les classes de body et les feuilles de style des vitrines existantes. Les liens entre ces documents utilisent une navigation complète pour isoler les styles et réinitialiser les scripts de présentation.
- Les vitrines sont pré-rendues par Next.js à partir de HTML rédigé dans le dépôt (`content/landing-content.ts`). Aucun contenu fourni par un utilisateur ou une API ne doit être injecté dans cette source. Les guides utilisent des composants React et des données typées dans `content/guides.ts`.
- L’ancien proxy qui réécrivait `/` vers `landing.html` est retiré. Les trois anciennes pages HTML sont remplacées par des redirections permanentes 308 vers leurs URL canoniques.
- Les canoniques, titres et métadonnées de partage sont centralisés. Les articles portent leurs dates éditoriales réelles, un éditeur identifié et des données structurées Article / BreadcrumbList conformes au contenu visible. Ne pas régénérer les dates à chaque build.
- Le sitemap contient exactement les six pages publiques ci-dessus. Robots autorise la lecture des consignes noindex et bloque uniquement l’API. Les déploiements Vercel Preview portent aussi un en-tête `X-Robots-Tag: noindex`.
- Les images vitrines sont disponibles en WebP à 640 et 1280 pixels. Les cinq fichiers desktop totalisent 287 560 octets contre 6 480 692 octets pour leurs originaux. Les originaux sont conservés. Une image JPEG 1200 × 630 sert au partage social ; les polices sont servies localement.
- Le chantier ne modifie ni les API métier, ni les permissions, ni la base de données. Les visuels illustratifs sont conservés avec leurs mentions ; la section de contributeurs non renseignés est retirée.

## Vérification et publication

Depuis `medilink-frontend-v2-polished` :

```powershell
npm run lint
npm run typecheck
npm run build
npm run start -- --port 3100
```

Dans un autre terminal :

```powershell
npm run test:seo
npm run test:seo -- https://medilink-web.com
```

Le test HTTP vérifie le HTML sans JavaScript, les canoniques, titres, descriptions, images de partage, schémas des articles, redirections, liens internes, ancres, ressources, noindex des parcours exclus, 404 des guides inconnus et contenu exact du sitemap.

Après un déplacement des routes, un ancien cache `.next/types` ou `.next/dev/types` peut référencer les anciens chemins. Régénérer ces caches si nécessaire ; ne pas modifier les composants métier pour corriger des erreurs de types provenant de ces fichiers générés.

Le dépôt `aurebut/medilink` déploie via Vercel ; `main` correspondait au dernier déploiement Production réussi lors du contrôle. Publier un commit limité au lot SEO, puis vérifier le statut Vercel et les URL sur le domaine canonique. En cas de régression, réverter ce commit et pousser la réversion ; ne pas réécrire l’historique partagé.

## Mesure après publication

Aucun accès Search Console ou Keyword Planner n’est disponible dans cette session. Aucun traceur supplémentaire n’est ajouté ; aucune conversion SEO n’est prétendue mesurée.

Quand l’accès Search Console sera disponible : vérifier la propriété du domaine, soumettre `https://medilink-web.com/sitemap.xml`, inspecter l’accueil, les deux pages métier et les deux articles. La soumission ne garantit pas leur indexation.

Exporter ensuite chaque période complète de 28 jours avec les dimensions page, requête et pays (France) : clics, impressions, CTR et position moyenne. Séparer les requêtes contenant MédiLink/Medilink des requêtes hors marque, puis regrouper les intentions remplacement, premier remplacement et recherche de remplaçant. Comparer des périodes équivalentes ; signaler les effectifs trop faibles pour conclure.

Pour les inscriptions, profils avec disponibilités et premières candidatures, le backend peut fournir les totaux métier existants. Ne pas attribuer ces totaux au SEO sans instrumentation d’attribution distincte, qui n’est pas incluse dans ce lot.

## Lot suivant

Quand des annonces réelles sont disponibles : rendre le catalogue et les fiches en HTML initial, définir les statuts HTTP et la gestion des offres expirées, puis retirer leur noindex et les intégrer au sitemap. Les filtres et la pagination nécessiteront leur propre politique d’indexation. Créer des pages par ville seulement si l’offre et un contenu local substantiel les justifient. Ne pas publier les autres brouillons automatiquement.
