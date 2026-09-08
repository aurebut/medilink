# Visuels des guides — 8 septembre 2026

Les images servent à illustrer les sujets. Elles ne présentent pas des membres, patients, partenaires ou utilisateurs réels de MédiLink.

## Photos recherchées et retenues

| Fichier principal dans `public/guide-assets` | Auteur et source | Usage |
|---|---|---|
| `preparer-premier-remplacement.webp` | [Abdulai Sayni, Unsplash](https://unsplash.com/photos/a-notebook-with-a-stethoscope-on-top-of-it-next-to-a-laptop-u2EjDa_hYJI) | Carnet, stéthoscope et ordinateur ; préparation du premier remplacement |
| `contrat-remplacement-medical.webp` | [Scott Graham, Unsplash](https://unsplash.com/photos/OQMZwNd3ThU) | Mains annotant un document ; relecture du contrat |

Sources consultées le 8 septembre 2026. La seconde photo a été trouvée sur la [sélection Unsplash « contract signing »](https://unsplash.com/s/photos/contract-signing), avec son auteur et son lien de téléchargement gratuit. Les téléchargements ne proviennent pas de l’offre Unsplash+.

La [licence Unsplash](https://unsplash.com/license) autorise le téléchargement, l’adaptation et l’utilisation commerciale. Un crédit avec lien vers la photo est affiché dans l’article. Les fichiers sont hébergés sur MédiLink ; aucun appel d’image vers Unsplash n’est nécessaire pendant la lecture.

Une photo de calculatrice a été écartée après inspection : les documents fiscaux américains visibles ne convenaient pas à un guide français. Elle n’est pas publiée.

## Illustrations du dépôt réutilisées

| Fichier principal | Source existante | Crédit visible |
|---|---|---|
| `annonce-remplacement-cabinet.webp` | `landing-assets/process-criteria.png` | Illustration MédiLink, générée par IA |
| `choisir-remplacement-medecine-generale.webp` | `landing-assets/process-matching.png` | Illustration MédiLink, générée par IA |
| `retrocession-remplacement-medical.webp` | `landing-assets/process-report.png` | Illustration MédiLink, générée par IA |
| `accueillir-medecin-remplacant.webp` | `landing-assets/hero-medecin.png` | Illustration MédiLink |

Les prompts des trois illustrations de processus sont conservés dans `public/landing-assets/process-images-prompts.md`. Les nouveaux fichiers sont des recadrages et redimensionnements de ressources existantes, sans nouvelle génération.

## Formats et performance

- Image éditoriale : WebP 1600 × 1000, qualité 80.
- Variante mobile : suffixe `-640.webp`, 640 × 400, qualité 78.
- Partage Open Graph / Twitter / Article : suffixe `-social.jpg`, JPEG 1200 × 630, qualité 82.
- Les six WebP de grande taille totalisent 301 032 octets ; chaque fichier pèse entre 43 et 62 ko environ.
- Dimensions réservées dans le HTML, `srcset` et `sizes`, image d’en-tête prioritaire, cartes suivantes chargées à la demande, textes alternatifs descriptifs.
- Chaque article possède son image sociale, son crédit et sa légende appropriée. Les fichiers originaux des photos restent hors du lot publié.
