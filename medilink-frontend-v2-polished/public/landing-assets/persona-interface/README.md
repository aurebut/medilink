# Captures natives des landings dédiées

Ces images montrent la véritable interface MédiLink, avec les réponses API fictives de `scripts/fixtures/persona-interface.mjs`. Les personnes, le cabinet, les candidatures et les offres sont des exemples. La section des rapports utilise le mode « Voir un exemple » explicitement proposé dans l'interface : ses données sont illustratives, sans prétendre lire une activité clinique enregistrée. Les trois candidatures affichées ne représentent pas la taille du réseau.

Les captures proviennent du navigateur piloté par CUA. Aucun élément de l'interface n'est reconstruit ou modifié uniquement pour les images. Les photos sont les ressources fictives documentées dans `../people/README.md` ; les profils sans photographie conservent les initiales du produit.

## Contenu

- `search` : onglet « Missions pour vous » de `/app/search`.
- `offer` : une véritable carte d'offre, avec photographie et critères de mission.
- `report` : `/establishment/current-missions?section=reports`, après activation de « Voir un exemple », avec le filtre « Hebdomadaire ». Le rapport structuré et ses périodes sont un aperçu explicite, sans nouvelle API de rapports ni enregistrement clinique.
- `candidates` : les trois candidatures actuelles d'une offre fictive dans l'espace établissement, avec « Voir pourquoi » ouvert sur la première. Les critères de compatibilité proviennent des données des profils et de l'offre ; les disponibilités restent à confirmer ensemble.

Chaque sujet possède une capture desktop et une capture mobile. Le manifest conserve la route, le viewport et les coordonnées du cadre de capture. Les dimensions sont celles des pixels source : `sourceScale: 1`, aucune variante `@2x`, aucun agrandissement et aucun redimensionnement.

## Régénération

1. Démarrer `node scripts/serve-persona-fixtures.mjs` (API locale sur `127.0.0.1:3101`).
2. Démarrer le frontend avec `NEXT_PUBLIC_API_URL=/api` et `API_PROXY_URL=http://127.0.0.1:3101`, par exemple sur le port 3100. Ce serveur de fixtures ne relaie aucun appel vers le backend et refuse les chemins inconnus.
3. Ouvrir le frontend dans CUA. Sélectionner la session fictive avec `/api/__persona-demo/candidate?scenario=offer&next=/app/search`, ou `/api/__persona-demo/establishment?scenario=report&next=/establishment/current-missions%3Fsection%3Dreports`, ou `/api/__persona-demo/establishment?scenario=candidates&next=/establishment/missions%3Ftab%3Dapplications`.
4. Choisir les onglets et actions dans l'interface réelle : « Voir un exemple », puis « Hebdomadaire » pour les rapports ; « Voir pourquoi » pour la première candidature. Garder un viewport desktop ou mobile normal. Sur mobile, capturer son rectangle complet avec `screenshot({ clip: { x: 0, y: 0, width: innerWidth, height: innerHeight } })`, en utilisant les dimensions réellement lues dans le navigateur. L'origine reste toujours `(0, 0)` : le cadrage du composant est effectué ensuite dans les pixels source. Cette forme conserve les dimensions natives, contrairement à certains exports `screenshot({})` observés qui rééchantillonnent selon la largeur disponible hors barre de défilement. Prendre plusieurs captures après des défilements successifs et mesurer les bandes utiles hors des barres fixes : leurs positions dans le document sont `getBoundingClientRect().y + scrollY`. Les bandes doivent se suivre exactement, sans trou, doublon ou déplacement horizontal. Sur desktop, procéder comme décrit ci-dessous. Vérifier les raccords, les quatre côtés et les derniers éléments.
5. Enregistrer les fichiers sous `output/persona-captures/{name}-{device}.png`, avec `captures.json`. Ce dernier contient un tableau `captures`. Chaque capture est un objet `{ name, device, route, viewport: { width, height }, crop: { x, y, width, height }, sourceFullPage: true }` pour une source pleine page ; utiliser `sourceFullViewport: true` pour une source strictement égale au viewport. Lorsqu'un export exclut la barre de défilement, ajouter `contentWidth` avec la largeur de contenu mesurée dans le navigateur : elle doit correspondre exactement à la largeur de l'image et ne pas dépasser le viewport. Ne pas déduire une tolérance arbitraire de la taille du fichier. Les anciens lots `{ sourceFullViewport: true, captures: [...] }` restent valides, et un `sourceFullPage: true` par capture prend le dessus sur ce réglage global. `selection` est facultatif. Les champs globaux `capturedAt` et `browser` sont également acceptés. Pour des sources déjà découpées et visuellement vérifiées, un simple tableau de captures sans aucun de ces indicateurs reste pris en charge.
6. Exécuter `node scripts/prepare-persona-captures.mjs` pour les huit captures, ou `node scripts/prepare-persona-captures.mjs --names=candidates,report` pour ne remplacer que les candidatures et les rapports. Les chemins source et destination peuvent être fournis comme deux arguments. En régénération partielle, `captures.json` peut contenir seulement les quatre captures sélectionnées ou le lot complet ; seuls les fichiers sélectionnés sont lus et convertis. Un manifest complet existant est requis : les autres fichiers, leurs entrées et les métadonnées globales sont conservés.

