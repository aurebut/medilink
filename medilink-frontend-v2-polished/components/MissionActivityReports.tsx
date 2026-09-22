'use client';

import { useEffect, useId, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, X } from 'lucide-react';
import { exampleActivityReports, reportDateLabel, reportPeriodBounds, reportsForPeriod, shiftReportDate, summarizeReports, type ReportPeriod } from '@/lib/mission-activity-reports';
import styles from './MissionActivityReports.module.css';

const periods: Array<{ id: ReportPeriod; label: string }> = [
  { id: 'day', label: 'Journalier' },
  { id: 'week', label: 'Hebdomadaire' },
  { id: 'month', label: 'Mensuel' },
];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function MissionActivityReports({ missionTitle, onOpenDocuments }: { missionTitle: string; onOpenDocuments: () => void }) {
  const [example, setExample] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('day');
  const [anchor, setAnchor] = useState(today);
  const inputId = useId();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const nextPeriod = query.get('reportPeriod');
    if (nextPeriod === 'day' || nextPeriod === 'week' || nextPeriod === 'month') setPeriod(nextPeriod);
    const nextDate = query.get('reportDate');
    if (nextDate) {
      try { reportPeriodBounds(nextDate, 'day'); setAnchor(nextDate); } catch { /* Ignore an invalid date in a copied URL. */ }
    }
  }, []);

  function select(nextPeriod: ReportPeriod, nextDate: string) {
    setPeriod(nextPeriod);
    setAnchor(nextDate);
    const url = new URL(window.location.href);
    url.searchParams.set('section', 'reports');
    url.searchParams.set('reportPeriod', nextPeriod);
    url.searchParams.set('reportDate', nextDate);
    window.history.replaceState(null, '', url);
  }

  function enterExample() {
    setExample(true);
    select(period, '2026-09-25');
  }

  function leaveExample() {
    setExample(false);
    select('day', today());
  }

  const reports = reportsForPeriod(example ? exampleActivityReports : [], anchor, period);
  const totals = summarizeReports(reports);
  const bounds = reportPeriodBounds(anchor, period);
  const periodLabel = period === 'week'
    ? `${reportDateLabel(bounds.start, { day: 'numeric', month: 'short' })} – ${reportDateLabel(bounds.end, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : reportDateLabel(anchor, period === 'month' ? { month: 'long', year: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long' });
  const dayReport = period === 'day' ? reports[0] : null;

  return (
    <section className={styles.report} aria-label="Rapports d’activité" data-activity-reports data-example={example}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Le suivi du remplacement</span>
          <h2>Le fil de l’activité.</h2>
          <p>{example ? 'Cabinet des Tilleuls · Médecine générale' : missionTitle}</p>
        </div>
        {example ? <span className={styles.exampleBadge}>Exemple · données fictives</span> : <span className={styles.comingBadge}>À venir</span>}
      </header>

      <div className={styles.toolbar}>
        <div className={styles.periods} role="group" aria-label="Période des rapports">
          {periods.map(item => <button type="button" key={item.id} aria-pressed={period === item.id} onClick={() => select(item.id, anchor)}>{item.label}</button>)}
        </div>
        <div className={styles.datePicker}>
          <button type="button" aria-label="Période précédente" onClick={() => select(period, shiftReportDate(anchor, period, -1))}><ChevronLeft size={17} /></button>
          <label htmlFor={inputId}><CalendarDays size={16} aria-hidden="true" /><span className={styles.visuallyHidden}>Date de référence du rapport</span><input id={inputId} type="date" value={anchor} onChange={event => {
            if (!event.target.value) return;
            try { reportPeriodBounds(event.target.value, period); select(period, event.target.value); } catch { /* Browser date input may be incomplete while typing. */ }
          }} /></label>
          <button type="button" aria-label="Période suivante" onClick={() => select(period, shiftReportDate(anchor, period, 1))}><ChevronRight size={17} /></button>
        </div>
      </div>

      {totals ? <div className={styles.body} aria-live="polite">
        <div className={styles.periodHeading}>
          <div><span className={styles.eyebrow}>{period === 'day' ? 'Rapport du jour' : period === 'week' ? 'La semaine en un regard' : 'Le mois en un regard'}</span><h3>{periodLabel}</h3></div>
          <div className={styles.author}>
            {/* This portrait belongs to the same fictional doctor as the public product previews. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing-assets/people/sarah-bernard.webp" alt="" width="40" height="40" />
            <div><strong>Dr Sarah Bernard</strong><span>Remplaçante · exemple</span></div>
          </div>
        </div>

        <div className={styles.overview}>
          <div className={styles.mainMetric}><strong>{totals.consultations}</strong><span>consultations déclarées</span></div>
          <div className={styles.periodSummary}>
            <span className={styles.reportCount}><Check size={14} />{totals.days} journée{totals.days > 1 ? 's' : ''} renseignée{totals.days > 1 ? 's' : ''}</span>
            <p>{dayReport ? dayReport.activity : 'Une activité suivie au fil des journées, avec un point régulier sur l’organisation du cabinet et les informations à transmettre.'}</p>
            {!dayReport ? <span className={styles.coverage}>Synthèse des {reports.length} rapports disponibles sur cette période.</span> : null}
          </div>
        </div>

        <div className={dayReport ? styles.dailyContent : styles.periodContent}>
          <div className={styles.narrative}>
            <span className={styles.eyebrow}>La continuité, au quotidien</span>
            <h4>{dayReport ? 'L’essentiel à retenir' : period === 'week' ? 'Une semaine bien préparée' : 'Le contexte du mois'}</h4>
            <p>{dayReport ? dayReport.organization : 'La prise en main du cabinet est faite. Les horaires, le logiciel et le circuit des documents ont été revus avec le secrétariat.'}</p>
            <div className={styles.handover}>
              <span><ArrowRight size={15} />Pour la suite</span>
              <p>{dayReport ? dayReport.handover : reports[reports.length - 1].handover}</p>
            </div>
          </div>
          {!dayReport ? <div className={styles.journal}>
            <div className={styles.journalHeading}><h4>Le journal de la période</h4><span>{reports.length} rapports</span></div>
            {reports.map(report => <button type="button" className={styles.journalRow} key={report.id} onClick={() => select('day', report.date)} aria-label={`Lire le rapport du ${reportDateLabel(report.date)}`}>
              <span className={styles.journalDate}><strong>{reportDateLabel(report.date, { weekday: 'short' })}</strong><span>{reportDateLabel(report.date, { day: 'numeric', month: 'short' })}</span></span>
              <span className={styles.journalActivity}><strong>{report.consultations}</strong><span>consultations</span></span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>)}
          </div> : <button className={styles.weekLink} type="button" onClick={() => select('week', anchor)}>Retrouver les rapports de la semaine <ArrowRight size={16} /></button>}
        </div>
      </div> : <div className={styles.empty} aria-live="polite">
        <ClipboardList size={32} strokeWidth={1.25} aria-hidden="true" />
        <span className={styles.eyebrow}>{periodLabel}</span>
        <h3>{example ? 'Une période encore vierge.' : 'Vos rapports, bientôt ici.'}</h3>
        <p>{example ? 'Aucun rapport d’exemple sur cette période. Les cinq journées disponibles vont du 21 au 25 septembre 2026.' : 'Les rapports structurés arrivent bientôt. Vous pourrez parcourir l’activité du remplacement par jour, par semaine ou par mois.'}</p>
        <div className={styles.emptyActions}>
          <button type="button" className={styles.primaryButton} onClick={example ? () => select('week', '2026-09-25') : enterExample}>{example ? 'Revenir aux rapports d’exemple' : 'Voir un exemple'}<ArrowRight size={16} /></button>
          {!example ? <button type="button" className={styles.textButton} onClick={onOpenDocuments}>Ouvrir le dossier partagé</button> : null}
        </div>
      </div>}

      {example ? <footer className={styles.footer}><span>Exemple interactif · aucun rapport enregistré ou envoyé.</span><button type="button" onClick={leaveExample}><X size={14} />Quitter l’exemple</button></footer> : null}
    </section>
  );
}
