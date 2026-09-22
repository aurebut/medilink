export type ReportPeriod = 'day' | 'week' | 'month';

export type ActivityReport = {
  id: string;
  date: string;
  consultations: number;
  activity: string;
  organization: string;
  handover: string;
};

const DAY = 86_400_000;

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date de rapport invalide.');
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Date de rapport invalide.');
  }
  return parsed;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function reportPeriodBounds(anchor: string, period: ReportPeriod) {
  const date = parseDate(anchor);
  if (period === 'day') return { start: anchor, end: anchor };
  if (period === 'week') {
    const start = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY);
    return { start: iso(start), end: iso(new Date(start.getTime() + 6 * DAY)) };
  }
  return {
    start: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12))),
    end: iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12))),
  };
}

export function shiftReportDate(anchor: string, period: ReportPeriod, direction: -1 | 1) {
  const date = parseDate(anchor);
  if (period !== 'month') return iso(new Date(date.getTime() + direction * DAY * (period === 'week' ? 7 : 1)));
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1, 12));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return iso(first);
}

export function reportsForPeriod(reports: ActivityReport[], anchor: string, period: ReportPeriod) {
  const { start, end } = reportPeriodBounds(anchor, period);
  return reports.filter(report => report.date >= start && report.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeReports(reports: ActivityReport[]) {
  if (!reports.length) return null;
  return {
    consultations: reports.reduce((sum, report) => sum + report.consultations, 0),
    days: new Set(reports.map(report => report.date)).size,
  };
}

export function reportDateLabel(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(parseDate(value));
}

// Deliberately separate from live mission data. These records are only displayed
// after the user chooses “Voir un exemple”; they are never fetched or saved.
export const exampleActivityReports: ActivityReport[] = [
  {
    id: 'example-monday', date: '2026-09-21', consultations: 24,
    activity: 'Première journée au cabinet. Les consultations prévues ont été assurées, avec un créneau conservé pour les demandes du jour.',
    organization: 'Prise en main du logiciel et point de démarrage avec le secrétariat. Les accès et les horaires sont confirmés.',
    handover: 'Conserver deux créneaux disponibles le matin pour les demandes reçues par téléphone.',
  },
  {
    id: 'example-tuesday', date: '2026-09-22', consultations: 26,
    activity: 'Journée régulière, entre rendez-vous programmés et demandes du jour. L’agenda a été ajusté avec le secrétariat.',
    organization: 'Les temps de consultation sont adaptés au rythme du cabinet. Le circuit des documents est clarifié.',
    handover: 'Le point téléphonique avec le titulaire est prévu jeudi à 13 h.',
  },
  {
    id: 'example-wednesday', date: '2026-09-23', consultations: 22,
    activity: 'Une journée plus calme, qui a permis de reprendre les consignes d’organisation et de préparer la fin de semaine.',
    organization: 'Les documents utiles au remplacement sont regroupés dans le dossier partagé.',
    handover: 'Le secrétariat a confirmé les horaires de vendredi.',
  },
  {
    id: 'example-thursday', date: '2026-09-24', consultations: 29,
    activity: 'L’activité a été plus soutenue aujourd’hui. Les créneaux réservés aux demandes du jour ont tous été utilisés.',
    organization: 'Un échange avec le titulaire a permis de faire le point sur le fonctionnement du cabinet.',
    handover: 'Prévoir le bilan du remplacement après les dernières consultations de vendredi.',
  },
  {
    id: 'example-friday', date: '2026-09-25', consultations: 25,
    activity: 'Dernière journée de la semaine. Les consultations ont suivi le planning convenu avec le cabinet.',
    organization: 'Point de fin de semaine avec le secrétariat. Le dossier partagé est à jour et les accès ont été vérifiés.',
    handover: 'Prévoir un échange lundi matin pour préparer la suite du remplacement.',
  },
];
