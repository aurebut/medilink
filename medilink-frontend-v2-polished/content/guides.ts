export type GuideSource = { label: string; url: string };
export type Guide = {
  slug: string;
  title: string;
  description: string;
  audience: string;
  published: string;
  updated: string;
  intro: string;
  takeaway: string;
  sections: { id: string; title: string; paragraphs: string[]; checklist?: string[]; template?: string; sources?: GuideSource[] }[];
  related: string;
  cta: { label: string; href: string; text: string };
};

const ordre = { label: 'Ordre des médecins : les conditions du remplacement', url: 'https://www.conseil-national.medecin.fr/medecin/carriere/remplacement-dun-medecin' };
const interne = { label: 'Ordre des médecins : interne ou docteur junior remplaçant', url: 'https://www.conseil-national.medecin.fr/etudiant-interne-docteur-junior/linterne-docteur-junior-remplacant' };
const ameli = { label: 'Assurance Maladie : remplacer un confrère', url: 'https://www.ameli.fr/medecin/exercice-liberal/vie-cabinet/remplacements' };

// Publication and revision dates are editorial decisions, never build timestamps.
export const guides: Guide[] = [
  {
    slug: 'premier-remplacement-medical-checklist',
    title: 'Premier remplacement en médecine générale : la checklist de préparation',
    description: 'Préparez votre premier remplacement en médecine générale : démarches selon votre statut, documents, conditions et prise en main du cabinet.',
    audience: 'Médecins remplaçants', published: '2026-09-08', updated: '2026-09-08',
    intro: 'Votre premier remplacement en médecine générale se prépare avant la première consultation. Au-delà des dates, il faut comprendre le fonctionnement du cabinet, réunir les documents utiles et confirmer les conditions avec le titulaire. Cette checklist concerne le remplacement en libéral en France et vous aide à organiser ces échanges.',
    takeaway: 'Pour chaque sujet, notez ce qui est confirmé, ce qui reste à vérifier et la personne à contacter. Gardez cette liste à portée de main jusqu’au premier jour.',
    sections: [
      { id: 'statut', title: '1. Vérifier les démarches liées à votre statut', paragraphs: [
        'Si vous êtes interne ou docteur junior, distinguez la licence de remplacement de l’autorisation : la première concerne votre éligibilité, la seconde le remplacement envisagé. Vérifiez votre situation et la spécialité concernée avec le conseil départemental de l’Ordre.',
        'Si vous exercez comme médecin inscrit au tableau de l’Ordre, préparez votre attestation d’inscription. Vérifiez votre assurance de responsabilité civile professionnelle et les formalités auprès de l’Assurance Maladie. Pour les affiliations sociales, faites préciser les démarches adaptées à votre statut par les organismes concernés.',
      ], sources: [interne, ordre, ameli] },
      { id: 'conditions', title: '2. Comparer les conditions du remplacement', paragraphs: [
        'Une période compatible avec votre agenda ne suffit pas à choisir un cabinet. Relevez les horaires réels, la durée des consultations, les visites à domicile, la présence d’un secrétariat et le logiciel utilisé. Demandez qui sera joignable pour les questions d’organisation.',
        'Pour les conditions financières, faites préciser le pourcentage de rétrocession, sa base de calcul, le calendrier de règlement et les éventuels frais de déplacement ou d’hébergement. Une information absente doit devenir une question, pas une supposition.',
      ], checklist: ['Dates exactes et jours que vous pouvez couvrir.', 'Adresse, trajet et éventuel hébergement.', 'Horaires, rendez-vous, visites et secrétariat.', 'Logiciel, équipement et temps de prise en main.', 'Conditions financières et modalités de règlement.'] },
      { id: 'documents', title: '3. Préparer les documents avant de commencer', paragraphs: [
        'Le contrat de remplacement doit être signé et transmis au conseil départemental de l’Ordre. Les pages officielles ci-dessous orientent vers les modèles et les démarches à suivre selon votre situation.',
        'Rassemblez les justificatifs demandés par le cabinet dans un dossier facile à retrouver. Vérifiez les dates de validité et identifiez votre interlocuteur si une pièce doit être actualisée. Relisez le dernier accord sur les dates, les horaires et les conditions pour éviter de préparer votre arrivée à partir d’un ancien échange.',
        'Une proposition acceptée dans MédiLink récapitule les modalités convenues. Elle ne remplace pas le contrat de remplacement ni les démarches ordinales.',
      ], checklist: ['Justificatif de votre situation professionnelle.', 'Licence et autorisation si votre situation les exige.', 'Attestation d’assurance à jour.', 'Contrat signé et formalités vérifiées avec le titulaire.', 'Coordonnées utiles pour le premier jour.'], sources: [ordre, ameli] },
      { id: 'arrivee', title: '4. Organiser la prise en main du cabinet', paragraphs: [
        'Prévoyez un échange avant la première consultation. Comment entre-t-on dans les locaux ? Où se trouve le matériel ? Comment joindre le secrétariat ? Quel est le fonctionnement des rendez-vous et des appels ? Un bref tour du cabinet peut faire apparaître des questions que l’annonce ne couvrait pas.',
        'Faites organiser vos accès au logiciel avec le cabinet et son éditeur, puis vérifiez leur fonctionnement en amont. Demandez les procédures prévues pour les transmissions cliniques et utilisez les outils du cabinet destinés à la prise en charge des patients.',
      ] },
      { id: 'depart', title: '5. Préparer aussi la fin du remplacement', paragraphs: [
        'Convenez dès le départ du moment où vous ferez le point avec le titulaire. Pour le suivi organisationnel, notez les éléments terminés, les actions encore ouvertes et leur échéance. Les transmissions cliniques suivent les procédures du cabinet.',
        'Avant de partir, vérifiez la restitution du matériel et le devenir de vos accès. Retrouvez les modalités de règlement convenues et l’interlocuteur chargé du décompte. Votre dossier de mission MédiLink permet de conserver le fil des échanges administratifs autour du remplacement.',
      ] },
    ],
    related: 'annonce-remplacement-medical-cabinet',
    cta: { label: 'Créer mon profil remplaçant', href: '/register?type=candidate', text: 'Renseignez votre statut, vos disponibilités et votre zone de recherche pour préparer vos prochaines candidatures.' },
  },
  {
    slug: 'annonce-remplacement-medical-cabinet',
    title: 'Annonce de remplacement médical : les informations utiles et une trame',
    description: 'Rédigez une annonce de remplacement en médecine générale : dates, organisation, conditions et trame à compléter pour votre cabinet.',
    audience: 'Cabinets médicaux', published: '2026-09-08', updated: '2026-09-08',
    intro: 'Une annonce de remplacement médical aide le médecin à répondre à une question simple : ce cabinet correspond-il à mes disponibilités et à ma façon d’exercer ? Voici une méthode et une trame pour présenter un besoin en médecine générale, sans multiplier les échanges pour obtenir les informations de base.',
    takeaway: 'Décrivez le quotidien réel du cabinet et les jours à couvrir. Une annonce précise donne au remplaçant les moyens de décider s’il souhaite poursuivre l’échange.',
    sections: [
      { id: 'besoin', title: '1. Décrire précisément le besoin', paragraphs: [
        'Commencez par la commune, la spécialité et les dates. Indiquez les jours travaillés et les horaires. Si une couverture partielle est envisageable, dites-le : un médecin disponible trois jours pourrait répondre à une partie de votre besoin.',
        'Distinguez un remplacement ponctuel d’un besoin récurrent. Pour une récurrence, précisez le rythme souhaité et ce qui reste à discuter. Évitez les formules générales comme « plusieurs dates disponibles » lorsqu’un calendrier concret peut être donné.',
      ] },
      { id: 'cabinet', title: '2. Donner à voir une journée au cabinet', paragraphs: [
        'Expliquez le mode d’exercice : cabinet individuel ou en groupe, rendez-vous, visites, secrétariat et logiciel. Décrivez les moyens disponibles et les particularités pratiques qui influencent la journée, sans inclure d’informations nominatives sur les patients.',
        'Ajoutez les conditions d’accès, le stationnement et les possibilités d’hébergement lorsqu’elles existent réellement. Précisez si un temps de prise en main est prévu et qui pourra répondre aux questions du remplaçant.',
      ], checklist: ['Organisation des consultations et des visites.', 'Secrétariat et gestion des appels.', 'Logiciel métier et équipement.', 'Accès, transport et hébergement éventuel.', 'Temps de prise en main et contact sur place.'] },
      { id: 'modalites', title: '3. Clarifier les conditions proposées', paragraphs: [
        'Précisez la rétrocession envisagée et les modalités à confirmer ensemble : base de calcul, calendrier de règlement et frais éventuels. Ne présentez pas un pourcentage seul comme une description complète de la rémunération.',
        'Séparez ce qui est fixé de ce qui peut se discuter. La même clarté s’applique aux horaires et à la possibilité de couvrir seulement certains jours. Mettez à jour l’annonce lorsque le besoin évolue.',
      ] },
      { id: 'trame', title: '4. Une trame d’annonce à compléter', paragraphs: [
        'Remplacez chaque champ entre crochets par une information vérifiée. Retirez les rubriques sans objet et indiquez clairement les modalités qui restent à convenir. Cette trame est un outil de rédaction, pas une offre réelle.',
      ], template: 'Remplacement en médecine générale — [commune, département]\n\nPériode : [dates de début et de fin]\nJours et horaires : [créneaux recherchés]\nCouverture partielle : [possible ou non, modalités]\n\nLe cabinet : [exercice seul ou en groupe, organisation]\nConsultations et visites : [fonctionnement habituel]\nSecrétariat : [présence et gestion des appels]\nLogiciel et équipement : [informations utiles]\n\nConditions proposées : [rétrocession, base de calcul et règlement à convenir]\nAccès et hébergement : [options réellement disponibles]\nPrise en main : [moment prévu et interlocuteur]\n\nPour échanger : indiquez vos disponibilités sur la période et les questions que vous souhaitez préciser.' },
      { id: 'suite', title: '5. Passer de l’annonce à un remplacement préparé', paragraphs: [
        'À réception d’une candidature, vérifiez d’abord la période proposée et les questions du médecin. Une réponse courte mais précise facilite la suite : jours compatibles, informations manquantes et moment possible pour un échange.',
        'Avant le début du remplacement, vérifiez avec le remplaçant les justificatifs, le contrat et les formalités auprès de l’Ordre correspondant à sa situation. Conservez une version commune des conditions retenues.',
        'Dans MédiLink, vous pouvez préparer votre besoin depuis l’espace cabinet, puis retrouver les candidatures et les échanges liés à la mission. La publication d’une annonce ne garantit pas la réception d’une candidature.',
      ], sources: [ordre] },
    ],
    related: 'premier-remplacement-medical-checklist',
    cta: { label: 'Créer mon espace cabinet', href: '/register?type=establishment', text: 'Préparez votre annonce et rassemblez les informations utiles aux médecins remplaçants.' },
  },
];

export function readingMinutes(guide: Guide) {
  const words = [guide.intro, guide.takeaway, ...guide.sections.flatMap(section => [...section.paragraphs, ...(section.checklist || []), section.template || ''])].join(' ').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
