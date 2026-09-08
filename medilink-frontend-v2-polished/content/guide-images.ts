import type { GuideImage } from './guide-types';

// Sources, licenses and transformations are recorded in docs/seo/IMAGES.md.
export const guideImages = {
  preparation: {
    src: '/guide-assets/preparer-premier-remplacement.webp',
    alt: 'Stéthoscope posé sur un carnet de notes à côté d’un ordinateur.',
    credit: 'Photo d’illustration : Abdulai Sayni / Unsplash',
    creditUrl: 'https://unsplash.com/photos/a-notebook-with-a-stethoscope-on-top-of-it-next-to-a-laptop-u2EjDa_hYJI',
  },
  annonce: {
    src: '/guide-assets/annonce-remplacement-cabinet.webp',
    alt: 'Portrait illustré d’une médecin au cabinet.',
    credit: 'Illustration MédiLink, générée par IA.',
  },
  choisir: {
    src: '/guide-assets/choisir-remplacement-medecine-generale.webp',
    alt: 'Illustration de deux médecins échangeant au cabinet.',
    credit: 'Illustration MédiLink, générée par IA.',
  },
  contrat: {
    src: '/guide-assets/contrat-remplacement-medical.webp',
    alt: 'Une personne relit et annote un document sur une table.',
    credit: 'Photo d’illustration : Scott Graham / Unsplash',
    creditUrl: 'https://unsplash.com/photos/OQMZwNd3ThU',
  },
  retrocession: {
    src: '/guide-assets/retrocession-remplacement-medical.webp',
    alt: 'Portrait illustré d’une médecin dans son espace de travail.',
    credit: 'Illustration MédiLink, générée par IA.',
  },
  accueil: {
    src: '/guide-assets/accueillir-medecin-remplacant.webp',
    alt: 'Illustration d’une consultation dans un cabinet de médecine générale.',
    credit: 'Illustration MédiLink.',
  },
} satisfies Record<string, GuideImage>;
