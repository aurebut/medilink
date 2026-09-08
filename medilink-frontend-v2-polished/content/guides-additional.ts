import type { Guide } from './guide-types';
import { guideImages } from './guide-images';

const ordre = { label: 'Ordre des médecins : le remplacement d’un médecin', url: 'https://www.conseil-national.medecin.fr/medecin/carriere/remplacement-dun-medecin' };
const contrats = { label: 'Ordre des médecins : modèles de contrats de remplacement', url: 'https://www.conseil-national.medecin.fr/documents-demarches/documents-types-medecins/cabinet-carriere/modeles-contrats' };
const modele = { label: 'Ordre des médecins : modèle de remplacement par un médecin (PDF)', url: 'https://www.conseil-national.medecin.fr/sites/default/files/cnom_remplmed.pdf' };
const ameli = { label: 'Assurance Maladie : remplacer un confrère', url: 'https://www.ameli.fr/medecin/exercice-liberal/vie-cabinet/remplacements' };

export const additionalGuides: Guide[] = [
  {
    slug: 'choisir-remplacement-medecine-generale',
    title: 'Comment choisir un remplacement en médecine générale adapté à votre pratique ?',
    seoTitle: 'Choisir un remplacement en médecine générale',
    shortTitle: 'Choisir un remplacement', topic: 'Choisir une mission',
    description: 'Dates, trajet, logiciel, visites et rétrocession : comparez les annonces de remplacement en médecine générale avec une grille et des questions concrètes.',
    audience: 'Médecins remplaçants', published: '2026-09-08', updated: '2026-09-08', image: guideImages.choisir,
    intro: 'Deux annonces de remplacement en médecine générale peuvent proposer les mêmes dates et correspondre à des journées très différentes. Avant de candidater, examinez le trajet, le rythme du cabinet, les moyens disponibles et les conditions proposées. Cette méthode vous aide à comparer les missions sur des critères concrets, puis à poser les questions qui manquent.',
    takeaway: 'Choisissez trois critères indispensables avant de lire les annonces. Comparez ensuite chaque cabinet avec la même grille, sans transformer les informations absentes en hypothèses favorables.',
    sections: [
      { id: 'priorites', title: '1. Fixer vos priorités avant de consulter les annonces', paragraphs: [
        'Commencez par vos disponibilités réelles : jours entiers, demi-journées, périodes réservées et marge de déplacement. Une mission qui finit tard la veille d’un engagement éloigné peut être difficile à tenir, même si les dates semblent compatibles sur le calendrier.',
        'Séparez vos conditions indispensables de vos préférences. Vous pouvez, par exemple, avoir besoin de travailler quatre jours précis tout en restant flexible sur le logiciel. À l’inverse, pour découvrir un nouveau cabinet, un environnement informatique connu peut être votre priorité. Cette hiérarchie évite de comparer toutes les annonces uniquement sur la rétrocession.',
        'Notez aussi votre rayon de recherche en temps de trajet. Vingt kilomètres en milieu urbain et vingt kilomètres sur une route fluide ne représentent pas la même organisation. Pour une semaine éloignée, demandez si un hébergement est réellement disponible et dans quelles conditions.',
      ] },
      { id: 'grille', title: '2. Utiliser la même grille pour chaque remplacement', paragraphs: [
        'Relevez les informations de l’annonce dans un tableau, puis complétez les cases après un échange avec le cabinet. L’objectif est de repérer les différences qui auront un effet sur votre journée. Une réponse « à confirmer » reste visible jusqu’à ce qu’elle soit clarifiée.',
      ], table: { caption: 'Grille de comparaison à reprendre pour chaque cabinet', headers: ['Critère', 'Ce qu’il faut préciser', 'Question utile'], rows: [
        ['Disponibilités', 'Dates, jours et demi-journées recherchés', 'Une couverture partielle est-elle possible ?'],
        ['Rythme', 'Plages de consultation, pauses et visites', 'Comment se déroule une journée habituelle ?'],
        ['Organisation', 'Secrétariat, appels et autres médecins présents', 'Qui répond aux questions pratiques ?'],
        ['Logiciel', 'Outil utilisé et session de remplacement', 'Quand peut-on tester les accès ?'],
        ['Déplacement', 'Temps de trajet et hébergement éventuel', 'Quelles conditions d’arrivée et de stationnement ?'],
        ['Rétrocession', 'Taux, base de calcul et règlement', 'Comment le décompte est-il partagé ?'],
      ] } },
      { id: 'quotidien', title: '3. Comprendre le quotidien au-delà du titre de l’annonce', paragraphs: [
        'Demandez comment les rendez-vous sont organisés, si des visites sont prévues et qui gère les appels pendant les consultations. La présence d’un secrétariat mérite d’être précisée : sur place, à distance, toute la journée ou seulement sur certains créneaux.',
        'Pour le logiciel, connaître le nom ne suffit pas. Vérifiez le temps prévu pour découvrir les habitudes du cabinet et le fonctionnement de vos accès. Un échange de prise en main est particulièrement utile si vous découvrez à la fois le logiciel, les locaux et l’organisation.',
        'Exemple fictif : le cabinet A propose quatre jours avec secrétariat sur place et quarante minutes de trajet. Le cabinet B propose trois jours, dix minutes de trajet et une gestion directe des appels. Aucun n’est automatiquement préférable : la bonne réponse dépend de vos disponibilités, de votre aisance avec cette organisation et des conditions convenues.',
      ], links: [{ label: 'Préparer la prise en main du cabinet avec le titulaire', url: '/guides/accueillir-medecin-remplacant-cabinet' }] },
      { id: 'conditions', title: '4. Lire les conditions financières dans leur ensemble', paragraphs: [
        'Un taux de rétrocession est un élément de comparaison, mais il ne renseigne pas à lui seul sur le montant qui sera versé. Demandez la base de calcul retenue, les modalités du décompte et la date de règlement. Distinguez les conditions annoncées des points encore ouverts à la discussion.',
        'Pour votre organisation personnelle, relevez séparément le transport et l’hébergement. Ces dépenses ne doivent pas être confondues avec la rétrocession. Si l’activité passée du cabinet est évoquée, traitez-la comme un élément de contexte et non comme une garantie de recettes pour votre remplacement.',
      ], links: [{ label: 'Comprendre la rétrocession avec un exemple de calcul', url: '/guides/retrocession-remplacement-medecine-generale' }] },
      { id: 'message', title: '5. Envoyer une candidature qui facilite la réponse', paragraphs: [
        'Votre premier message peut rester court. Indiquez la période visée, vos disponibilités exactes et une information de votre parcours utile au cabinet. Regroupez les questions importantes plutôt que d’envoyer plusieurs messages successifs.',
        'Voici un exemple fictif à adapter uniquement à votre situation. Il permet au cabinet d’identifier immédiatement ce qui correspond à son besoin et ce qui reste à préciser.',
      ], template: 'Bonjour,\nJe suis disponible [jours et dates] pour le remplacement proposé. Mon statut est [statut professionnel] et j’ai déjà utilisé [logiciel, si exact].\nPourriez-vous me préciser [organisation des visites / présence du secrétariat / prise en main] ?\nJe peux échanger [créneaux].\nBien cordialement.', links: [{ label: 'Vérifier les démarches avant un premier remplacement', url: '/guides/premier-remplacement-medical-checklist' }] },
    ],
    faq: [
      { question: 'Faut-il choisir le taux de rétrocession le plus élevé ?', answer: 'Comparez aussi la base de calcul, le règlement, l’organisation et vos frais pratiques. Le taux seul ne permet pas de comparer le quotidien ou les sommes effectivement versées.' },
      { question: 'Puis-je proposer seulement une partie des dates ?', answer: 'Vous pouvez préciser les jours que vous êtes en mesure de couvrir et demander si une couverture partielle convient. Le cabinet reste libre de retenir une autre organisation.' },
    ],
    related: ['retrocession-remplacement-medecine-generale', 'contrat-remplacement-medical-points-a-verifier', 'premier-remplacement-medical-checklist'],
    cta: { label: 'Préparer mon profil remplaçant', href: '/register?type=candidate', text: 'Renseignez vos disponibilités et vos critères pour préparer vos prochaines candidatures sur MédiLink.' },
  },
  {
    slug: 'contrat-remplacement-medical-points-a-verifier',
    title: 'Contrat de remplacement médical : les points à vérifier avant de signer',
    seoTitle: 'Contrat de remplacement médical : points à vérifier',
    shortTitle: 'Relire le contrat', topic: 'Conditions et contrat',
    description: 'Modèles officiels, dates, moyens du cabinet et rétrocession : une grille pour relire votre contrat de remplacement médical et préparer vos questions.',
    audience: 'Médecins et cabinets', published: '2026-09-08', updated: '2026-09-08', image: guideImages.contrat,
    intro: 'Le contrat de remplacement médical formalise les conditions retenues par le médecin remplacé et le remplaçant. Avant de signer, partez du modèle officiel adapté à votre situation et comparez le texte avec vos derniers échanges. Cette grille vous aide à préparer la relecture et les questions à adresser au conseil départemental de l’Ordre.',
    takeaway: 'Relisez le contrat avec votre calendrier et la dernière version des conditions convenues. Faites préciser les points incertains avant de signer, surtout si une clause a été ajoutée à un ancien modèle.',
    sections: [
      { id: 'modele', title: '1. Choisir le modèle officiel correspondant à la situation', paragraphs: [
        'Le Conseil national de l’Ordre des médecins propose des modèles distincts pour un remplacement en libéral par un médecin ou par un étudiant. Sa page officielle permet de retrouver le document correspondant et rappelle la possibilité de soumettre un projet au conseil départemental.',
        'Ce guide est une aide à la relecture, pas un modèle de contrat ni un avis juridique personnalisé. Évitez de partir d’une pièce jointe ancienne sans vérifier sa provenance. Conservez le lien de la source utilisée et la date à laquelle vous avez récupéré le document.',
        'Une fois le bon modèle choisi, rassemblez les informations avant de le remplir : identité des parties, statut, coordonnées, lieu d’exercice et période envisagée. Vérifiez les données avec l’autre partie plutôt que de recopier celles d’une annonce qui a pu évoluer.',
      ], sources: [contrats] },
      { id: 'periode', title: '2. Comparer la période écrite avec les disponibilités convenues', paragraphs: [
        'La date de début et la date de fin doivent correspondre au dernier accord. Vérifiez ensemble les jours concernés, les éventuelles interruptions et les modalités pratiques qui nécessitent une précision. Une modification discutée oralement peut facilement manquer dans le document final.',
        'Exemple fictif : l’annonce initiale portait sur une semaine complète, puis les échanges ont abouti à quatre jours. Relire uniquement le nom et le taux de rétrocession laisserait passer cet écart. Reprenez les informations de la version finale point par point avec votre agenda.',
      ], checklist: ['Identité et coordonnées actualisées des parties.', 'Lieu du remplacement.', 'Dates de début et de fin cohérentes avec l’accord.', 'Jours et modalités pratiques à préciser.', 'Version du document clairement identifiée.'] },
      { id: 'moyens', title: '3. Clarifier les moyens et le fonctionnement du cabinet', paragraphs: [
        'Pendant la relecture, listez les questions pratiques que le contrat ne permet pas de résoudre seul : accès aux locaux, matériel, logiciel, secrétariat et interlocuteurs. Le contrat et le brief d’accueil remplissent des rôles complémentaires ; évitez de laisser une promesse importante uniquement dans une conversation difficile à retrouver.',
        'Si un document pratique est joint, convenez de son intitulé, de sa date et de sa place dans votre accord. Faites préciser par un conseil compétent comment intégrer un élément qui a une portée contractuelle. Une simple liste de contacts n’a pas le même objet qu’une condition financière.',
      ], links: [{ label: 'Préparer un brief d’accueil pour le remplaçant', url: '/guides/accueillir-medecin-remplacant-cabinet' }] },
      { id: 'finances', title: '4. Vérifier le calcul et les modalités de rétrocession', paragraphs: [
        'Relisez la part prévue pour le remplaçant, la base de calcul et les modalités de règlement. Le modèle ordinal par un médecin comporte une rubrique sur les honoraires ; servez-vous du texte officiel comme point de départ pour les questions à clarifier ensemble.',
        'Demandez comment sera établi le décompte, qui le transmettra et comment seront suivis les encaissements arrivant après la période travaillée. Notez séparément les conditions de transport ou d’hébergement lorsqu’elles existent. Une formulation imprécise doit être expliquée avant la signature.',
      ], sources: [modele], links: [{ label: 'Lire l’exemple de rétrocession et la liste des questions à poser', url: '/guides/retrocession-remplacement-medecine-generale' }] },
      { id: 'clauses', title: '5. Faire expliquer les clauses qui vous engagent', paragraphs: [
        'Repérez les dispositions relatives à une interruption, un désaccord, la fin du remplacement ou une installation ultérieure. Ne déduisez pas leur portée de leur titre : adressez le texte exact et votre question au conseil départemental ou à votre conseil habituel.',
        'Évitez de supprimer ou de recopier une clause parce qu’elle semble standard. Une clause reprise d’une autre situation mérite la même relecture que le reste du document. Gardez une trace des précisions reçues et vérifiez que la version à signer est celle qui a été discutée.',
      ] },
      { id: 'signature', title: '6. Conserver le contrat et vérifier les formalités', paragraphs: [
        'L’Ordre rappelle qu’un contrat signé doit être communiqué au conseil départemental, quelle que soit la durée du remplacement. Vérifiez les démarches adaptées à la situation avec le cabinet et le conseil concerné.',
        'Conservez un exemplaire facilement retrouvable, ainsi que les pièces nécessaires aux formalités. Dans MédiLink, la proposition liée à une mission récapitule des modalités : son acceptation ne se substitue pas au contrat de remplacement ni aux démarches ordinales.',
      ], sources: [ordre] },
    ],
    faq: [
      { question: 'Où trouver un modèle de contrat de remplacement médical ?', answer: 'Sur la page « Modèles de contrats » du Conseil national de l’Ordre des médecins, citée dans ce guide. Choisissez le modèle correspondant au statut du remplaçant.' },
      { question: 'L’accord dans MédiLink suffit-il pour commencer ?', answer: 'L’acceptation d’une proposition sur la plateforme ne remplace pas le contrat ni les formalités ordinales. Vérifiez votre dossier avec le cabinet avant le début du remplacement.' },
    ],
    related: ['retrocession-remplacement-medecine-generale', 'premier-remplacement-medical-checklist', 'accueillir-medecin-remplacant-cabinet'],
    cta: { label: 'Découvrir le parcours remplaçant', href: '/remplacement-medical', text: 'Préparez votre profil et retrouvez les échanges administratifs liés à vos candidatures.' },
  },
  {
    slug: 'retrocession-remplacement-medecine-generale',
    title: 'Rétrocession en remplacement de médecine générale : comprendre le calcul',
    seoTitle: 'Rétrocession en médecine générale : calcul et questions',
    shortTitle: 'Comprendre la rétrocession', topic: 'Conditions et contrat',
    description: 'Un exemple chiffré pour comprendre la rétrocession d’un médecin remplaçant, distinguer montant versé et revenu disponible, et clarifier le règlement.',
    audience: 'Médecins et cabinets', published: '2026-09-08', updated: '2026-09-08', image: guideImages.retrocession,
    intro: 'Une annonce indique un pourcentage de rétrocession, mais ce chiffre ne suffit pas à connaître le montant qui sera versé au médecin remplaçant. Il faut préciser la base de calcul, le sens du pourcentage et les modalités du décompte. Voici un exemple pédagogique et les questions à poser avant de confirmer un remplacement en médecine générale.',
    takeaway: 'Faites écrire à quoi s’applique le pourcentage, quelle part revient au remplaçant et quand le règlement est prévu. Le montant ainsi calculé ne correspond pas automatiquement à votre revenu disponible.',
    sections: [
      { id: 'definition', title: '1. Identifier ce que désigne le pourcentage annoncé', paragraphs: [
        'Dans le modèle ordinal de remplacement par un médecin, la rubrique sur les honoraires prévoit une part à reverser au remplaçant. Pour comprendre une proposition concrète, faites préciser explicitement quelle part désigne le taux affiché dans l’annonce.',
        'Posez la question simplement : « Ce pourcentage correspond-il à la part qui m’est versée ? Sur quels honoraires le calcule-t-on ? » N’essayez pas de résoudre une ambiguïté en vous fondant sur les habitudes d’un autre cabinet. L’accord écrit doit permettre aux deux parties de refaire le même calcul.',
      ], sources: [modele] },
      { id: 'exemple', title: '2. Faire le calcul sur une base clairement définie', paragraphs: [
        'Exemple entièrement fictif : les parties retiennent une base de 4 000 € et conviennent que 75 % de cette base reviennent au remplaçant. Le calcul est alors 4 000 × 0,75 = 3 000 €. Les 1 000 € restants correspondent à la différence sur cette base.',
        'Le taux de 75 % sert uniquement à montrer l’opération. Il n’est présenté ni comme une moyenne du marché, ni comme un taux recommandé. Les montants de cet exemple ne constituent pas une estimation de ce qu’un médecin gagnera pour une semaine de remplacement.',
      ], table: { caption: 'Exemple fictif : montant reversé au remplaçant', headers: ['Élément', 'Hypothèse de l’exemple'], rows: [
        ['Base de calcul convenue', '4 000 €'],
        ['Part du remplaçant', '75 %'],
        ['Opération', '4 000 × 75 ÷ 100'],
        ['Montant reversé au remplaçant', '3 000 €'],
        ['Différence sur la même base', '1 000 €'],
      ] } },
      { id: 'base', title: '3. Préciser les éléments inclus dans le décompte', paragraphs: [
        'Avant la mission, demandez comment le cabinet établira la base du décompte et quelles informations permettront de la vérifier. La période du remplacement, la date de préparation du décompte et la date des encaissements sont des repères différents : notez-les séparément.',
        'Prévoyez la façon de traiter un règlement reçu après le premier décompte, une correction ou une somme encore en attente. Il ne s’agit pas de supposer un fonctionnement universel, mais de convenir du document et de l’interlocuteur qui permettront de suivre votre situation.',
        'Un échange écrit peut servir à résumer la méthode : période concernée, éléments inclus, éléments restant à régulariser et date du prochain point. Faites ensuite vérifier que les conditions du contrat décrivent bien ce qui a été convenu.',
      ], checklist: ['Base et période du calcul identifiées.', 'Part revenant au remplaçant explicitement indiquée.', 'Personne chargée de préparer le décompte.', 'Traitement des encaissements tardifs à clarifier.', 'Modalités de correction et prochain point prévu.'] },
      { id: 'revenu', title: '4. Distinguer la rétrocession de votre revenu disponible', paragraphs: [
        'Les 3 000 € de notre exemple sont un montant reversé dans les hypothèses retenues. Ils ne décrivent pas ce qu’il reste après vos dépenses et vos obligations personnelles. Votre situation professionnelle et les frais engagés nécessitent une analyse distincte.',
        'Pour comparer deux missions, gardez une colonne séparée pour le trajet et l’hébergement. Un pourcentage plus élevé peut s’accompagner d’une organisation plus coûteuse pour vous. Ce guide ne calcule ni cotisations ni impôt ; pour estimer votre revenu disponible, appuyez-vous sur vos organismes et votre conseil comptable.',
      ], links: [{ label: 'Comparer les conditions pratiques de plusieurs remplacements', url: '/guides/choisir-remplacement-medecine-generale' }] },
      { id: 'reglement', title: '5. Préparer le règlement avant la fin du remplacement', paragraphs: [
        'Convenez du calendrier de règlement et du canal de partage du décompte avant de commencer. Attendre le dernier jour pour demander qui s’en occupe peut prolonger inutilement les échanges. Gardez les coordonnées de la personne responsable et le récapitulatif des conditions.',
        'À réception du décompte, comparez la période, la base et le taux avec les éléments convenus. Signalez une différence de façon précise : ligne concernée, montant attendu selon votre calcul et information manquante. Si un désaccord persiste, demandez conseil au professionnel ou à l’organisme compétent pour votre situation.',
        'Conservez le décompte et les explications reçues avec les documents du remplacement. Pour préparer votre prochaine mission, reprenez les questions qui ont été utiles et ajoutez celles que cette expérience a fait apparaître.',
      ], links: [{ label: 'Relire les modalités financières du contrat', url: '/guides/contrat-remplacement-medical-points-a-verifier' }] },
    ],
    faq: [
      { question: 'Quel est le bon taux de rétrocession en médecine générale ?', answer: 'Ce guide ne fixe pas de taux conseillé. Comparez la proposition complète : base de calcul, organisation, moyens disponibles et règlement. Aucun chiffre de marché vérifié n’est fourni ici.' },
      { question: 'Une rétrocession de 75 % signifie-t-elle 75 % de revenu net ?', answer: 'Non. Dans notre exemple, elle désigne la part reversée au remplaçant sur une base convenue, avant l’analyse de ses dépenses et de ses obligations personnelles.' },
      { question: 'Comment faire si certains encaissements arrivent après la mission ?', answer: 'Prévoyez avec le cabinet la manière de les suivre et de compléter le décompte. Identifiez un interlocuteur et une date de point, en cohérence avec les conditions écrites.' },
    ],
    related: ['contrat-remplacement-medical-points-a-verifier', 'choisir-remplacement-medecine-generale', 'annonce-remplacement-medical-cabinet'],
    cta: { label: 'Préparer mon profil remplaçant', href: '/register?type=candidate', text: 'Rassemblez vos critères et vos disponibilités pour vos prochaines recherches de remplacement.' },
  },
  {
    slug: 'accueillir-medecin-remplacant-cabinet',
    title: 'Accueillir un médecin remplaçant : préparer le cabinet et le premier jour',
    seoTitle: 'Accueillir un médecin remplaçant : checklist cabinet',
    shortTitle: 'Accueillir le remplaçant', topic: 'Vie du cabinet',
    description: 'Accès, logiciel, secrétariat et contacts : une checklist et une trame de brief pour accueillir un médecin remplaçant dans votre cabinet.',
    audience: 'Cabinets médicaux', published: '2026-09-08', updated: '2026-09-08', image: guideImages.accueil,
    intro: 'Le remplacement est convenu. Il reste à permettre au médecin de prendre ses repères dans votre cabinet : locaux, logiciel, secrétariat, contacts et organisation de la journée. Un brief d’accueil court, actualisé et partagé au bon moment rend ces informations faciles à retrouver. Voici une trame à adapter à votre fonctionnement.',
    takeaway: 'Préparez un seul brief pratique, daté, avec un interlocuteur identifié. Vérifiez les accès avant le premier jour et convenez dès le départ du point de fin de remplacement.',
    sections: [
      { id: 'avant', title: '1. Confirmer les informations avant l’arrivée', paragraphs: [
        'Quelques jours avant la prise de poste, relisez avec le remplaçant les dates, les horaires et le lieu convenus. Précisez l’heure d’arrivée souhaitée pour la découverte du cabinet et la personne qui l’accueillera. Si le titulaire est déjà absent, transmettez les coordonnées du relais prévu.',
        'Vérifiez séparément les documents professionnels, le contrat et les formalités correspondant à la situation du remplaçant. Le brief d’accueil décrit l’organisation pratique ; il ne remplace aucun de ces éléments.',
        'Faites un point avec le secrétariat et les professionnels concernés : qui connaît les dates ? Qui gère les questions d’agenda ? Qui prévient le remplaçant si une information change ? Une petite mise à jour partagée évite plusieurs versions contradictoires.',
      ], links: [{ label: 'Vérifier les points du contrat avant le remplacement', url: '/guides/contrat-remplacement-medical-points-a-verifier' }] },
      { id: 'logiciel', title: '2. Tester le logiciel et les accès utiles', paragraphs: [
        'Prévoyez la session et les droits adaptés au remplacement avec votre éditeur. L’Assurance Maladie précise que la télétransmission des feuilles de soins électroniques nécessite la carte CPS du remplaçant et une configuration préalable de la session dans le logiciel du médecin remplacé.',
        'Organisez un essai avant le début de la mission : ouverture de session, navigation dans le logiciel et fonctionnement de la facturation selon les procédures du cabinet. En cas de difficulté, identifiez le support à contacter et ses horaires. Un problème constaté en amont laisse plus de temps pour le résoudre.',
        'N’inscrivez pas de mots de passe personnels dans une annonce ou un brief largement partagé. Utilisez les procédures de votre cabinet et de votre éditeur pour remettre les accès nécessaires au bon destinataire.',
      ], sources: [ameli] },
      { id: 'tour', title: '3. Faire le tour des locaux et de l’organisation', paragraphs: [
        'Présentez les accès, le poste de travail, le rangement du matériel et les contacts pratiques. Demandez au remplaçant ce qu’il connaît déjà et ce qu’il souhaite revoir. La visite peut ainsi se concentrer sur les particularités du cabinet.',
        'Expliquez le fonctionnement habituel des rendez-vous, des appels et des visites. Précisez la présence du secrétariat et les relais possibles pendant les pauses ou en fin de journée. Le but est de rendre l’organisation compréhensible, pas de transmettre un document interminable que personne ne relira.',
      ], table: { caption: 'Les vérifications pratiques avant la première journée', headers: ['Sujet', 'À préparer', 'À vérifier ensemble'], rows: [
        ['Locaux', 'Adresse et modalités d’arrivée', 'Accès et interlocuteur d’accueil'],
        ['Poste de travail', 'Logiciel, matériel et assistance', 'Fonctionnement des accès autorisés'],
        ['Agenda', 'Créneaux et organisation des visites', 'Prise en compte des derniers changements'],
        ['Secrétariat', 'Horaires et coordonnées', 'Circuit des appels et questions pratiques'],
        ['Fin de mission', 'Moment et support du point de reprise', 'Personne qui reçoit les éléments à suivre'],
      ] } },
      { id: 'brief', title: '4. Préparer un brief que l’on retrouve facilement', paragraphs: [
        'Gardez une trame courte avec une date de mise à jour. Elle peut accompagner vos échanges administratifs, mais les informations cliniques et nominatives des patients doivent suivre les procédures et les outils du cabinet prévus pour la prise en charge.',
        'La trame ci-dessous est à compléter avec des informations pratiques. Ne la remplissez pas avec des mots de passe, des codes d’accès sensibles ou des dossiers patients. Indiquez plutôt à qui s’adresser pour obtenir les accès selon la procédure retenue.',
      ], template: 'Brief d’accueil du remplacement\nVersion du [date] — préparé par [interlocuteur]\n\nPériode et lieu : [dates, cabinet]\nArrivée : [heure et personne d’accueil]\nOrganisation : [consultations, visites, pauses]\nSecrétariat : [présence, coordonnées professionnelles]\nLogiciel : [nom, prise en main prévue, contact support]\nMatériel : [emplacements utiles et particularités]\nQuestion pratique : [interlocuteur et horaires]\nFin de mission : [moment du point et personne concernée]\nPoints encore à confirmer : [liste courte]' },
      { id: 'reprise', title: '5. Anticiper le point de reprise', paragraphs: [
        'Convenez du moment où le titulaire et le remplaçant feront le point. Pour l’organisation, distinguez les questions résolues, celles qui restent ouvertes et les actions attribuées à un interlocuteur. Pour les transmissions cliniques, utilisez les supports et les règles de votre cabinet.',
        'Prévoyez aussi la restitution du matériel et la gestion des accès à la fin de la période. Vérifiez les coordonnées de la personne chargée du décompte de rétrocession. Ces sujets sont plus simples à traiter lorsqu’ils ont un responsable identifié.',
        'Après le remplacement, demandez un retour sur le brief : quelle information manquait ? Quel accès aurait mérité un essai plus tôt ? Actualisez votre trame pour la prochaine fois en conservant uniquement les informations encore valables.',
      ], links: [{ label: 'Clarifier le décompte et le règlement de la rétrocession', url: '/guides/retrocession-remplacement-medecine-generale' }] },
    ],
    faq: [
      { question: 'Quand transmettre le brief au remplaçant ?', answer: 'Assez tôt pour permettre les questions et les essais nécessaires avant l’arrivée. Convenez d’un moment adapté à vos disponibilités et actualisez le document si l’organisation change.' },
      { question: 'Faut-il refaire tout le brief pour un remplacement régulier ?', answer: 'Vous pouvez réutiliser la trame, en vérifiant les dates, les contacts, les accès et les changements d’organisation. Une version datée aide chacun à retrouver la bonne information.' },
    ],
    related: ['annonce-remplacement-medical-cabinet', 'contrat-remplacement-medical-points-a-verifier', 'premier-remplacement-medical-checklist'],
    cta: { label: 'Créer mon espace cabinet', href: '/register?type=establishment', text: 'Préparez votre besoin et centralisez les échanges administratifs liés à vos remplacements dans MédiLink.' },
  },
];
