import { agreementLabel, agreementNextStep, agreementTone, latestAgreement } from './candidate-workspace';
import type { Application, Conversation, Mission, MissionAgreement } from './types';

export type EstablishmentAgendaRow = {
  mission: Mission;
  applications: Application[];
  selectedApplication?: Application | null;
  conversation?: Conversation | null;
  agreement?: MissionAgreement | null;
  date?: string | null;
  endDate?: string | null;
};

export function isValidatedMission(mission: Mission) {
  return mission.status === 'PUBLISHED' || mission.status === 'FILLED';
}

export function candidateName(application?: Application | null) {
  const profile = application?.candidate?.profile;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return name || application?.candidate?.email || null;
}

export function missionDateValue(mission: Mission, agreement?: MissionAgreement | null) {
  return agreement?.startDate || mission.startDate || null;
}

export function missionEndDateValue(mission: Mission, agreement?: MissionAgreement | null) {
  return agreement?.endDate || mission.endDate || null;
}

export function conversationForMission(
  mission: Mission,
  applications: Application[],
  conversations: Conversation[],
) {
  const missionApplications = applications.filter((application) => application.missionId === mission.id);
  const acceptedApplication = missionApplications.find((application) => application.status === 'ACCEPTED');
  const proposalApplication = missionApplications.find((application) => {
    const conversation = conversations.find((item) => item.applicationId === application.id) || application.conversation;
    return Boolean(latestAgreement(conversation));
  });
  const selectedApplication = acceptedApplication || proposalApplication || missionApplications[0] || null;
  const conversation = selectedApplication
    ? conversations.find((item) => item.applicationId === selectedApplication.id) || selectedApplication.conversation || null
    : conversations.find((item) => item.missionId === mission.id) || null;

  return {
    applications: missionApplications,
    selectedApplication,
    conversation,
    agreement: latestAgreement(conversation),
  };
}

export function buildEstablishmentAgendaRows(
  missions: Mission[],
  applications: Application[],
  conversations: Conversation[],
): EstablishmentAgendaRow[] {
  return missions
    .filter(isValidatedMission)
    .map((mission) => {
      const context = conversationForMission(mission, applications, conversations);
      return {
        mission,
        ...context,
        date: missionDateValue(mission, context.agreement),
        endDate: missionEndDateValue(mission, context.agreement),
      };
    })
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

export function establishmentMissionTone(row: EstablishmentAgendaRow): 'neutral' | 'success' | 'warning' | 'danger' {
  if (row.agreement) return agreementTone(row.agreement.status);
  if (row.selectedApplication?.status === 'ACCEPTED' || row.mission.status === 'FILLED') return 'success';
  if (row.applications.length > 0) return 'warning';
  return 'neutral';
}

export function establishmentMissionLabel(row: EstablishmentAgendaRow) {
  if (row.agreement) return agreementLabel(row.agreement.status);
  if (row.selectedApplication?.status === 'ACCEPTED') return 'Candidat validé';
  if (row.mission.status === 'FILLED') return 'Mission pourvue';
  if (row.applications.length > 0) return `${row.applications.length} candidature${row.applications.length > 1 ? 's' : ''}`;
  return 'Mission publiée';
}

export function establishmentMissionNextStep(row: EstablishmentAgendaRow) {
  if (row.agreement) return agreementNextStep(row.agreement.status);
  if (row.selectedApplication?.status === 'ACCEPTED') return 'Préparer le brief mission';
  if (row.applications.length > 0) return 'Traiter les candidatures';
  return 'Mission visible aux candidats';
}
