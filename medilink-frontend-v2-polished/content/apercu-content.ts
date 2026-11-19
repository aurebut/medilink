import captures from '@/public/landing-assets/interface/manifest.json';

// Copy and data for the from-scratch homepage preview at /apercu-design.
// The wording comes from the published homepage (lightened); people, practice and dates are the
// fictional fixtures already used by the product captures.

export const navLinks = [
  { href: '/remplacement-medical', label: 'Médecin remplaçant' },
  { href: '/trouver-medecin-remplacant', label: 'Cabinet / médecin installé' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/guides', label: 'Guides pratiques' },
];

export const weekDays = [
  { short: 'Lun', date: '14' }, { short: 'Mar', date: '15' }, { short: 'Mer', date: '16' },
  { short: 'Jeu', date: '17' }, { short: 'Ven', date: '18' },
];

export const criteria = ['Dates', 'Lieu', 'Spécialité', 'Logiciel', 'Horaires', 'Conditions'];

type Capture = { name: string; device: string; width: number; height: number; sourceScale: number; sha256: string };

// Genuine product captures, with the dimensions and cache keys generated alongside them.
function capture(name: 'mission' | 'messages' | 'documents') {
  const find = (device: string) => (captures.assets as Capture[]).find(asset => asset.name === name && asset.device === device)!;
  const sources = (asset: Capture) => {
    const url = (retina: boolean) => `/landing-assets/interface/${name}-${asset.device}${retina ? '@2x' : ''}.webp?v=${asset.sha256.slice(0, 12)}`;
    return { src: url(false), srcSet: asset.sourceScale === 2 ? `${url(false)} 1x, ${url(true)} 2x` : `${url(false)} 1x`, width: asset.width, height: asset.height };
  };
  return { desktop: sources(find('desktop')), mobile: sources(find('mobile')) };
}

export const showcase = [
  {
    id: 'suivi', tab: 'Suivi', title: 'Savoir où en est la mission.',
    text: 'Dates confirmées, avancement, documents et rétrocession : retrouvez les étapes de votre remplacement au même endroit.',
    alt: 'Suivi MédiLink : mission confirmée, documents transmis, remplacement en cours, fin de mission et rétrocession à suivre.',
    capture: capture('mission'),
  },
  {
    id: 'echanges', tab: 'Échanges', title: 'Garder le contact tout au long de la mission.',
    text: 'Chaque remplacement possède son dossier : messages, documents et conditions confirmées.',
    alt: 'Messagerie MédiLink : conversation avec le cabinet et avancement du remplacement.',
    capture: capture('messages'),
  },
  {
    id: 'documents', tab: 'Documents', title: 'Vos documents réunis dans un espace commun.',
    text: 'Générez votre contrat, réunissez vos justificatifs et transmettez votre dossier. Pour vos remplacements en exercice libéral individuel.',
    alt: 'Dossier partagé MédiLink : contrat de remplacement à signer, déclaration à l’Ordre et justificatifs professionnels.',
    capture: capture('documents'),
  },
];

export const contributors = [
  { photo: '/landing-assets/temoignage-sarah-bernard.png' },
  { photo: '/landing-assets/temoignage-claire-martin.png' },
  { photo: '/landing-assets/temoignage-juliette-moreau.png' },
];

export const faqGroups = [
  { title: "Pour les médecins remplaçants", items: [
    { question: "Pourquoi MédiLink me propose-t-il cette mission ?", answer: "MédiLink vérifie d’abord les critères indispensables, puis compare notamment les créneaux, la mobilité, le cadre d’exercice, le logiciel, la patientèle et les actes renseignés. Le détail du score explique les points de compatibilité." },
    { question: "Quelles informations le cabinet voit-il sur mon profil ?", answer: "Le cabinet voit votre profil professionnel et les éléments utiles pour comprendre la recommandation. Vos préférences servent au filtrage et au calcul de compatibilité : leur liste complète et vos refus ne sont pas visibles par le cabinet." }
  ] },
  { title: "Pour les cabinets et médecins installés", items: [
    { question: "Que dois-je préciser pour trouver un remplaçant ?", answer: "Précisez le niveau requis, la spécialité, les dates, les horaires, la localisation, l’organisation, le logiciel, la patientèle et les actes concernés. Plus le besoin est complet, plus la recommandation est précise et facile à comprendre." },
    { question: "Qui peut consulter les documents du remplaçant ?", answer: "Le médecin remplaçant dépose ses documents dans son espace. Les documents qu’il autorise sont consultables par le cabinet dans le contexte d’une candidature, sans envoi répété par e-mail." }
  ] },
  { title: "Fonctionnement commun de la plateforme", items: [
    { question: "Quand puis-je échanger avec l’autre médecin ?", answer: "Une conversation est créée dans le cadre d’une candidature. Les messages et les mises à jour restent liés à la mission pour que les deux parties retrouvent le même historique." },
    { question: "Comment confirme-t-on les conditions du remplacement ?", answer: "Après les échanges, le cabinet envoie une proposition finale avec le montant ou la rétrocession, les dates, les horaires et les conditions. Le médecin peut l’accepter ou la refuser directement dans la conversation." },
    { question: "Quelles informations restent accessibles après la mission ?", answer: "La mission confirmée reste visible dans l’agenda et son dossier conserve les conditions convenues. Après le remplacement, la fin de mission et les informations de rétrocession déclarées peuvent aussi y être conservées." }
  ] }
];

export const footerColumns = [
  { title: 'Médecin remplaçant', links: [
    { href: '/remplacement-medical', label: 'Découvrir le parcours' },
    { href: '/search', label: 'Voir les missions' },
    { href: '/register?type=candidate', label: 'Créer un profil' },
  ] },
  { title: 'Cabinet / médecin installé', links: [
    { href: '/trouver-medecin-remplacant', label: 'Découvrir le parcours' },
    { href: '/register?type=establishment', label: 'Créer un espace' },
    { href: '/login', label: 'Se connecter' },
  ] },
  { title: 'MédiLink', links: [
    { href: '#parcours', label: 'Comment ça marche' },
    { href: '/tarifs', label: 'Tarifs' },
    { href: '/guides', label: 'Guides pratiques' },
    { href: '#faq', label: 'Questions fréquentes' },
  ] },
];
