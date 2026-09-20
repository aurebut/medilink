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
  const latestSent = [...sentDeliveries].filter(delivery =>
    delivery.documentIds.some(id => id === contract?.id || id === letter?.id))
    .sort((a, b) => (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt))[0];
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
      key: 'documents', label: 'Dossier de remplacement',
      helper: prepared ? 'Contrat et courrier à l’Ordre préparés.' : 'Réunissez le contrat et le courrier à l’Ordre.',
      status: !dossier ? unknownStatus : prepared ? 'Préparé' : 'À préparer',
      nextAction: dossier ? 'Préparer le dossier du remplacement.' : 'Consulter le dossier du remplacement.',
      done: prepared, active: false,
    },
    {
      key: 'order', label: 'Documents à l’Ordre',
      helper: sent ? 'Envoi enregistré dans votre dossier.'
        : sending ? 'L’envoi des documents est en cours.'
        : failed ? 'Relancez l’envoi depuis votre dossier.'
        : sentDeliveries.length ? 'Certaines pièces actuelles restent à transmettre.'
        : 'Transmettez les pièces au Conseil départemental.',
      status: !dossier ? unknownStatus : sent ? 'Envoyés' : sending ? 'En cours' : failed ? 'À relancer' : sentDeliveries.length ? 'À compléter' : 'À transmettre',
      dateLabel: sent && latestSent ? formatDate(latestSent.sentAt || latestSent.createdAt) : undefined,
      nextAction: sent ? 'Consulter l’historique des envois.' : sending ? 'Suivre l’envoi dans le dossier.' : 'Transmettre les documents à l’Ordre.',
      done: sent, active: false,
    },
    {
      key: 'replacement', label: 'Le remplacement',
      helper: completed ? 'La fin de mission a été validée.'
        : ended ? 'La période est terminée, la fin reste à valider.'
        : started ? 'Brief, contacts et échanges à portée de main.'
        : 'Retrouvez les informations avant le premier jour.',
      status: completed ? 'Validé' : ended ? 'À valider' : started ? 'En cours' : 'À venir',
      dateLabel: startDate && endDate ? `${formatDate(startDate)} — ${formatDate(endDate)}` : 'Dates à confirmer',
      nextAction: started || ended ? 'Valider la fin du remplacement.' : 'Préparer le premier jour.',
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
