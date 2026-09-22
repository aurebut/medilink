# Captures natives des landings dédiées

Ces images montrent la véritable interface MédiLink, avec les réponses API fictives de `scripts/fixtures/persona-interface.mjs`. Les personnes, le cabinet, les candidatures, les offres et les comptes rendus sont des exemples. Les trois candidatures affichées ne représentent pas la taille du réseau.

Les captures proviennent du navigateur piloté par CUA. Aucun élément de l'interface n'est reconstruit ou modifié uniquement pour les images. Les photos sont les ressources fictives documentées dans `../people/README.md` ; les profils sans photographie conservent les initiales du produit.

## Contenu

- `search` : onglet « Missions pour vous » de `/app/search`.
- `offer` : une véritable carte d'offre, avec photographie et critères de mission.
- `report` : dossier du remplacement, catégorie « Compléments », page 2 ; les PDF illustrent des comptes rendus partagés, sans données cliniques ni tableau de consultations.
- `candidates` : les trois candidatures actuelles d'une offre fictive dans l'espace établissement.

Chaque sujet possède une capture desktop et une capture mobile. Le manifest conserve la route, le viewport et les coordonnées du cadre de capture. Les dimensions sont celles des pixels source : `sourceScale: 1`, aucune variante `@2x`, aucun agrandissement et aucun redimensionnement.

## Régénération

1. Démarrer `node scripts/serve-persona-fixtures.mjs` (API locale sur `127.0.0.1:3101`).
2. Démarrer le frontend avec `NEXT_PUBLIC_API_URL=/api` et `API_PROXY_URL=http://127.0.0.1:3101`, par exemple sur le port 3100. Ce serveur de fixtures ne relaie aucun appel vers le backend et refuse les chemins inconnus.
3. Ouvrir le frontend dans CUA. Sélectionner la session fictive avec `/api/__persona-demo/candidate?scenario=offer&next=/app/search`, ou `/api/__persona-demo/establishment?scenario=report&next=/establishment/current-missions%3Fsection%3Ddocuments`, ou `/api/__persona-demo/establishment?scenario=candidates&next=/establishment/missions%3Ftab%3Dapplications`.
4. Choisir les onglets et pages dans l'interface réelle. Pour le dossier des comptes rendus, choisir « Compléments », puis la deuxième page. Régler le viewport desktop ou mobile, puis capturer le viewport complet avec CUA, sans argument de découpe. Utiliser `screenshot({ fullPage: true })` pour les captures mobiles de plus de 1503 px de hauteur : l'export viewport simple est limité à cette hauteur. Pour les sources de cette série, la hauteur de page est celle du viewport ; `screenshot({})` suffit pour les captures desktop de 1400 px. Mesurer le rectangle du composant dans les coordonnées de cette image. Vérifier visuellement les quatre côtés et les derniers éléments pour exclure une troncature.
5. Enregistrer les huit fichiers sous `output/persona-captures/{name}-{device}.png`, avec `captures.json`. Ce dernier contient `{ sourceFullViewport: true, captures: [...] }`. Chaque capture est un objet `{ name, device, route, viewport: { width, height }, crop: { x, y, width, height } }` ; `selection` est facultatif. Les champs globaux `capturedAt` et `browser` sont également acceptés. Pour des sources déjà découpées et visuellement vérifiées, un simple tableau de captures sans `sourceFullViewport` reste pris en charge.
6. Exécuter `node scripts/prepare-persona-captures.mjs`. Les chemins source et destination peuvent être fournis comme deux arguments.

Le convertisseur vérifie les huit couples sujet/appareil, les limites du cadrage et les dimensions source. Il extrait le rectangle exact dans les pixels de la capture complète, sans redimensionnement. Il vérifie les dimensions finales et l'égalité de chaque pixel décodé avant/après conversion WebP sans perte, puis calcule le SHA-256 de chaque fichier final. Le contenu réel est détecté indépendamment de l'extension `.png` : selon l'export CUA, une source peut être encodée en JPEG ; `sourceFormat` conserve cette provenance. La conversion sans perte n'ajoute aucun détail absent de la source.

Les captures PNG/JPEG de travail restent dans `output/`, hors des ressources distribuées. Après toute modification de l'interface capturée ou des fixtures, reprendre les captures concernées et préparer à nouveau le lot complet.
