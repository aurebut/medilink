'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementTone, buildCalendarEventWeeks, conversationForApplication, dateKey, dateRangeKeys, isCandidateAgendaApplication, latestAgreement, missionDateValue, missionEndDateValue, sortByMissionDate, weekDayLabels } from '@/lib/candidate-workspace';
import { buildCandidateMissionHistoryRows } from '@/lib/candidate-mission-history';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import { getCandidateConversationPath } from '@/lib/mission-links';
import type { Application, Conversation } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { CandidateMissionHistoryList } from '@/components/CandidateMissionHistoryList';
import { Badge, Button, Card, LinkButton, LoadingCard, PageHeader, Textarea } from '@/components/ui';

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
      key: dateKey(date),
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

type AgendaSection = 'calendar' | 'history';

const agendaSections: Array<{ id: AgendaSection; label: string }> = [
  { id: 'calendar', label: 'Mon agenda' },
  { id: 'history', label: 'Historique des missions' },
];

export default function CandidateAgendaPage() {
  const cachedApplications = api.getSync<Application[]>('/me/applications');
  const cachedConversations = api.getSync<Conversation[]>('/conversations');
  const [applications, setApplications] = useState<Application[]>(cachedApplications || []);
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations || []);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarAnimation, setCalendarAnimation] = useState<'next' | 'prev' | 'jump'>('jump');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState('');
  const [noteEditing, setNoteEditing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [loading, setLoading] = useState(!(cachedApplications && cachedConversations));

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

  async function load(options: { reload?: boolean } = {}) {
    const read = options.reload ? api.reload : api.get;
    const [a, c] = await Promise.all([
      read<Application[]>('/me/applications'),
      read<Conversation[]>('/conversations'),
    ]);
    setApplications(a);
    setConversations(c);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => load({ reload: true }), { enabled: !loading });

  const events = useMemo(() => {
    const now = new Date();
    const todayKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

    return sortByMissionDate(applications.flatMap((application) => {
      const conversation = conversationForApplication(application, conversations);
      const agreement = latestAgreement(conversation);
      if (!isCandidateAgendaApplication(application, agreement)) return [];

      const date = missionDateValue(application, agreement);
      const endDate = missionEndDateValue(application, agreement);
      const dateTime = date ? new Date(date).getTime() : null;

      return [{
        application,
        conversation,
        agreement,
        date,
        endDate,
        upcoming: dateTime === null || dateKey(endDate || date) >= todayKey,
      }];
    }));
  }, [applications, conversations]);

  const missionRows = useMemo(() => buildCandidateMissionHistoryRows(applications, conversations), [applications, conversations]);

  const upcomingEvents = events.filter((event) => event.upcoming).slice(0, 8);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const calendarWeeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => calendarDays.slice(index * 7, index * 7 + 7)),
    [calendarDays],
  );
  const calendarEventWeeks = useMemo(
    () => buildCalendarEventWeeks(
      calendarWeeks.map((week) => week.map((day) => day.date)),
      events,
      {
        getKey: (event) => event.application.id,
        getStart: (event) => event.date,
        getEnd: (event) => event.endDate,
      },
    ),
    [calendarWeeks, events],
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((event) => {
      dateRangeKeys(event.date, event.endDate).forEach((key) => {
        map.set(key, [...(map.get(key) || []), event]);
      });
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
      />

      <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Navigation de l'agenda" style={{ marginBottom: 18 }}>
        {agendaSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            onClick={() => setActiveSection(section.id)}
            role="tab"
            aria-selected={activeSection === section.id}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'calendar' ? (
        <>
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
                <div className="agenda-calendar-weekdays">
                  {weekDayLabels.map((day) => (
                    <div key={day} className="agenda-weekday">{day}</div>
                  ))}
                </div>
                <div className="agenda-calendar-body">
                  {calendarWeeks.map((week, weekIndex) => (
                    <div key={calendarEventWeeks[weekIndex].key} className="agenda-week-row">
                      {week.map((day) => {
                        const hasNote = Boolean(notes[day.key]);
                        const dayEvents = eventsByDay.get(day.key) || [];
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
                              {dayEvents.slice(0, 3).map((event) => (
                                <span
                                  key={event.application.id}
                                  className={`agenda-event-dot is-${agreementTone(event.agreement?.status)}`}
                                  aria-hidden="true"
                                />
                              ))}
                              {dayEvents.length > 3 ? <span className="agenda-day-more">+{dayEvents.length - 3}</span> : null}
                              {hasNote ? <span className="agenda-note-dot">Note</span> : null}
                            </div>
                          </button>
                        );
                      })}
                      <div className="agenda-event-layer">
                        {calendarEventWeeks[weekIndex].segments.map((segment) => (
                          <button
                            key={`${segment.key}-${segment.startIndex}-${segment.endIndex}`}
                            type="button"
                            tabIndex={-1}
                            className={`agenda-span-event is-${agreementTone(segment.item.agreement?.status)} ${segment.isStart ? 'starts' : 'continues'} ${segment.isEnd ? 'ends' : 'continues'}`}
                            style={{
                              gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
                              gridRow: segment.lane + 1,
                            }}
                            onClick={() => {
                              setSelectedDay(dateKey(calendarEventWeeks[weekIndex].days[segment.startIndex]));
                              setDetailOpen(true);
                            }}
                          >
                            <strong>{segment.item.application.mission?.title || 'Mission'}</strong>
                            <span>{segment.item.application.mission?.startTime || agreementLabel(segment.item.agreement?.status)}</span>
                          </button>
                        ))}
                        {calendarEventWeeks[weekIndex].hiddenCount > 0 ? (
                          <span className="agenda-span-more">+{calendarEventWeeks[weekIndex].hiddenCount}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
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
                            {conversation ? <LinkButton href={getCandidateConversationPath(conversation.id)} variant="light">Messagerie</LinkButton> : null}
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

          <Card className="agenda-upcoming-card">
            <div className="toolbar">
              <div>
                <h2>Missions à venir</h2>
                <p className="small">Vos {upcomingEvents.length} prochaine(s) mission(s) ou proposition(s) de mission.</p>
              </div>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="agenda-upcoming-list">
                {upcomingEvents.map(({ application, agreement, conversation, date }) => (
                  <div key={application.id} className="agenda-upcoming-row">
                    <div className="agenda-upcoming-main">
                      <strong>{application.mission?.title || 'Mission'}</strong>
                      <span>{application.mission?.establishment?.name || 'Établissement à confirmer'} • {application.mission?.city}</span>
                    </div>
                    <div className="agenda-upcoming-meta">
                      <span className="upcoming-date">{date ? formatDate(date) : 'Date à confirmer'}</span>
                      <span className="upcoming-time">{application.mission?.startTime || agreement?.startTime || '—'}</span>
                    </div>
                    <div className="agenda-upcoming-badge">
                      <Badge tone={agreementTone(agreement?.status)}>
                        {agreement ? agreementLabel(agreement.status) : statusLabel(application.status)}
                      </Badge>
                    </div>
                    <div className="actions">
                      {conversation ? (
                        <LinkButton href={getCandidateConversationPath(conversation.id)} variant="light">
                          Messagerie
                        </LinkButton>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune mission à venir</strong>
                <p>Recherchez des annonces pour planifier de nouvelles missions.</p>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="agenda-list-card">
          <div className="toolbar">
            <div>
              <h2>Historique des missions</h2>
              <p className="small">Toutes vos propositions, missions acceptées et terminées.</p>
            </div>
            <LinkButton href="/app/agenda/missions" variant="light">Voir tout</LinkButton>
          </div>

          <CandidateMissionHistoryList rows={missionRows} />
        </Card>
      )}
    </>
  );
}
