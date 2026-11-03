import PDFDocument = require('pdfkit');
import { DOSSIER_FONT_PATH } from './dossier-font';
import {
  DossierDetails,
  DOSSIER_TEMPLATE_VERSION,
  GeneratedDossierKind,
  getMissingDossierFields,
  DOSSIER_GENERATED_KINDS, dossierPeriods, dossierFeeTotals,
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
  if (!DOSSIER_GENERATED_KINDS.includes(kind)) throw new Error('Type de document inconnu');
  const missing = getMissingDossierFields(details, kind);
  if (missing.length) throw new Error(`Dossier incomplet : ${missing.join(' ; ')}`);
  if (!Number.isInteger(metadata.version) || metadata.version < 1 || Number.isNaN(metadata.generatedAt.getTime())) {
    throw new Error('Métadonnées du document invalides');
  }
  const d = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, typeof value === 'string' ? clean(value) : value])) as unknown as DossierDetails;
  const student = d.replacementKind === 'STUDENT';
  const compact = kind === 'DECLARATION';
  const title = kind === 'CONTRACT' ? 'Contrat de remplacement' : kind === 'FEE_STATEMENT' ? 'Journal des recettes' : student ? 'Demande d’autorisation' : 'Déclaration de remplacement';
  const subtitle = kind === 'CONTRACT'
    ? `Exercice libéral individuel - ${student ? 'étudiant en médecine' : 'médecin inscrit à l’Ordre'}`
    : kind === 'FEE_STATEMENT' ? 'Récapitulatif du remplacement et décompte de rétrocession'
      : student ? 'Déclaration de remplacement en exercice libéral par un étudiant' : 'Information préalable du conseil départemental';
  const doc = new PDFDocument({
    size: 'A4', margins: { top: 80, bottom: 80, left: MARGIN, right: MARGIN },
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
    const size = small ? compact ? 8 : 8.5 : compact ? 9 : BODY_SIZE;
    doc.font('DossierSans').fontSize(size).fillColor(small ? MUTED : INK);
    const options = { width, lineGap: compact ? 1.5 : 2.3, paragraphGap: 0 };
    // Bound long user paragraphs before drawing. PDFKit's automatic continuation
    // can otherwise put the final glyph descent into the reserved footer area.
    const blocks: string[] = [];
    for (const line of text.split('\n')) {
      let block = '';
      const tokens = line.match(/\S+|\s+/g) || [' '];
      for (const token of tokens) {
        const characters = Array.from(token);
        for (let offset = 0; offset < characters.length; offset += 100) {
          const part = characters.slice(offset, offset + 100).join('');
          if (block && doc.heightOfString(block + part, options) > 150) { blocks.push(block.trimEnd()); block = part.trimStart(); }
          else block += part;
        }
      }
      if (block) blocks.push(block);
    }
    for (const block of blocks) {
      space(doc.heightOfString(block, options) + 10);
      doc.font('DossierSans').fontSize(size).fillColor(small ? MUTED : INK).text(block, MARGIN, doc.y, options);
    }
    doc.y += compact ? 4 : 7;
  };
  const section = (heading: string, paragraphs: string[]) => {
    doc.font('DossierSans').fontSize(compact ? 9 : BODY_SIZE);
    space(35 + Math.min(doc.heightOfString(paragraphs[0] ?? '', { width, lineGap: compact ? 1.5 : 2.3 }), 150));
    doc.font('Helvetica-Bold').fontSize(compact ? 10 : 11).fillColor(BLUE).text(heading, MARGIN, doc.y, { width, lineGap: 2 });
    doc.y += compact ? 4 : 6;
    paragraphs.forEach((text) => p(text));
    doc.y += compact ? 2 : 3;
  };
  const signatures = (both: boolean) => {
    const colWidth = both ? (width - 24) / 2 : width;
    doc.font('DossierSans').fontSize(9);
    const nameHeight = Math.max(doc.heightOfString(d.holderName, { width: colWidth - 24 }), both ? doc.heightOfString(d.replacementName, { width: colWidth - 24 }) : 0);
    const boxHeight = Math.max(compact ? 70 : 95, nameHeight + (compact ? 50 : 70));
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
  doc.font('Helvetica-Bold').fontSize(compact ? 20 : 23).fillColor(BLUE).text(title, MARGIN, doc.y, { width, lineGap: 3 });
  doc.y += 7;
  p(subtitle);
  p(`Préparé le ${date(metadata.generatedAt.toISOString().slice(0, 10))} - version ${metadata.version}`, true);
  p(kind === 'FEE_STATEMENT' ? 'Montants déclarés par les parties, à rapprocher des justificatifs du cabinet. Ce récapitulatif ne constitue pas une preuve de paiement.' : compact ? 'Document prérempli à relire et signer. Les informations sont déclarées par les parties.' : 'Document prérempli à relire et adapter avant signature. Les informations sont déclarées par les parties ; MédiLink ne certifie ni leur exactitude ni la validité juridique du dossier.', true);

  const holder = `${d.holderName}, médecin remplacé${d.holderRpps ? `, RPPS ${d.holderRpps}` : ''}${d.holderOrderNumber ? `, inscription ordinale ${d.holderOrderNumber}` : ''}.\nAdresse : ${d.holderAddress}${d.holderSiret ? `\nSIRET : ${d.holderSiret}` : ''}${!compact && d.holderEmail ? `\nCourriel : ${d.holderEmail}` : ''}`;
  const replacement = kind === 'FEE_STATEMENT' ? `${d.replacementName}, remplaçant${d.replacementRpps ? `, RPPS ${d.replacementRpps}` : ''}${d.replacementSiret ? `, SIRET ${d.replacementSiret}` : ''}.` : (student
    ? `${d.replacementName}, étudiant en médecine, licence de remplacement n° ${d.licenseNumber}, valable jusqu’au ${date(d.licenseValidUntil)}.${d.replacementRpps ? ` RPPS : ${d.replacementRpps}.` : ''}\nAdresse : ${d.replacementAddress}${d.replacementEmail ? `\nCourriel : ${d.replacementEmail}` : ''}`
    : `${d.replacementName}, médecin remplaçant, RPPS ${d.replacementRpps}, inscription ordinale ${d.replacementOrderNumber}.\nAdresse : ${d.replacementAddress}${d.replacementEmail ? `\nCourriel : ${d.replacementEmail}` : ''}`) + (d.replacementSiret ? `\nSIRET : ${d.replacementSiret}` : '');
  const periods = [...dossierPeriods(d)].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const period = periods.map((item, index) => {
    const days = Math.round((Date.parse(`${item.endDate}T00:00:00Z`) - Date.parse(`${item.startDate}T00:00:00Z`)) / 86_400_000) + 1;
    return `${periods.length > 1 ? `Période ${index + 1} : d` : 'D'}u ${date(item.startDate)} au ${date(item.endDate)} inclus, soit ${days} jour${days > 1 ? 's' : ''} calendaires.`;
  }).join('\n');

  if (kind === 'CONTRACT') {
    section('Les parties', [holder, replacement]);
    section('Préambule', [
      `Les parties conviennent d’un remplacement temporaire et personnel en ${d.specialty}, au cabinet situé ${d.practiceAddress}. Le remplaçant assure les soins des patients qui sollicitent le cabinet pendant la période convenue. Le présent accord concerne exclusivement l’exercice libéral individuel du médecin remplacé.`,
      student
        ? 'L’exécution du remplacement est subordonnée aux conditions légales applicables à l’étudiant et à l’autorisation du conseil départemental compétent. La licence de remplacement ne remplace pas cette autorisation. La demande est limitée à trois mois au plus ; tout renouvellement est distinct.'
        : 'Avant le début du remplacement, les parties vérifient l’inscription du remplaçant au tableau de l’Ordre, sa qualification dans la spécialité et l’absence de restriction incompatible avec les actes prévus.',
    ]);
    section('Article 1 - Soins et indépendance professionnelle', [
      'Le remplaçant exerce sous sa propre responsabilité, en toute indépendance, dans le respect de la déontologie, du libre choix du patient et du secret professionnel. Les patients sont informés de sa qualité de remplaçant. Les parties organisent la permanence et la continuité des soins.',
    ]);
    section('Article 2 - Périodes du remplacement', [
      `${period}\nJours et horaires convenus : ${d.scheduleDetails}`,
      'Le médecin remplacé cesse toute activité médicale pendant les périodes du remplacement, sauf dérogation accordée par le conseil départemental compétent dans les conditions de l’article R. 4127-65 du code de la santé publique. Tout renouvellement fait l’objet d’un accord écrit et des formalités ordinales applicables.',
    ]);
    section('Article 3 - Locaux, matériel et secrétariat', [
      `Le médecin remplacé met à disposition les locaux et moyens nécessaires à l’activité convenue, dans un état permettant la sécurité des soins. Moyens convenus : ${d.practiceResources?.replace(/[.!?]+$/, '') || 'locaux professionnels, installations et matériel nécessaires au remplacement'}. Il présente le fonctionnement du cabinet et organise un accès aux informations médicales strictement nécessaires. Le remplaçant préserve les équipements, leur destination et la confidentialité des dossiers.`,
    ]);
    section('Article 4 - Responsabilité et assurance', [
      'Le remplaçant assume la responsabilité de son exercice et remet avant son activité une attestation de responsabilité civile professionnelle couvrant la spécialité, les actes et toutes les périodes du remplacement. Le présent contrat ne vaut pas attestation d’assurance.',
    ]);
    section('Article 5 - Identification et facturation', [
      'Le remplaçant utilise les ordonnances, feuilles de soins et moyens de facturation conformément aux règles applicables, en indiquant son identité et sa qualité de remplaçant ainsi que le médecin remplacé. Les identifiants personnels ne sont pas partagés.',
    ]);
    section('Article 6 - Obligations fiscales et sociales', [
      'Chacune des parties assume ses propres obligations d’assurance, d’affiliation, de déclaration et de paiement des cotisations sociales et impôts afférents à son activité. Le présent contrat ne vaut pas preuve d’affiliation.',
    ]);
    section('Article 7 - Honoraires, rétrocession et continuité des soins', [
      `Le médecin remplacé rétrocède au remplaçant ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 20 }).format(d.retrocessionPercent!)} % des honoraires correspondant aux actes réalisés par le remplaçant, perçus ou restant à percevoir. Les parties rapprochent les encaissements et les actes afin de permettre le règlement des sommes dues et la régularisation des paiements reçus ultérieurement.`,
      `Délai et modalités de règlement convenus : ${d.paymentTerms}`,
      'Les rémunérations d’astreinte liées à une participation à la permanence des soins reviennent au professionnel qui a assuré la garde. Les parties conservent les justificatifs nécessaires à leurs obligations comptables.',
      'À la fin du remplacement, le remplaçant met fin à l’activité effectuée à ce titre et transmet les informations utiles à la poursuite des soins, conformément à l’article R. 4127-66. Chaque partie protège les données auxquelles elle a accès.',
    ]);
    section('Article 8 - Non-réinstallation', [
      'Aucune clause de non-réinstallation n’est stipulée dans ce contrat. Si les parties souhaitent en convenir, elles établissent un avenant adapté à leur situation, dans le respect de l’article R. 4127-86 du code de la santé publique, et le communiquent au conseil départemental.',
    ]);
    section('Article 9 - Conciliation', [
      'Les parties sollicitent une conciliation auprès du conseil départemental en cas de différend relatif au remplacement, conformément aux obligations déontologiques.',
    ]);
    section('Article 10 - Fin de l’accord et recours', [
      'Le contrat prend fin à la date prévue. En cas d’empêchement ou de cessation anticipée convenue, les parties se préviennent sans délai, organisent la continuité des soins et informent le conseil départemental si nécessaire. Les sommes dues pour les actes réalisés restent à régler. En l’absence d’accord après conciliation, chaque partie peut saisir la juridiction compétente. Aucune convention d’arbitrage n’est prévue par ce gabarit.',
    ]);
    section('Article 11 - Déclaration sur l’honneur', [
      'En signant, chaque partie atteste sur l’honneur qu’aucun accord distinct (contre-lettre ou avenant) relatif à ce contrat n’a été conclu sans être communiqué au conseil départemental compétent.',
    ]);
    section('Article 12 - Communication à l’Ordre et exemplaires', [
      `Le médecin remplacé effectue l’information préalable du conseil départemental compétent. Conseil destinataire renseigné : ${d.orderCouncilName}. Les parties vérifient sa compétence et le circuit de transmission.`,
      student
        ? 'Avant le début du remplacement, le médecin remplacé communique le contrat au conseil départemental au tableau duquel il est inscrit ; l’étudiant le transmet également au conseil départemental auprès duquel il est enregistré, selon ses modalités. Les avenants sont communiqués aux conseils concernés.'
        : 'Chaque médecin signataire communique le contrat et ses avenants au conseil départemental au tableau duquel il est inscrit, y compris dans des départements différents. Cette communication intervient dans le mois suivant leur conclusion et, pour le contrat initial, avant le début du remplacement.',
      `Les parties relisent et signent le contrat, vérifient ${student ? 'la licence, l’autorisation ordinale lorsqu’elle a été délivrée' : 'l’attestation d’inscription au tableau'}, la RCP et les pièces complémentaires demandées. Chacune conserve un exemplaire signé ; les exemplaires nécessaires sont transmis aux conseils concernés. Une copie complète signée peut être importée au dossier partagé. Le fichier généré ne contient aucune signature électronique.`,
    ]);
    signatures(true);
  } else if (kind === 'DECLARATION') {
    p(`À l’attention de ${d.orderCouncilName}${d.orderEmail ? ` - ${d.orderEmail}` : ''}`);
    section('Médecin remplacé', [holder]);
    section(student ? 'Étudiant remplaçant proposé' : 'Médecin remplaçant', [replacement]);
    p(student
      ? 'Je demande l’autorisation de me faire remplacer par l’étudiant désigné ci-dessus, dans le cadre de mon exercice libéral individuel, pour les périodes suivantes (articles L. 4131-2 et D. 4131-2 du code de la santé publique).'
      : 'Je vous informe préalablement de mon remplacement temporaire et personnel par le médecin désigné ci-dessus, pour les périodes suivantes (article R. 4127-65 du code de la santé publique).');
    section('Périodes et lieu du remplacement', [period, `Spécialité : ${d.specialty}. Lieu : ${d.practiceAddress}.${d.scheduleDetails ? `\nOrganisation : ${d.scheduleDetails}` : ''}`]);
    p('Je cesserai toute activité médicale pendant les périodes du remplacement, sauf dérogation accordée par le conseil départemental compétent. Je vous informerai des modifications apportées aux conditions déclarées.');
    section('Pièces à joindre et vérifier avant l’envoi', [
      `Contrat signé par les deux parties ; ${student ? 'licence de remplacement en cours de validité' : 'attestation d’inscription au tableau'} ; attestation de RCP ; pièces complémentaires demandées. Cette liste ne certifie pas la présence des pièces dans un envoi.`,
    ]);
    if (student) p('Cette demande et son envoi ne valent pas autorisation de remplacement. La décision du Conseil doit être recueillie et conservée au dossier.', true);
    signatures(false);
  } else {
    const euro = (cents: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
    p(`${d.holderName} - ${d.replacementName}\nCabinet : ${d.practiceAddress}`);
    if (d.holderSiret || d.replacementSiret) p(`SIRET médecin remplacé : ${d.holderSiret || 'non renseigné'} ; remplaçant : ${d.replacementSiret || 'non renseigné'}`, true);
    p(period);
    p('Une ligne reprend des actes ou un regroupement par journée et mode de paiement. Aucun nom ni identifiant de patient n’est enregistré dans ce récapitulatif.', true);
    const columns = [68, 31, 66, 52, 65, 65, 67, width - 414];
    const tableRow = (values: string[], header = false) => {
      const y = doc.y;
      const height = header ? 30 : 26;
      let x = MARGIN;
      if (header) doc.rect(MARGIN, y, width, height).fill('#EEF3F8');
      values.forEach((value, index) => {
        doc.font(header ? 'Helvetica-Bold' : 'DossierSans').fontSize(header ? 7.3 : 7.7).fillColor(INK)
          .text(value, x + 4, y + 7, { width: columns[index] - 8, align: index > 0 && index < 7 ? 'right' : 'left', lineBreak: false });
        x += columns[index];
      });
      doc.moveTo(MARGIN, y + height).lineTo(MARGIN + width, y + height).strokeColor(RULE).lineWidth(0.5).stroke();
      doc.x = MARGIN; doc.y = y + height;
    };
    const headers = ['Date', 'Actes', 'Honoraires', 'Suppl.', 'Patient', 'NOEMIE / tiers', 'Solde', 'Mode patient'];
    space(60); tableRow(headers, true);
    const methods = { CARD: 'C.B.', CASH: 'Espèces', CHEQUE: 'Chèque', TRANSFER: 'Virement', OTHER: 'Autre / attente' };
    for (const entry of [...d.feeEntries!].sort((a, b) => a.date.localeCompare(b.date))) {
      if (doc.y + 26 > bottom()) { doc.addPage(); tableRow(headers, true); }
      tableRow([entry.date.split('-').reverse().join('/'), String(entry.actCount), euro(entry.feesCents), euro(entry.supplementsCents),
        euro(entry.patientReceiptsCents), euro(entry.thirdPartyReceiptsCents), euro(entry.feesCents + entry.supplementsCents - entry.patientReceiptsCents - entry.thirdPartyReceiptsCents), methods[entry.paymentMethod]]);
    }
    doc.y += 14;
    const totals = dossierFeeTotals(d);
    section('Totaux du journal', [
      `${totals.actCount} actes - honoraires : ${euro(totals.feesCents)} € - suppléments : ${euro(totals.supplementsCents)} €.`,
      `Total honoraires et suppléments : ${euro(totals.totalCents)} €.\nEncaissements patients : ${euro(totals.patientReceiptsCents)} € ; NOEMIE / tiers : ${euro(totals.thirdPartyReceiptsCents)} €.\nTotal encaissé : ${euro(totals.receivedCents)} € ; solde à percevoir : ${euro(totals.outstandingCents)} €.`,
    ]);
    section('Décompte de rétrocession', [
      `Part convenue pour le remplaçant : ${new Intl.NumberFormat('fr-FR').format(d.retrocessionPercent!)} % des honoraires et suppléments déclarés, perçus ou restant à percevoir.\nMontant correspondant : ${euro(totals.retrocessionCents)} €.`,
      'Les parties rapprochent ces montants des actes, encaissements et justificatifs du cabinet. Le total encaissé par le cabinet et la rétrocession réglée au remplaçant sont deux montants distincts. Ce document ne certifie aucun virement ni règlement effectif.',
    ]);
  }
  if (kind !== 'FEE_STATEMENT') p(compact
    ? `Gabarit MédiLink ${DOSSIER_TEMPLATE_VERSION}. Document préparatoire, sans validation automatique de l’Ordre.`
    : `Gabarit MédiLink ${DOSSIER_TEMPLATE_VERSION}. Références : code de la santé publique, articles R. 4127-65, R. 4127-66, R. 4127-86, R. 4127-91, L. 4113-9 et L. 1142-2${student ? ', L. 4131-2 et D. 4131-2' : ''}. Sources vérifiées le 3 novembre 2026. Ce document ne constitue pas un modèle homologué par l’Ordre.`, true);

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
