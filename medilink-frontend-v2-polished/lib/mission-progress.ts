import { formatDate } from './format';
import { currentDossierDocument, dossierDocumentIsCurrent, type DossierDocumentKind, type ReplacementDossierData } from './replacement-dossier';
import type { Application, MissionAgreement } from './types';

export type MissionStep = {
  key: string;
  label: string;
  helper: string;
  status: string;
  dateLabel?: string;
  nextAction: string;
  active: boolean;
  done: boolean;
};

// Milestones describe recorded actions, never regulatory approval or a bank transfer.
export function missionProgress(
  application: Application,
  agreement: MissionAgreement | null,
  dossier: ReplacementDossierData | null,
  dossierLoading = false,
  now = new Date(),
): MissionStep[] {
  const mission = application.mission;
  const startDate = agreement?.startDate || mission?.startDate;
  const endDate = agreement?.endDate || mission?.endDate;
  const start = startDate ? new Date(`${startDate.slice(0, 10)}T${agreement?.startTime || mission?.startTime || '00:00'}`) : null;
  const end = endDate ? new Date(`${endDate.slice(0, 10)}T${agreement?.endTime || mission?.endTime || '23:59'}`) : null;
  const started = Boolean(start && now >= start);
  const ended = Boolean(end && now > end);
  const confirmed = application.status === 'ACCEPTED'
    || ['PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(agreement?.status || '');
  const paymentReleased = Boolean(agreement?.status === 'PAYMENT_RELEASED' || agreement?.payment?.releasedAt);
  const completed = Boolean(agreement?.status === 'COMPLETED' || paymentReleased || agreement?.completedAt);
  const paymentSecured = Boolean(agreement?.status === 'FUNDS_SECURED' || completed || agreement?.payment?.securedAt);
  const isRetrocession = (agreement?.compensationMode || mission?.compensationMode) === 'RETROCESSION';

  function current(kind: DossierDocumentKind) {
    const document = dossier && currentDossierDocument(dossier, kind);
    return document && dossierDocumentIsCurrent(document, dossier!) ? document : null;
  }
  const contract = current('SIGNED_CONTRACT') || current('CONTRACT');
  const letter = current('DECLARATION');
  const prepared = Boolean(contract && letter && dossier?.missingFields.length === 0);
  const orderDeliveries = dossier?.deliveries.filter(delivery => delivery.recipientType === 'ORDER') || [];
  const sentDeliveries = orderDeliveries.filter(delivery => delivery.status === 'SENT');
  // Both current core documents must have an actual successful delivery to the Ordre.
  // Old revisions, failed attempts and deliveries to another recipient do not qualify.
  const sent = prepared && [contract!, letter!].every(document =>
    sentDeliveries.some(delivery => delivery.documentIds.includes(document.id)));
  const latestAttempt = [...orderDeliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const unknownStatus = dossierLoading ? 'Chargement…' : 'À consulter';
  const sending = !sent && latestAttempt?.status === 'SENDING';
  const failed = !sent && latestAttempt?.status === 'FAILED';

  const steps: MissionStep[] = [
    {
      key: 'confirmed', label: 'Mission confirmée',
      helper: confirmed ? 'Dates et conditions convenues ensemble.' : 'Échangez pour confirmer les conditions.',
      status: confirmed ? 'Confirmée' : 'À confirmer',
      nextAction: 'Confirmer les conditions ensemble.', done: confirmed, active: false,
    },
    {
      key: 'documents', label: 'Documents de mission',
      helper: !dossier ? 'Retrouvez les pièces dans le dossier partagé.'
        : sent ? 'Les documents ont été envoyés à l’Ordre.'
        : sending ? 'L’envoi des documents est en cours.'
        : failed ? 'Relancez l’envoi depuis votre dossier.'
        : sentDeliveries.length ? 'Certaines pièces actuelles restent à transmettre.'
        : prepared ? 'Le dossier est prêt à être transmis à l’Ordre.'
        : 'Préparez le dossier du remplacement.',
      status: !dossier ? unknownStatus : sent ? 'Transmis' : sending ? 'En cours' : failed ? 'À relancer' : sentDeliveries.length ? 'À compléter' : prepared ? 'À transmettre' : 'À préparer',
      nextAction: !dossier ? 'Consulter le dossier du remplacement.'
        : sending ? 'Suivre l’envoi dans le dossier.'
        : prepared ? 'Transmettre les documents à l’Ordre.' : 'Préparer le dossier du remplacement.',
      done: sent, active: false,
    },
    {
      key: 'replacement', label: 'Le remplacement',
      helper: completed ? 'Le remplacement est terminé.'
        : ended ? 'La période prévue est terminée.'
        : started ? 'Brief, contacts et échanges à portée de main.'
        : 'Retrouvez les informations avant le premier jour.',
      status: completed ? 'Terminé' : ended ? 'Période écoulée' : started ? 'En cours' : 'À venir',
      dateLabel: startDate && endDate ? `${formatDate(startDate)} — ${formatDate(endDate)}` : 'Dates à confirmer',
      nextAction: started ? 'Faire le point pendant la mission.' : 'Préparer le premier jour.',
      done: ended || completed, active: false,
    },
    {
      key: 'completed', label: 'Fin de mission',
      helper: completed ? 'La fin de mission a été validée.' : 'Un point ensemble pour clôturer la mission.',
      status: completed ? 'Validée' : ended ? 'À valider' : 'À venir',
      dateLabel: endDate ? formatDate(endDate) : 'Date à confirmer',
      nextAction: 'Valider la fin du remplacement.',
      done: completed, active: false,
    },
    {
      key: 'payment', label: isRetrocession ? 'Rétrocession' : 'Règlement',
      helper: isRetrocession
        ? paymentReleased ? 'La rétrocession déclarée a été validée.' : 'Décompte et règlement à suivre ensemble.'
        : paymentReleased ? 'Le paiement candidat est libéré.' : paymentSecured ? 'Paiement sécurisé, libéré après validation.' : 'Le paiement reste à confirmer.',
      status: isRetrocession ? paymentReleased ? 'Validée' : 'À suivre'
        : paymentReleased ? 'Libéré' : paymentSecured ? 'Sécurisé' : 'En attente',
      nextAction: isRetrocession ? 'Finaliser le décompte et la rétrocession.' : 'Finaliser le règlement.',
      done: paymentReleased, active: false,
    },
  ];
  const next = steps.find(step => !step.done);
  if (next) next.active = true;
  return steps;
}
