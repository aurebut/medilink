# Restauration de la présentation d’origine — 9 septembre 2026

À la demande explicite de l’utilisateur, les modifications visibles apportées aux landings lors des deux lots SEO sont annulées. La référence est `60c8e06`, dernier commit précédant le premier lot SEO.

Les trois fichiers HTML de cette référence ont servi à rétablir les contenus dans `content/landing-content.ts`, ainsi que leurs navigations et pieds de page dans `content/landing-shell.ts`. Titres visibles, descriptions, boutons, icônes SVG, images PNG, ordre des sections, sélecteurs de parcours et section de contributeurs sont conservés tels qu’ils étaient. Cela inclut les emplacements de contributeurs à renseigner : ils n’ont pas été réécrits ni remplacés par des témoignages inventés.

Les URL des anciens liens HTML pointent vers les routes canoniques équivalentes. Les métadonnées SEO, les redirections, le rendu serveur et les six guides restent disponibles. Aucun encart éditorial ni lien supplémentaire n’est inséré dans la landing. Les styles `landing-seo.css` sont désormais chargés uniquement pour les guides. Les styles, les polices et les scripts de la présentation d’origine sont réutilisés dans leur ordre initial.

## Contrôles

- `node scripts/check-landing-restoration.mjs` compare le menu, le contenu principal et le pied de page rendus avec Git `60c8e06`, à la normalisation des liens près. Il vérifie aussi l’ordre des styles et le contenu inchangé de quinze fichiers CSS/JS.
- `npm run test:seo` conserve les contrôles des dix URL publiques et des parcours exclus de l’indexation ; seule l’exception des anciens emplacements de contributeurs de l’accueil est documentée.
- Build de production et contrôle TypeScript réussis.
- Comparaison dans le navigateur avec les HTML d’origine servis séparément : les dimensions, positions et polices des quatorze éléments et sections mesurés de l’accueil correspondent sur ordinateur et à 390 pixels de large.
- Le menu mobile s’ouvre et se ferme ; les onglets de présentation du matching changent correctement de panneau.

Après déploiement, les deux scripts de contrôle peuvent être exécutés avec `https://medilink-web.com` comme argument. Le périmètre des futurs travaux SEO est rappelé dans le fichier `AGENTS.md` du frontend.

## Complément demandé après la restauration

L’utilisateur a ensuite demandé un accès aux articles depuis la navigation. Un lien « Guides pratiques » vers `/guides` est donc ajouté dans la zone droite du menu sur ordinateur et dans le menu mobile des trois landings. Aucun style, texte de section ou bouton d’action existant n’est modifié. Le contrôle de restauration vérifie les deux nouveaux liens puis compare le reste à la version d’origine. La compilation et les contrôles HTTP ont été exécutés ; le navigateur de test n’était pas disponible pour ce complément.