Les captures desktop de cette série utilisent `sourceFullPage: true`. Faire d'abord une capture native avec le rectangle complet explicite, attendre que la géométrie soit stabilisée, puis mesurer à nouveau le composant dans les coordonnées du document et appeler `screenshot({ fullPage: true })`. Cette première capture stabilise la disparition de la barre de défilement : le fichier desktop exporté a ici exactement la largeur déclarée de 1600 px, sans recomposition après la mesure. Ne pas utiliser des coordonnées mesurées avant cette stabilisation. L'export pleine page non stabilisé peut déplacer les éléments, tandis que le rectangle explicite desktop peut ignorer le défilement et répéter le haut du document. La capture finale doit donc être inspectée, même lorsque ses dimensions sont correctes. Sur mobile, conserver les bandes de viewport : l'export pleine page insère sinon les barres fixes dans le contenu.

Pour des captures segmentées, remplacer les indicateurs `sourceFullPage` / `sourceFullViewport` par `sourceSegments`. Le `crop` principal conserve la position du composant dans le document et les dimensions finales. Chaque bande indique son fichier source, son rectangle dans le viewport et sa position verticale dans l'image finale ; `scrollY` est facultatif mais permet aussi de vérifier la continuité dans les coordonnées du document. Exemple de structure :

```json
{
  "name": "report",
  "device": "mobile",
  "route": "/establishment/current-missions?section=reports",
  "viewport": { "width": 390, "height": 844 },
  "crop": { "x": 14, "y": 542, "width": 347, "height": 1000 },
  "sourceSegments": [
    { "file": "report-mobile-1.png", "crop": { "x": 14, "y": 142, "width": 347, "height": 600 }, "destinationY": 0, "scrollY": 400 },
    { "file": "report-mobile-2.png", "crop": { "x": 14, "y": 142, "width": 347, "height": 400 }, "destinationY": 600, "scrollY": 1000 }
  ]
}
```

Chaque source segmentée doit correspondre exactement aux dimensions déclarées du viewport à l'échelle 1. Le convertisseur extrait les bandes, concatène leurs pixels natifs dans l'ordre et vérifie leur largeur commune, leur position horizontale, leurs limites et leurs destinations contiguës depuis zéro. La somme des hauteurs doit remplir exactement le cadre final. Aucun élément n'est effacé ou reconstruit, aucune bande n'est redimensionnée ; seuls les pixels réellement visibles dans le navigateur sont conservés. La provenance de chaque bande reste dans le manifest.

Le convertisseur vérifie les deux appareils pour chaque sujet sélectionné, les limites du cadrage et les dimensions source. Une source viewport doit avoir la hauteur déclarée ; une source pleine page doit avoir une hauteur au moins égale. La largeur doit correspondre exactement au viewport, ou à `contentWidth` si la barre de défilement est exclue de l'export. Le cadre doit rester intégralement dans l'image. Le convertisseur extrait ce rectangle exact, sans redimensionnement, puis vérifie les dimensions finales et l'égalité de chaque pixel décodé avant/après conversion WebP sans perte. Il calcule le SHA-256 de chaque fichier final. Le contenu réel est détecté indépendamment de l'extension `.png` : selon l'export CUA, une source peut être encodée en JPEG ; `sourceFormat` conserve cette provenance. La conversion sans perte n'ajoute aucun détail absent de la source.

Les captures PNG/JPEG de travail restent dans `output/`, hors des ressources distribuées. Après toute modification de l'interface capturée ou des fixtures, reprendre les captures concernées et régénérer ces sujets seulement, en conservant les autres captures inchangées.
