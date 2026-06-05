'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementTone, conversationForApplication, dateKey, latestAgreement, missionDateValue, sortByMissionDate, weekDayLabels } from '@/lib/candidate-workspace';
import { buildCandidateMissionHistoryRows } from '@/lib/candidate-mission-history';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation } from '@/lib/types';
import { CandidateMissionHistoryList } from '@/components/CandidateMissionHistoryList';
import { Badge, Button, Card, EmptyState, LinkButton, LoadingCard, PageHeader, Textarea } from '@/components/ui';

function buildCalendarDays(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - mondayOffset);

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    days.push({
      date,
      key: date.toISOString().slice(0, 10),
      inMonth: date.getMonth() === anchor.getMonth(),
      isToday: date.toDateString() === new Date().toDateString(),
    });
  }
  return days;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export default function CandidateAgendaPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarAnimation, setCalendarAnimation] = useState<'next' | 'prev' | 'jump'>('jump');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState('');
  const [noteEditing, setNoteEditing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('medilink_candidate_agenda_notes');
      if (stored) setNotes(JSON.parse(stored));
    } catch {
      setNotes({});
    }
  }, []);

  useEffect(() => {
    const savedNote = notes[selectedDay] || '';
    setDraftNote(savedNote);
    setNoteEditing(!savedNote);
  }, [notes, selectedDay]);

  useEffect(() => {
    Promise.all([
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([a, c]) => {
      setApplications(a);
      setConversations(c);
    }).finally(() => setLoading(false));
  }, []);

  const events = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return sortByMissionDate(applications.map((application) => {
      const conversation = conversationForApplication(application, conversations);
      const agreement = latestAgreement(conversation);
      const date = missionDateValue(application, agreement);
      const dateTime = date ? new Date(date).getTime() : null;

      return {
        application,
        conversation,
        agreement,
        date,
        upcoming: dateTime === null || dateTime >= startOfToday,
      };
    }));
  }, [applications, conversations]);

  const missionRows = useMemo(() => buildCandidateMissionHistoryRows(applications, conversations), [applications, conversations]);

  const upcomingEvents = events.filter((event) => event.upcoming).slice(0, 8);
  const acceptedEvents = events.filter((event) => event.application.status === 'ACCEPTED');
  const proposalEvents = events.filter((event) => latestAgreement(event.conversation)?.status === 'PROPOSED');
  const activeRows = missionRows.filter(({ application }) => !['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(application.status));
  const completedRows = missionRows.filter(({ agreement }) => ['COMPLETED', 'PAYMENT_RELEASED'].includes(agreement?.status || ''));
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((event) => {
      const key = dateKey(event.date);
      map.set(key, [...(map.get(key) || []), event]);
    });
    return map;
  }, [events]);
  const selectedEvents = eventsByDay.get(selectedDay) || [];
  const selectedDate = selectedDay === 'undated' ? null : new Date(`${selectedDay}T12:00:00`);

  function saveNote() {
    const next = { ...notes, [selectedDay]: draftNote.trim() };
    if (!next[selectedDay]) delete next[selectedDay];
    setNotes(next);
    setNoteEditing(!next[selectedDay]);
    window.localStorage.setItem('medilink_candidate_agenda_notes', JSON.stringify(next));
  }

  function clearNote() {
    const next = { ...notes };
    delete next[selectedDay];
    setDraftNote('');
    setNotes(next);
    setNoteEditing(true);
    window.localStorage.setItem('medilink_candidate_agenda_notes', JSON.stringify(next));
  }

  function goToMonth(offset: number) {
    setCalendarAnimation(offset < 0 ? 'prev' : 'next');
    setDetailOpen(false);
    setCalendarMonth((month) => addMonths(month, offset));
  }

  function goToToday() {
    const today = new Date();
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCalendarAnimation(todayMonth.getTime() < calendarMonth.getTime() ? 'prev' : 'next');
    setCalendarMonth(todayMonth);
    setSelectedDay(dateKey(today));
    setDetailOpen(true);
  }

  function onCalendarTouchEnd(clientX: number) {
    if (touchStartX === null) return;
    const delta = clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(delta) < 48) return;
    goToMonth(delta < 0 ? 1 : -1);
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Vue opérationnelle des missions, propositions et disponibilités déclarées."
        actions={<LinkButton href="/app/profile" variant="light">Modifier mes disponibilités</LinkButton>}
      />

      <div className="agenda-overview">
        <div>
          <span>Missions acceptées</span>
          <strong>{acceptedEvents.length}</strong>
        </div>
        <div>
          <span>Propositions</span>
          <strong>{proposalEvents.length}</strong>
        </div>
        <div>
          <span>A venir</span>
          <strong>{upcomingEvents.length}</strong>
        </div>
        <div>
          <span>Actives</span>
          <strong>{activeRows.length}</strong>
        </div>
        <div>
          <span>Terminées</span>
          <strong>{completedRows.length}</strong>
        </div>
      </div>

      <div className="agenda-workspace">
        <Card className="agenda-calendar-card">
          <div className="agenda-calendar-head">
            <div>
              <span>Calendrier</span>
              <div className="agenda-month-title">
                <button type="button" className="agenda-arrow-button" aria-label="Mois précédent" title="Mois précédent" onClick={() => goToMonth(-1)}>
                  ←
                </button>
                <h2>{monthLabel(calendarMonth)}</h2>
                <button type="button" className="agenda-arrow-button" aria-label="Mois suivant" title="Mois suivant" onClick={() => goToMonth(1)}>
                  →
                </button>
              </div>
              <p className="small">Missions, propositions et candidatures datées.</p>
            </div>
            <div className="agenda-month-actions">
              <Button
                type="button"
                variant="light"
                onClick={goToToday}
              >
                Aujourd’hui
              </Button>
            </div>
          </div>

          <div
            key={`${dateKey(calendarMonth)}-${calendarAnimation}`}
            className={`agenda-calendar agenda-calendar-${calendarAnimation}`}
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => onCalendarTouchEnd(event.changedTouches[0]?.clientX ?? touchStartX ?? 0)}
          >
            {weekDayLabels.map((day) => (
              <div key={day} className="agenda-weekday">{day}</div>
            ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsByDay.get(day.key) || [];
              const hasNote = Boolean(notes[day.key]);
              if (!day.inMonth) {
                return <div key={day.key} className="agenda-day agenda-day-outside" aria-hidden="true" />;
              }
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`agenda-day ${day.inMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${selectedDay === day.key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDay(day.key);
                    setDetailOpen(true);
                  }}
                >
                  <div className="agenda-day-number">{day.date.getDate()}</div>
                  <div className="agenda-day-events">
                    {hasNote ? <span className="agenda-note-dot">Note</span> : null}
                    {dayEvents.slice(0, 3).map(({ application, agreement }) => (
                      <div key={application.id} className={`agenda-event is-${agreementTone(agreement?.status)}`}>
                        <strong>{application.mission?.title || 'Mission'}</strong>
                        <span>{application.mission?.startTime || agreementLabel(agreement?.status)}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 ? <span className="agenda-more">+{dayEvents.length - 3}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {detailOpen ? (
            <div className="agenda-day-popover" role="dialog" aria-label="Détails du jour">
              <div className="agenda-popover-head">
                <div>
                  <strong>{selectedDate ? formatDate(selectedDate.toISOString()) : 'Jour sélectionné'}</strong>
                  <span>{selectedEvents.length} événement(s)</span>
                </div>
                <button type="button" className="agenda-popover-close" aria-label="Fermer" onClick={() => setDetailOpen(false)}>×</button>
              </div>

              {selectedEvents.length > 0 ? (
                <div className="agenda-detail-events">
                  {selectedEvents.map(({ application, agreement, conversation }) => (
                    <div key={application.id} className="agenda-detail-event">
                      <div>
                        <strong>{application.mission?.title || 'Mission'}</strong>
                        <span>{application.mission?.establishment?.name || application.mission?.city || 'Etablissement à confirmer'}</span>
                      </div>
                      <Badge tone={agreementTone(agreement?.status)}>{agreement ? agreementLabel(agreement.status) : statusLabel(application.status)}</Badge>
                      <div className="actions">
                        {conversation ? <LinkButton href="/app/messages" variant="light">Messagerie</LinkButton> : null}
                        {application.missionId ? <LinkButton href={`/app/missions/${application.missionId}`} variant="secondary">Mission</LinkButton> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty compact">
                  <strong>Aucun événement</strong>
                  <p>Vous pouvez quand même ajouter une note pour cette journée.</p>
                </div>
              )}

              <div className="agenda-note-editor">
                {notes[selectedDay] && !noteEditing ? (
                  <div className="agenda-saved-note">
                    <div>
                      <span>Note du jour</span>
                      <p>{notes[selectedDay]}</p>
                    </div>
                    <div className="actions">
                      <Button type="button" variant="light" onClick={() => setNoteEditing(true)}>Modifier</Button>
                      <Button type="button" variant="light" onClick={clearNote}>Effacer</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="field">
                      <span className="label">Note du jour</span>
                      <Textarea
                        value={draftNote}
                        onChange={(event) => setDraftNote(event.target.value)}
                        placeholder="Ex : appeler le secrétariat, préparer documents, indisponible l’après-midi..."
                      />
                    </label>
                    <div className="actions">
                      <Button type="button" onClick={saveNote}>Enregistrer</Button>
                      {notes[selectedDay] ? <Button type="button" variant="light" onClick={() => { setDraftNote(notes[selectedDay]); setNoteEditing(false); }}>Annuler</Button> : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </Card>

      </div>

      <Card className="agenda-list-card">
        <div className="toolbar">
          <div>
            <h2>Liste chronologique</h2>
            <p className="small">Les prochaines actions à traiter, dans l’ordre.</p>
          </div>
          <LinkButton href="/app/search" variant="light">Trouver une mission</LinkButton>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="agenda-list">
            {upcomingEvents.map(({ application, agreement, conversation, date }) => (
              <div key={application.id} className="agenda-list-item">
                <div className="agenda-list-date">
                  <strong>{formatDate(date)}</strong>
                  <span>{application.mission?.startTime || 'Horaire à confirmer'}</span>
                </div>
                <div className="agenda-list-main">
                  <strong>{application.mission?.title || 'Mission'}</strong>
                  <span>{application.mission?.establishment?.name || application.mission?.city || 'Etablissement à confirmer'}</span>
                </div>
                <Badge tone={agreementTone(agreement?.status)}>{agreement ? agreementLabel(agreement.status) : statusLabel(application.status)}</Badge>
                <div className="actions">
                  {conversation ? <LinkButton href="/app/messages" variant="light">Messagerie</LinkButton> : null}
                  {application.missionId ? <LinkButton href={`/app/missions/${application.missionId}`} variant="secondary">Mission</LinkButton> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucun événement à venir"
            description="Les missions acceptées et candidatures datées apparaîtront ici."
            action={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
          />
        )}
      </Card>

      <Card className="agenda-list-card">
        <div className="toolbar">
          <div>
            <h2>Historique des missions</h2>
            <p className="small">Les dernières candidatures, propositions et missions traitées.</p>
          </div>
          <LinkButton href="/app/agenda/missions" variant="light">Voir tout</LinkButton>
        </div>

        <CandidateMissionHistoryList rows={missionRows} limit={3} />
      </Card>
    </>
  );
}
