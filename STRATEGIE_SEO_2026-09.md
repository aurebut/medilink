# MédiLink — Stratégie SEO et choix des mots-clés

## Décisions confirmées et premier lot SEO

L’utilisateur a confirmé **https://medilink-web.com**, la cible **médecins généralistes remplaçants**, et la zone **France**. Il a autorisé la mise en œuvre puis le push Git pour publier. Le texte ci-dessous conserve l’état de l’audit initial ; le périmètre effectivement réalisé est documenté dans `docs/seo/MISE_EN_OEUVRE.md`.

Contre-vérification du site public le 8 septembre 2026 : `/` et `/landing.html` répondent 200 ; `/robots.txt` et `/sitemap.xml` répondent 404 ; `/api/missions?limit=1&offset=0` répond 200 avec `items: []` et `total: 0`. Ce constat justifie de privilégier les profils remplaçants et les contenus préparatoires au lancement, puis de travailler l’indexation des annonces lorsqu’un inventaire réel est disponible.

### Actualisation de la concurrence

| Concurrent | Page et observation publique | Application au premier lot |
|---|---|---|
| RemplaJob / RemplaFrance | [Annonces généralistes](https://remplajob.com/annonces/medecin-generaliste) : catalogue ciblé par métier. [Premier remplacement](https://remplajob.com/blog/premier-remplacement-en-medecine-generale-demarches-completes-pour-debuter) : guide de démarches, annoncé comme actualisé en juin 2026. | Distinguer la page métier du guide préparatoire. La checklist MédiLink se concentre sur l’arrivée au cabinet et les conditions à clarifier. |
| Doc112 | [Accueil et annonces](https://www.doc112.com/) : offres classées par spécialité, dates et lieux ; accès à la publication d’annonces. | Relier chaque contenu au parcours correspondant. Réserver les pages d’offres locales à un inventaire réel. |
| Annonces Médicales | [Remplacements en médecine générale](https://www.annonces-medicales.com/emploi/medecin/medecin-generaliste/remplacement/liste/3) : liste d’offres consacrée à cette intention. | Ne pas annoncer un catalogue fourni alors que MédiLink n’a pas d’offres publiques au moment de l’audit. |
| Docndoc | [Parcours médecins](https://docndoc.fr/medecins/) : page spécifique pour les praticiens et leur recherche professionnelle. | Décrire clairement les étapes, le public visé et l’action suivante sur la page médecin. |

Ces observations ne sont ni un classement exhaustif de Google France ni une mesure de trafic concurrent. Les mots-clés du tableau initial restent prioritaires par intention et adéquation produit, sans volumes inventés. La fiscalité, les taux de rétrocession et les pages géographiques sont différés.

Étude du 8 septembre 2026. Périmètre : remplacement médical en France, principalement médecine générale. Ce périmètre reprend le positionnement des pages actuelles et le plan d’acquisition du 7 septembre ; la cible et le bassin géographique restent à confirmer. Aucune modification publiée à ce stade.

## Décision proposée

Faire venir des médecins qui cherchent un remplacement et des cabinets qui cherchent un remplaçant, puis les conduire vers une candidature, un profil exploitable ou une demande de démonstration. Le nombre de visites seul ne suffit pas à juger le résultat.

Commencer par les deux pages métier et leur accessibilité aux moteurs, puis publier deux contenus pratiques qui les soutiennent. Les recherches de missions appellent des offres consultables ; un blog ne peut pas remplacer cette réponse. Les pages locales viendront lorsque des offres réelles et une présence dans le territoire permettent de les alimenter.

## Ce qui a réellement été vérifié

- Suggestions Google publiques interrogées avec interface française et paramètre France (`hl=fr&gl=fr`) sur dix expressions de départ. Les résultats bruts sont conservés dans `docs/seo/recherche-mots-cles-2026-09.json`.
- Résultats web sur le remplacement en médecine générale, la recherche de remplaçants, le premier remplacement, le contrat et la rétrocession ; examen des pages de RemplaJob/RemplaFrance, Doc112, Annonces Médicales et Docndoc.
- Code local des pages publiques, de la recherche, des fiches mission et de la configuration Next.js.
- Sources Google Search Central et Conseil national de l’Ordre des médecins.

**Il ne s’agit pas d’un classement des mots les plus recherchés.** Les suggestions révèlent des formulations possibles ; leur ordre ne donne pas un volume mensuel. Les résultats web consultés ne constituent pas un relevé de positions Google France. Aucun volume, difficulté SEO chiffrée, trafic concurrent ou niveau de conversion n’a été mesuré.

Pour hiérarchiser par demande mesurée, compléter avec Keyword Planner : France, réseau Google, période de 12 mois et tendances mensuelles ; conserver les réglages dans l’export. Les volumes peuvent regrouper des variantes proches. La colonne « concurrence » de cet outil concerne les annonceurs et ne mesure pas la difficulté du référencement naturel. [Documentation Google Ads](https://support.google.com/google-ads/answer/3022575?hl=en-2).

Search Console permettra de connaître les requêtes sur lesquelles **MédiLink** apparaît déjà, avec impressions, clics et pages concernées. Ces impressions ne sont pas le volume total du marché. [Documentation Search Console](https://support.google.com/webmasters/answer/7576553?hl=en).

## Les familles de recherches à travailler

« Observé » signifie présent dans les suggestions recueillies ou dans les pages obtenues par la recherche. « Hypothèse » désigne un angle proposé à valider. P1/P2 exprime une priorité commerciale et éditoriale, pas une popularité mesurée.

| Priorité | Expression principale et variantes | Besoin de la personne | Signal observé | Destination recommandée |
|---|---|---|---|---|
| P1 | remplacement médecin généraliste ; remplacement médecine générale | Trouver une mission | Suggestions Google et pages d’annonces spécialisées | Page médecin, puis recherche d’offres |
| P1 | annonce remplacement médecine générale ; annonce remplacement médecin | Consulter ou déposer une annonce | Suggestions Google ; intention à préciser sur la page | Catalogue pour consulter ; parcours cabinet pour déposer |
| P1 | trouver un médecin remplaçant ; trouver un remplaçant en médecine générale | Couvrir une absence au cabinet | Suggestions du début « trouver un remplaçant » | Page cabinet avec étapes, conditions et appel à l’action |
| P1 | remplacement médecine générale Paris ; Île-de-France ; Bordeaux ; Toulouse | Trouver une mission dans une zone | Suggestions Google | Page locale seulement si des offres réelles la justifient |
| P1 éditoriale | premier remplacement médecine générale | Préparer son entrée dans l’activité | Suggestion Google ; contenu dédié de RemplaJob | Guide de préparation relié au profil et aux missions |
| P1 éditoriale | comment rédiger une annonce de remplacement médical | Présenter son besoin de cabinet | Hypothèse éditoriale issue de l’intention « annonce » | Guide avec trame pratique, relié au parcours cabinet |
| P2 | contrat remplacement médecin ; médecin généraliste ; médecin thésé ; non thésé ; ordre ; PDF | Trouver un modèle ou vérifier les démarches | Suggestions Google ; modèles de l’Ordre visibles | Guide de relecture avec accès direct aux modèles officiels |
| P2 | rétrocession remplacement médecine générale ; rétrocession remplacement médecin | Comprendre les conditions financières | Suggestions Google et contenus spécialisés | Article distinct à documenter ; éviter de promettre un taux universel |
| P2 | remplacement médecine générale interne ; médecin remplaçant non thésé | Vérifier son statut et chercher des missions compatibles | Suggestions Google | Guide préparatoire, puis offres réellement adaptées |
| P2 | remplacement régulier médecin généraliste | Trouver un rythme récurrent | Page dédiée de RemplaJob | Rubrique d’offres si l’inventaire distingue réellement ce format |
| À différer | médecin remplaçant URSSAF ; CFE ; déclaration impôts ; régime simplifié ; salaire | Fiscalité, statut, calcul des revenus | Suggestions Google | Hors première série : demande une expertise et une maintenance spécifiques |
| À écarter du ciblage | médecin remplaçant remboursement ; trouver un médecin traitant | Besoin de patient | Suggestions et résultats à intention patient | Hors cible du produit |

Les suggestions contiennent aussi des pays étrangers et des professions paramédicales. Les paramètres français n’impliquent pas que toutes les suggestions correspondent à notre marché : ne pas reprendre automatiquement ces expressions.

## Ce que les concurrents nous apprennent

| Site examiné | Observation vérifiable | Conséquence pour MédiLink |
|---|---|---|
| [RemplaJob / RemplaFrance](https://remplajob.com/annonces/medecin-generaliste) | Annonces par profession, filtres, lieux et formats d’exercice | Une recherche de mission doit déboucher sur des offres et des critères pratiques |
| [RemplaJob — remplacement régulier](https://remplajob.com/annonces/medecin-generaliste/france/remplacement-liberal-regulier) | Une page répond à un format de remplacement précis | Développer les sous-catégories lorsque MédiLink peut fournir une offre suffisante et actualisée |
| [Doc112 — médecine générale](https://doc112.com/medecin-generaliste/remplacement/) | Catalogue par spécialité avec détails pratiques des annonces | Les fiches d’offres constituent un contenu SEO utile, à travailler au-delà des pages vitrines |
| [Annonces Médicales](https://www.annonces-medicales.com/emploi/medecin/medecin-generaliste/remplacement/liste/3) | Offres associées à des lieux et des périodes | Le contexte local doit reposer sur un inventaire, sans dupliquer un texte de ville en ville |
| [Docndoc — médecins](https://docndoc.fr/medecins/) | Parcours candidat/recruteur et accompagnement pratique | Expliquer à quel public s’adresse chaque page et ce qu’il peut faire ensuite |
| [RemplaJob — premier remplacement](https://remplajob.com/blog/premier-remplacement-en-medecine-generale-demarches-completes-pour-debuter) | Contenu de préparation relié au métier | Un article utile doit résoudre une question précise avant de proposer le produit |

**Interprétation :** les expressions nationales de recherche de missions confrontent MédiLink à des catalogues spécialisés. La différenciation proposée porte sur les critères d’exercice, les disponibilités et le suivi du remplacement, déjà présents dans le produit. Ce constat ne fournit pas un score de difficulté et ne garantit aucun classement.

## Architecture et contenu : une intention, une page principale

| Page | Rôle et titre proposés | Travail nécessaire |
|---|---|---|
| `/` | « MédiLink — Remplacement médical pour médecins et cabinets » | Clarifier la spécialité du service dans le titre et le premier écran ; orienter vers les deux publics |
| `/remplacement-medical` | « Remplacement médical : trouvez votre prochaine mission — MédiLink » | Faire évoluer la page médecin existante ; expliquer recherche, critères, candidature et conditions |
| `/trouver-medecin-remplacant` | « Trouver un médecin remplaçant pour votre cabinet — MédiLink » | Faire évoluer la page cabinet ; décrire les informations à publier et la gestion des réponses |
| `/search` | Recherche de missions | Auditer le rendu initial, la pagination et les filtres ; définir une politique d’indexation avant de multiplier les URL |
| `/missions/[id]` | Une offre réelle, un titre et une localisation | Rendre les informations publiques utiles accessibles dans le HTML initial ; métadonnées par offre ; traiter les offres expirées et supprimées |
| `/guides` | Guides du remplacement médical | Donner accès aux ressources par besoin ; liens vers les pages métier |

Les nouvelles adresses métier sont des propositions. Si elles sont retenues, conserver les anciens liens grâce à des redirections permanentes et mettre à jour le maillage interne. Éviter qu’un guide général « trouver un remplacement » et une page d’offres poursuivent exactement la même intention : le guide doit expliquer la comparaison et la candidature, la page métier doit conduire aux missions.

## Ordre de réalisation

### Lot 1 — Fondations et pages qui convertissent

1. Confirmer le domaine public principal et le bassin commercial. Une URL Vercel propre à un déploiement ne doit pas devenir l’adresse canonique du site.
2. Définir une URL canonique pour chaque page publique. L’accueil est aujourd’hui servi à `/` et `/landing.html` sans canonique explicite.
3. Ajouter un sitemap des pages publiques utiles et un robots.txt. Aucune de ces routes n’a été trouvée dans le dépôt examiné.
4. Ajouter des titres et descriptions spécifiques, améliorer la formulation du H1 de l’accueil, relier clairement les deux parcours.
5. Exclure les pages de compte, connexion et administration des résultats avec `noindex` ; l’authentification reste la protection des données. Ne pas bloquer leur exploration avant que les moteurs puissent lire la consigne `noindex`.
6. Alléger les images utilisées. Dans le dépôt, trois images de processus pèsent environ 1,8 à 2 Mo chacune, et le visuel d’accueil environ 717 ko. Mesurer le rendu mobile avant et après ; le poids des fichiers seul n’est pas un score Core Web Vitals.
7. Auditer `/search` et les fiches mission. Leurs données sont actuellement chargées côté client ; aucune preuve d’indexation ou de non-indexation n’a été obtenue. Prioriser un rendu initial utile et des statuts HTTP corrects pour les offres publiques.

Le sitemap doit contenir les URL retenues comme canoniques, sans filtres arbitraires ni pages privées. [Google : créer un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=en). Le rendu JavaScript mérite un contrôle dédié. [Google : JavaScript et SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### Lot 2 — Deux guides pour commencer

**Guide médecin : « Premier remplacement en médecine générale : préparer ses démarches et son arrivée ».** Répondre aux questions de préparation, distinguer les statuts sans publier de règles non vérifiées, proposer une checklist et renvoyer aux sources officielles. Conversion attendue : profil médecin, puis recherche de mission. La formulation est directement soutenue par les suggestions observées.

**Guide cabinet : « Annonce de remplacement médical : les informations à donner et une trame à compléter ».** Fournir une trame originale, des exemples explicitement fictifs et une grille de comparaison. Conversion attendue : création d’espace cabinet ou démonstration. L’angle exact reste une hypothèse à tester, mais il soutient le parcours commercial.

Préparer ensuite les sujets « comparer les remplacements en médecine générale » et « contrat de remplacement médical : points à vérifier ». Quatre brouillons ont été commencés avant la demande de stratégie ; ils restent hors des routes publiques, dans `docs/seo/guides-draft.ts`. Leur existence ne détermine pas l’ordre de publication. Le contenu sur le contrat doit renvoyer directement aux modèles officiels, sans faire passer la proposition MédiLink pour un contrat ordinal.

Chaque guide doit avoir un auteur/éditeur identifié sans qualification inventée, des dates éditoriales réelles, les sources à proximité des repères réglementaires, des liens utiles et un seul appel à l’action principal. Publier après relecture du fond et vérification du rendu. [Google : contenu utile](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### Lot 3 — Décider avec les premiers résultats

Sur une première période de quatre semaines, vérifier l’exploration et l’indexation, puis examiner les impressions par famille de requêtes. Comparer ensuite des fenêtres de 28 jours sans interpréter quelques clics comme une tendance établie. Ce calendrier organise le travail ; il ne promet pas de résultats SEO en quatre semaines.

- Impressions mais peu de clics : examiner adéquation requête/page, titre et description, en tenant compte de la position.
- Visites mais peu d’actions : examiner l’offre disponible et le parcours d’inscription avant d’ajouter des articles.
- Recherches locales et offres réelles dans le même bassin : envisager une page locale riche et tenue à jour.
- Questions précises récurrentes : enrichir le guide correspondant ou créer un contenu distinct si l’intention le justifie.

## Mesure et informations manquantes

Le tableau de suivi doit distinguer : impressions et clics hors marque, pages indexées utiles, inscriptions médecins issues du référencement, profils avec disponibilités, demandes cabinet et premières candidatures. Les événements de conversion et leur attribution ne sont pas vérifiés dans cette étude ; ils restent à définir et instrumenter avec le dispositif de mesure retenu.

Pour compléter la priorisation chiffrée : accès ou export Search Console, export Keyword Planner avec paramètres, domaine principal, public prioritaire et zone réellement couverte. Aucun compte publicitaire ne sera ouvert, aucune campagne ne sera lancée et aucun contact externe ne sera sollicité dans ce travail SEO.

Le prochain lot doit suivre cette stratégie : fondations + pages métier + deux premiers guides, puis examen des résultats avant élargissement. Les volumes restent « non mesurés » tant qu’aucune donnée adaptée n’a été obtenue.
