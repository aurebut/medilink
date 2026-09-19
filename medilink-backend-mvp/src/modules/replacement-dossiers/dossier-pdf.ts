import PDFDocument = require('pdfkit');
import { DOSSIER_FONT_PATH } from './dossier-font';
import {
  DossierDetails,
  DOSSIER_TEMPLATE_VERSION,
  GeneratedDossierKind,
  getMissingDossierFields,
} from './dossier-types';

export { getMissingDossierFields, DOSSIER_TEMPLATE_VERSION } from './dossier-types';
export const templateVersion = DOSSIER_TEMPLATE_VERSION;

const BLUE = '#183E6F';
const INK = '#25364B';
const MUTED = '#617184';
const RULE = '#DCE5EE';
const MARGIN = 48;
const BODY_SIZE = 10;

function date(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

function clean(value: string) {
  return value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u202F/g, ' ').trim();
}

/**
 * Produces an unsigned document. It never certifies registration, insurance,
 * student eligibility, an authorisation, a signature or successful transmission.
 */
export async function generateDossierPdf(
  kind: GeneratedDossierKind,
  details: DossierDetails,
  metadata: { version: number; generatedAt: Date },
): Promise<Buffer> {
  if (kind !== 'CONTRACT' && kind !== 'DECLARATION') throw new Error('Type de document inconnu');
  const missing = getMissingDossierFields(details, kind);
  if (missing.length) throw new Error(`Dossier incomplet : ${missing.join(' ; ')}`);
  if (!Number.isInteger(metadata.version) || metadata.version < 1 || Number.isNaN(metadata.generatedAt.getTime())) {
    throw new Error('Métadonnées du document invalides');
  }
  const d = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, typeof value === 'string' ? clean(value) : value])) as unknown as DossierDetails;
  const student = d.replacementKind === 'STUDENT';
  const title = kind === 'CONTRACT' ? 'Contrat de remplacement' : student ? 'Demande d’autorisation' : 'Déclaration de remplacement';
  const subtitle = kind === 'CONTRACT'
    ? `Exercice libéral individuel - ${student ? 'étudiant en médecine' : 'médecin inscrit à l’Ordre'}`
    : student ? 'Remplacement par un étudiant en médecine' : 'Information préalable du conseil départemental';
  const doc = new PDFDocument({
    size: 'A4', margins: { top: 80, bottom: 74, left: MARGIN, right: MARGIN },
    bufferPages: true, autoFirstPage: false,
    info: { Title: title, Author: 'MédiLink', Subject: `${DOSSIER_TEMPLATE_VERSION} - version ${metadata.version}`, CreationDate: metadata.generatedAt },
  });
  const chunks: Buffer[] = [];
  doc.registerFont('DossierSans', DOSSIER_FONT_PATH);
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const width = 595.28 - MARGIN * 2;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const space = (height: number) => {
    if (doc.y + height > bottom()) doc.addPage();
  };
  doc.on('pageAdded', () => {
    doc.font('Helvetica-Bold').fontSize(12).fillColor(BLUE).text('MédiLink', MARGIN, 31, { lineBreak: false });
    doc.font('DossierSans').fontSize(8).fillColor(MUTED).text(title, MARGIN + 100, 34, { width: width - 100, align: 'right', lineBreak: false });
    doc.moveTo(MARGIN, 56).lineTo(MARGIN + width, 56).strokeColor(RULE).lineWidth(0.6).stroke();
    doc.x = MARGIN;
    doc.y = 80;
    doc.font('DossierSans').fontSize(BODY_SIZE).fillColor(INK);
  });
  const p = (text: string, small = false) => {
    doc.font('DossierSans').fontSize(small ? 9 : BODY_SIZE).fillColor(small ? MUTED : INK);
    const options = { width, lineGap: 3, paragraphGap: 0 };
    const height = doc.heightOfString(text, options);
    // Keep ordinary paragraphs together; very long user text can flow across pages.
    space(Math.min(height + 7, 180));
    doc.text(text, MARGIN, doc.y, options);
    doc.y += 8;
  };
  const section = (heading: string, paragraphs: string[]) => {
    doc.font('DossierSans').fontSize(BODY_SIZE);
    space(28 + Math.min(doc.heightOfString(paragraphs[0] ?? '', { width, lineGap: 3 }), 55));
    doc.font('Helvetica-Bold').fontSize(12).fillColor(BLUE).text(heading, MARGIN, doc.y, { width, lineGap: 2 });
    doc.y += 7;
    paragraphs.forEach((text) => p(text));
    doc.y += 4;
  };
  const signatures = (both: boolean) => {
    const colWidth = both ? (width - 24) / 2 : width;
    doc.font('DossierSans').fontSize(9);
    const nameHeight = Math.max(doc.heightOfString(d.holderName, { width: colWidth - 24 }), both ? doc.heightOfString(d.replacementName, { width: colWidth - 24 }) : 0);
    const boxHeight = Math.max(110, nameHeight + 90);
    space(boxHeight + 55);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(BLUE).text(both ? 'Signatures des parties' : 'Signature du médecin remplacé', MARGIN, doc.y, { width });
    doc.y += 9;
    p('Fait à : ..............................................................     Le : ..................................', true);
    const y = doc.y;
    const box = (x: number, label: string, name: string) => {
      doc.roundedRect(x, y, colWidth, boxHeight, 5).strokeColor(RULE).lineWidth(0.7).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BLUE).text(label, x + 12, y + 12, { width: colWidth - 24 });
      doc.font('DossierSans').fontSize(9).fillColor(INK).text(name, x + 12, y + 30, { width: colWidth - 24 });
      doc.font('DossierSans').fontSize(8).fillColor(MUTED).text('Signature manuscrite', x + 12, y + boxHeight - 20, { width: colWidth - 24 });
    };
    box(MARGIN, 'Médecin remplacé', d.holderName);
    if (both) box(MARGIN + colWidth + 24, 'Remplaçant', d.replacementName);
    doc.x = MARGIN;
    doc.y = y + boxHeight + 14;
  };
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(25).fillColor(BLUE).text(title, MARGIN, doc.y, { width, lineGap: 3 });
  doc.y += 7;
  p(subtitle);
  p(`Préparé le ${date(metadata.generatedAt.toISOString().slice(0, 10))} - version ${metadata.version}`, true);
  p('Document prérempli à relire et adapter avant signature. Les informations sont déclarées par les parties ; MédiLink ne certifie ni leur exactitude ni la validité juridique du dossier.', true);

  const holder = `${d.holderName}, médecin remplacé, RPPS ${d.holderRpps}, inscription ordinale ${d.holderOrderNumber}.\nAdresse : ${d.holderAddress}${d.holderEmail ? `\nCourriel : ${d.holderEmail}` : ''}`;
  const replacement = student
    ? `${d.replacementName}, étudiant en médecine, licence de remplacement n° ${d.licenseNumber}, valable jusqu’au ${date(d.licenseValidUntil)}.${d.replacementRpps ? ` RPPS : ${d.replacementRpps}.` : ''}\nAdresse : ${d.replacementAddress}${d.replacementEmail ? `\nCourriel : ${d.replacementEmail}` : ''}`
    : `${d.replacementName}, médecin remplaçant, RPPS ${d.replacementRpps}, inscription ordinale ${d.replacementOrderNumber}.\nAdresse : ${d.replacementAddress}${d.replacementEmail ? `\nCourriel : ${d.replacementEmail}` : ''}`;
  const duration = Math.round((Date.parse(`${d.endDate}T00:00:00Z`) - Date.parse(`${d.startDate}T00:00:00Z`)) / 86_400_000) + 1;
  const period = `Du ${date(d.startDate)} au ${date(d.endDate)} inclus, soit une période de ${duration} jour${duration > 1 ? 's' : ''} calendaires.`;

  if (kind === 'CONTRACT') {
    section('Les parties', [holder, replacement]);
    section('1. Objet et période du remplacement', [
      `Les parties conviennent d’un remplacement temporaire et personnel en ${d.specialty}, au cabinet situé ${d.practiceAddress}. Le remplaçant assure les soins des patients qui sollicitent le cabinet pendant la période convenue. Le présent accord concerne exclusivement l’exercice libéral individuel du médecin remplacé.`,
      `${period}\nJours et horaires convenus : ${d.scheduleDetails}`,
      'Le médecin remplacé cesse toute activité médicale pendant les périodes du remplacement, sauf dérogation accordée par le conseil départemental compétent dans les conditions de l’article R. 4127-65 du code de la santé publique. Tout renouvellement fait l’objet d’un accord écrit et des formalités ordinales applicables.',
    ]);
    section('2. Conditions préalables et information de l’Ordre', [
      student
        ? 'L’exécution du remplacement est subordonnée à la réunion des conditions légales applicables à l’étudiant et à l’autorisation de remplacement relevant du conseil départemental compétent. La licence justifie le niveau de formation ; elle ne remplace pas cette autorisation. La demande, pour une période de trois mois au plus, et son éventuel renouvellement doivent être traités distinctement.'
        : 'Avant le début du remplacement, les parties vérifient l’inscription du remplaçant au tableau de l’Ordre, sa qualification pour la spécialité concernée et l’absence de restriction incompatible avec les actes prévus. L’attestation d’inscription est jointe au dossier.',
      `Le médecin remplacé effectue l’information préalable du conseil départemental compétent et lui communique le contrat signé ainsi que les pièces requises. Conseil destinataire renseigné : ${d.orderCouncilName}. Les parties vérifient sa compétence et le circuit de transmission, notamment si le lieu d’activité relève d’un autre département. Tout avenant ou accord relatif au remplacement est également communiqué à l’Ordre.`,
    ]);
    section('3. Exercice, moyens et continuité des soins', [
      'Le remplaçant conserve son indépendance professionnelle et exerce sous sa propre responsabilité, dans le respect de la déontologie, du libre choix du patient et du secret professionnel. Les patients sont informés de sa qualité de remplaçant. Les obligations de permanence et de continuité des soins sont organisées entre les parties.',
      'Le médecin remplacé met à disposition les locaux et moyens nécessaires à l’activité convenue, dans un état permettant la sécurité des soins. Il présente le fonctionnement du cabinet et organise un accès aux informations médicales strictement nécessaires. Le remplaçant préserve les équipements et la confidentialité des dossiers. Les moyens d’identification et de facturation sont utilisés conformément aux règles applicables ; les identifiants personnels ne sont pas partagés.',
      'À la fin du remplacement, le remplaçant met fin à l’activité effectuée à ce titre et transmet les informations utiles à la poursuite des soins. Chaque partie veille à la protection des données auxquelles elle a accès.',
    ]);
    section('4. Assurance et obligations personnelles', [
      'Le remplaçant remet avant son activité une attestation de responsabilité civile professionnelle couvrant la spécialité, les actes et toute la période de remplacement. Chacune des parties assume ses propres obligations d’assurance, d’affiliation, de déclaration et de paiement des cotisations sociales et impôts afférents à son activité. Le présent contrat ne vaut ni attestation d’assurance ni preuve d’affiliation.',
    ]);
    section('5. Honoraires et règlement', [
      `Le médecin remplacé rétrocède au remplaçant ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 20 }).format(d.retrocessionPercent!)} % des honoraires correspondant aux actes réalisés par le remplaçant, perçus ou restant à percevoir. Les parties rapprochent les encaissements et les actes afin de permettre le règlement des sommes dues et la régularisation des paiements reçus ultérieurement.`,
      `Délai et modalités de règlement convenus : ${d.paymentTerms}`,
      'Les rémunérations d’astreinte liées à une participation à la permanence des soins reviennent au professionnel qui a assuré la garde. Les parties conservent les justificatifs nécessaires à leurs obligations comptables.',
    ]);
    section('6. Fin de l’accord et règlement des différends', [
      'Le contrat prend fin à la date prévue. En cas d’empêchement, de cessation anticipée convenue ou d’événement compromettant son exécution, les parties se préviennent sans délai, organisent la continuité des soins et informent le conseil départemental lorsque cela est nécessaire. Les sommes dues au titre des actes déjà réalisés restent à régler.',
      'Aucune clause de non-réinstallation n’est stipulée dans ce contrat. Si les parties souhaitent en convenir, elles établissent un avenant adapté à leur situation, dans le respect de l’article R. 4127-86 du code de la santé publique, et le communiquent au conseil départemental.',
      'Les parties sollicitent une conciliation auprès du conseil départemental en cas de différend relatif au remplacement, conformément aux obligations déontologiques. En l’absence d’accord, elles conservent la possibilité de saisir la juridiction compétente. Aucune convention d’arbitrage n’est prévue par ce gabarit.',
    ]);
    section('7. Lecture, pièces et signature', [
      `Les parties relisent l’ensemble du contrat et les données saisies avant de le signer. Elles vérifient le dossier joint : contrat signé, ${student ? 'licence de remplacement, autorisation ordinale lorsqu’elle a été délivrée' : 'attestation d’inscription au tableau de l’Ordre'}, attestation de RCP et toute pièce complémentaire demandée par le conseil compétent.`,
      'Chaque partie conserve un exemplaire signé ; un exemplaire est destiné à l’Ordre. Le fichier généré ne contient aucune signature électronique. Après signature manuscrite, une copie complète peut être importée dans le dossier partagé.',
    ]);
    signatures(true);
  } else {
    section('Destinataire', [
      d.orderCouncilName + (d.orderEmail ? `\nCourriel renseigné : ${d.orderEmail}` : ''),
    ]);
    section('Médecin demandeur', [holder]);
    section(student ? 'Remplaçant proposé' : 'Médecin remplaçant', [replacement]);
    section('Remplacement concerné', [
      `Spécialité : ${d.specialty}\nLieu d’exercice : ${d.practiceAddress}\n${period}${d.scheduleDetails ? `\nOrganisation prévue : ${d.scheduleDetails}` : ''}`,
    ]);
    p('Madame, Monsieur,');
    p(student
      ? 'Je sollicite l’autorisation de me faire remplacer par l’étudiant désigné ci-dessus, pour la période indiquée, dans le cadre de mon exercice libéral individuel. Cette demande est présentée au titre des articles L. 4131-2 et D. 4131-2 du code de la santé publique. Je vous remercie de m’adresser votre décision et de m’indiquer toute pièce complémentaire nécessaire à son instruction.'
      : 'Je vous informe préalablement de mon remplacement temporaire et personnel dans les conditions indiquées ci-dessus, conformément à l’article R. 4127-65 du code de la santé publique. Je vous remercie de m’indiquer toute observation ou pièce complémentaire nécessaire à l’examen du dossier.');
    p('Je cesserai toute activité médicale pendant les périodes du remplacement, sauf dérogation accordée par le conseil départemental compétent. Je vous informerai des modifications apportées aux conditions déclarées.');
    section('Pièces à joindre et vérifier avant l’envoi', [
      `Contrat de remplacement signé par les deux parties ; ${student ? 'copie de la licence de remplacement en cours de validité' : 'attestation d’inscription du remplaçant au tableau de l’Ordre'} ; attestation de RCP couvrant le remplacement ; pièces complémentaires requises par votre conseil. Cette liste décrit les pièces à réunir et ne certifie pas leur présence dans un envoi.`,
    ]);
    if (student) p('Cette demande et son envoi ne valent pas autorisation de remplacement. La décision ordinale doit être recueillie selon le circuit du conseil compétent et conservée au dossier.', true);
    p('Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations respectueuses.');
    signatures(false);
  }
  space(60);
  p(`Gabarit MédiLink ${DOSSIER_TEMPLATE_VERSION}. Références : code de la santé publique, articles R. 4127-65, R. 4127-66, R. 4127-86, R. 4127-91 et L. 1142-2${student ? ', L. 4131-2 et D. 4131-2' : ''}. Sources vérifiées le 19 septembre 2026. Ce document ne constitue pas un modèle homologué par l’Ordre.`, true);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Footer sits outside the body. A bounded text box below the body margin
    // otherwise asks PDFKit to create a new page, even with lineBreak:false.
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 47;
    doc.moveTo(MARGIN, y - 9).lineTo(MARGIN + width, y - 9).strokeColor(RULE).lineWidth(0.6).stroke();
    doc.font('DossierSans').fontSize(7.5).fillColor(MUTED)
      .text(`MédiLink - ${DOSSIER_TEMPLATE_VERSION} - v${metadata.version}`, MARGIN, y, { lineBreak: false });
    doc.text(`${i - range.start + 1} / ${range.count}`, MARGIN + width - 45, y, { width: 45, align: 'right', lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }
  doc.end();
  return complete;
}
