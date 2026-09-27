# Captures natives des landings dédiées

Ces images montrent la véritable interface MédiLink, avec les réponses API fictives de `scripts/fixtures/persona-interface.mjs`. Les personnes, le cabinet, les candidatures et les offres sont des exemples. Les rapports utilisent le mode « Voir un exemple » activé explicitement dans l’interface : aucune activité clinique enregistrée n’est lue. Les trois candidatures affichées ne représentent pas la taille du réseau.

Les captures sont prises directement dans le navigateur à `deviceScaleFactor: 2`, au format PNG natif, puis converties en WebP sans perte. Aucun élément du produit n’est reconstruit ou restylé pour les images. Les photos sont les ressources fictives documentées dans `../people/README.md` ; les profils sans photographie conservent les initiales du produit.

## Contenu

- `search` : les missions proposées dans `/app/search`.
- `offer` : une véritable carte d’offre, avec photographie et critères de mission.
- `candidates` : les candidatures reçues, avec « Voir pourquoi » ouvert sur Sarah Bernard. Les disponibilités restent à confirmer.
- `report` : l’espace des rapports après « Voir un exemple », en vue hebdomadaire. Les mentions de données fictives et d’absence d’enregistrement restent visibles.

Chaque sujet dispose de versions desktop et mobile, en 1x et `@2x`. Le manifest contient les dimensions CSS, la route, le viewport, le cadrage, `sourceScale: 2`, `sourceFormat: png` et le SHA-256 de la variante haute définition. Les images `@2x` proviennent de vrais pixels supplémentaires, jamais d’un agrandissement des anciens JPEG. La version 1x est réduite depuis le PNG haute définition ; les pages choisissent la variante via `srcset`.

## Régénération

Depuis la racine du frontend :

```powershell
npm run dev -- --port 3100
# Dans un autre terminal :
node scripts/capture-persona-interface.mjs http://localhost:3100
```

Le script utilise Playwright et Sharp, avec le même chargement de dépendances que `capture-landing-interface.mjs`. Les variables facultatives `PLAYWRIGHT_MODULE_PATH`, `SHARP_MODULE_PATH` et `CAPTURE_BROWSER_CHANNEL` permettent de sélectionner les outils installés.

Chaque capture utilise un contexte isolé et des réponses API fictives. Aucun appel n’est relayé vers un backend ; les requêtes inconnues font échouer la génération. Les clics « Voir pourquoi » et « Voir un exemple » sont effectués dans la véritable interface. Seul le portail de développement Next.js est masqué. Le viewport est allongé pour contenir tout le composant sans recouvrir le bas par la navigation mobile fixe.

Avant d’écrire les ressources publiques, le script valide les huit captures : absence d’erreur client et de débordement horizontal, dimensions PNG exactement doubles, conservation des mentions d’exemple et égalité de chaque pixel du PNG avec le WebP `@2x` décodé. Les PNG de travail restent dans `output/persona-retina-captures/`, hors des ressources distribuées.

Pour une capture de contrôle partielle, définir `CAPTURE_ONLY` et/ou `CAPTURE_DEVICE`, ainsi qu’un `CAPTURE_OUTPUT_DIR` distinct. Cette obligation évite de remplacer le manifest public complet par un lot incomplet. `CAPTURE_SOURCE_DIR` permet de déplacer les PNG de travail.

Après régénération, vérifier le rendu des deux landings et lancer `node scripts/check-landing-restoration.mjs http://localhost:3100`. Les captures persona sont sans cadre sur ordinateur et dans un iPhone défilable sur mobile ; les cadres de la landing principale restent inchangés. Les captures partagées de messagerie et de documents, déjà en 2x, restent gérées par `capture-landing-interface.mjs`.
