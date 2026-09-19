# Dossier du remplacement

Le module rattache un dossier à une candidature précise (`applicationId` unique). Il ne réutilise pas les documents du profil : seuls le candidat concerné et les membres OWNER, ADMIN ou RECRUITER de l’établissement accèdent à ce dossier. Une candidature clôturée rend le dossier existant accessible en lecture seule. Aucun dossier n’est créé après clôture.

## Activation

1. Construire la version : `npm ci`, `npm run prisma:generate`, `npm run build`.
2. Avec la procédure de déploiement habituelle, appliquer la migration additive `20260919120000_add_replacement_dossiers` : `npx prisma migrate deploy`. Cette commande modifie la base désignée par la configuration et doit être exécutée uniquement sur l’environnement de déploiement choisi.
3. En production, utiliser le stockage privé S3 et les variables requises par `StorageService` (`STORAGE_PROVIDER=s3`, `S3_BUCKET`, région/endpoint et identifiants si nécessaires). Les clés des objets définitifs ne doivent jamais être accessibles en écriture par les clients.
4. Configurer `RESEND_API_KEY` et une adresse `EMAIL_FROM` autorisée chez Resend. Sans les deux, `canSend` vaut `false`; une tentative API est enregistrée FAILED, jamais SENT. Les envois du dossier n’utilisent pas le simulateur email de développement.

La migration et l’envoi réel ne font pas partie des tests locaux. Aucun courrier n’est envoyé pendant `dossier:test`.

## Contrat HTTP

Toutes les routes sont authentifiées et commencent par `/api/applications/:applicationId/dossier`.

| Méthode / suffixe | Corps / résultat |
| --- | --- |
| GET | Vue du dossier, détails, révision, documents, historique d’envoi, droits et champs manquants |
| PUT | `{revision, details}` ; incrémente la révision des informations |
| POST `/generate` | `{kind: CONTRACT ou DECLARATION, revision}` ; PDF immuable versionné |
| POST `/upload-url` | `{kind, revision, fileName, mimeType, sizeBytes, expiresAt?}` ; `{documentId, uploadUrl, method, headers, expiresInSeconds}` |
| POST `/documents/:documentId/confirm` | Fige les octets avant contrôle de signature/type et taille ; rend le document READY |
| GET `/documents/:documentId/download-url` | URL temporaire du fichier autorisé |
| DELETE `/documents/:documentId` | Archive le document sans effacer l’historique ni ses octets |
| POST `/send` | `{documentIds, recipientEmail, recipientName, recipientType: COUNTERPART ou ORDER, message?, idempotencyKey}` |

Les mutations, sauf `upload-url`, retournent la vue complète. `/send` ne retourne pas de statut d’envoi à la racine : identifier la tentative dans `deliveries` grâce à son `idempotencyKey`. `SENT` signifie que le fournisseur email a accepté l’envoi, sans preuve de réception, de signature, ni d’autorisation ordinale.

`DossierDetails` et ses libellés sont définis dans `src/modules/replacement-dossiers/dossier-types.ts`. Un brouillon peut conserver des chaînes vides. La génération exige les champs propres au document et la confirmation explicite `practiceFramework=INDIVIDUAL_LIBERAL`. Elle est réservée aux missions REMPLACEMENT médicales; elle ne couvre pas les contrats salariés ou les contrats d’une société d’exercice. Le médecin remplacé n’est jamais déduit de l’identité d’un compte établissement.

## Intégrité et envoi

- La révision augmente quand les informations changent. Une requête sur une révision périmée reçoit 409. Chaque génération conserve sa version, la révision utilisée, les détails figés et la version du modèle.
- PDF, JPEG, PNG et WEBP : 10 Mo maximum par pièce, 20 Mo au total et 15 pièces maximum par envoi. Le corps du message est limité à 3 000 caractères.
- Les URL de téléversement écrivent seulement dans la quarantaine. La confirmation déplace le fichier vers une clé privée jamais signée pour écriture, puis contrôle les octets définitifs. Rejouer une URL ne modifie donc pas le document confirmé.
- Les anciennes versions restent consultables. Les documents générés et contrats signés d’une ancienne révision ne peuvent plus être envoyés. Les pièces expirées sont refusées; une date de fin de validité renseignée pour licence/RCP doit couvrir la fin du remplacement. Une date déclarée n’est pas une vérification de l’authenticité du justificatif.
- Une même clé d’idempotence avec un autre destinataire ou une autre sélection reçoit 409. Un envoi SENT n’est pas répété. Un envoi FAILED peut être retenté avec la même clé et les mêmes pièces; la clé Resend est elle aussi conservée. Un échec ambigu vieux de plus de 23 heures nécessite de vérifier le journal du fournisseur avant un nouvel envoi, la [rétention d’idempotence de Resend](https://resend.com/changelog/idempotency-keys) étant limitée à 24 heures.
- Si un processus s’arrête brutalement en cours d’envoi, la tentative peut rester SENDING. Vérifier l’événement email, la clé `dossier-<deliveryId>` et le journal Resend avant une correction administrative; ne pas créer une nouvelle tentative à l’aveugle.
- Les événements email et audits tracent les actions sans exposer les clés de stockage ni les détails des contrats dans la réponse publique. L’historique d’envoi conserve les identifiants, versions et révisions des pièces sélectionnées.

## Vérification locale

`npm run dossier:test` teste les droits, l’isolation des candidatures, le gel des fichiers, leurs signatures, les PDF, les révisions, l’archivage, les dates de validité et les échecs/réessais d’envoi. Il utilise des doubles en mémoire pour la base et le fournisseur email et le véritable `StorageService` local dans un répertoire temporaire. Il ne remplace pas un test concurrent transactionnel PostgreSQL.

Compléter par `npm run security:test`, `npm run build` et la vérification SQL de la migration dans une base locale isolée avant publication.
