'use client';

import { useEffect, useMemo, useState } from 'react';
import { EstablishmentMissionHistoryList } from '@/components/EstablishmentMissionHistoryList';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { buildCalendarEventWeeks, dateKey, dateRangeKeys, weekDayLabels } from '@/lib/candidate-workspace';
import {
  buildEstablishmentAgendaRows,
  candidateName,
  establishmentMissionLabel,
  establishmentMissionTone,
} from '@/lib/establishment-agenda';
import { formatDate } from '@/lib/format';
import { getEstablishmentConversationPath } from '@/lib/mission-links';
import type { Application, Conversation, Mission } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

function buildCalendarDays(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: dateKey(date),
      inMonth: date.getMonth() === anchor.getMonth(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function notesStorageKey(establishmentId: string) {
  return `medilink_establishment_agenda_notes_${establishmentId}`;
}

type AgendaSection = 'calendar' | 'history';

const agendaSections: Array<{ id: AgendaSection; label: string }> = [
  { id: 'calendar', label: 'Mon agenda' },
  { id: 'history', label: 'Historique des missions' },
];

export default function EstablishmentAgendaPage() {
  const { primary, loading: establishmentsLoading } = useEstablishments();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarAnimation, setCalendarAnimation] = useState<'next' | 'prev' | 'jump'>('jump');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState('');
  const [noteEditing, setNoteEditing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!primary) {
      setNotes({});
      return;
    }

    try {
      const stored = window.localStorage.getItem(notesStorageKey(primary.id));
      setNotes(stored ? JSON.parse(stored) : {});
    } catch {
      setNotes({});
    }
  }, [primary]);

  useEffect(() => {
    const savedNote = notes[selectedDay] || '';
    setDraftNote(savedNote);
    setNoteEditing(!savedNote);
  }, [notes, selectedDay]);

  async function loadData(options: { silent?: boolean; reload?: boolean } = {}) {
    if (establishmentsLoading) return;
    if (!primary) {
      setMissions([]);
      setApplications([]);
      setConversations([]);
      if (!options.silent) setLoading(false);
      return;
    }

    const missionsPath = `/missions/mine?establishmentId=${primary.id}`;
    const applicationsPath = `/establishment/applications?establishmentId=${primary.id}`;
    if (!options.silent) {
      const cachedMissions = options.reload ? null : api.getSync<Mission[]>(missionsPath);
      const cachedApplications = options.reload ? null : api.getSync<Application[]>(applicationsPath);
      const cachedConversations = options.reload ? null : api.getSync<Conversation[]>('/conversations');
      if (cachedMissions && cachedApplications && cachedConversations) {
        setMissions(cachedMissions);
        setApplications(cachedApplications);
        setConversations(cachedConversations);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const read = options.reload ? api.reload : api.get;
      const [m, a, c] = await Promise.all([
        read<Mission[]>(missionsPath),
        read<Application[]>(applicationsPath),
        read<Conversation[]>('/conversations'),
      ]);
      setMissions(m);
      setApplications(a);
      setConversations(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [establishmentsLoading, primary]);

  useAutoRefresh(() => loadData({ silent: true, reload: true }), { enabled: !establishmentsLoading && !loading });

  const rows = useMemo(
    () => buildEstablishmentAgendaRows(missions, applications, conversations),
    [missions, applications, conversations],
  );

  const todayKey = dateKey(new Date());
  const upcomingRows = rows.filter((row) => !row.date || dateKey(row.endDate || row.date) >= todayKey);
  const filledRows = rows.filter((row) => row.mission.status === 'FILLED' || row.selectedApplication?.status === 'ACCEPTED');
  const proposalRows = rows.filter((row) => ['PROPOSED', 'PAYMENT_REQUIRED'].includes(row.agreement?.status || ''));
  const completedRows = rows.filter((row) => ['COMPLETED', 'PAYMENT_RELEASED'].includes(row.agreement?.status || ''));
  const upcomingEvents = rows.filter((row) => row.date && dateKey(row.endDate || row.date) >= todayKey).slice(0, 8);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const calendarWeeks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => calendarDays.slice(index * 7, index * 7 + 7)),
    [calendarDays],
  );
  const calendarEventWeeks = useMemo(
    () => buildCalendarEventWeeks(
      calendarWeeks.map((week) => week.map((day) => day.date)),
      rows,
      {
        getKey: (row) => row.mission.id,
        getStart: (row) => row.date,
        getEnd: (row) => row.endDate,
      },
    ),
    [calendarWeeks, rows],
  );
  const rowsByDay = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach((row) => {
      dateRangeKeys(row.date, row.endDate).forEach((key) => {
        map.set(key, [...(map.get(key) || []), row]);
      });
    });
    return map;
  }, [rows]);
  const selectedRows = rowsByDay.get(selectedDay) || [];
  const selectedDate = selectedDay === 'undated' ? null : new Date(`${selectedDay}T12:00:00`);

  function persistNotes(next: Record<string, string>) {
    setNotes(next);
    if (primary) {
      window.localStorage.setItem(notesStorageKey(primary.id), JSON.stringify(next));
    }
  }

  function saveNote() {
    const next = { ...notes, [selectedDay]: draftNote.trim() };
    if (!next[selectedDay]) delete next[selectedDay];
    persistNotes(next);
    setNoteEditing(!next[selectedDay]);
  }

  function clearNote() {
    const next = { ...notes };
    delete next[selectedDay];
    setDraftNote('');
    persistNotes(next);
    setNoteEditing(true);
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

  if (establishmentsLoading || loading) return <LoadingCard label="Chargement de l'agenda..." />;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Vue opérationnelle des missions publiées, pourvues et confirmées de votre établissement."
        actions={
          primary ? (
            <LinkButton href="/establishment/missions/new" variant="light">Créer une mission</LinkButton>
          ) : (
            <LinkButton href="/establishment/onboarding" variant="light">Créer mon établissement</LinkButton>
          )
        }
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez votre fiche établissement pour publier des missions puis les retrouver dans l'agenda.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      ) : (
        <>


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
                          &larr;
                        </button>
                        <h2>{monthLabel(calendarMonth)}</h2>
                        <button type="button" className="agenda-arrow-button" aria-label="Mois suivant" title="Mois suivant" onClick={() => goToMonth(1)}>
                          &rarr;
                        </button>
                      </div>
                      <p className="small">Missions publiées, candidatures retenues et accords datés.</p>
                    </div>
                    <div className="agenda-month-actions">
                      <Button type="button" variant="light" onClick={goToToday}>
                        Aujourd'hui
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
                            const dayRows = rowsByDay.get(day.key) || [];
                            if (!day.inMonth) {
                              return <div key={day.key} className="agenda-day agenda-day-outside" aria-hidden="true" />;
                            }
                            return (
                              <button
                                key={day.key}
                                type="button"
                                className={`agenda-day ${day.isToday ? 'today' : ''} ${selectedDay === day.key ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedDay(day.key);
                                  setDetailOpen(true);
                                }}
                              >
                                <div className="agenda-day-number">{day.date.getDate()}</div>
                                <div className="agenda-day-events">
                                  {dayRows.slice(0, 3).map((row) => (
                                    <span
                                      key={row.mission.id}
                                      className={`agenda-event-dot is-${establishmentMissionTone(row)}`}
                                      aria-hidden="true"
                                    />
                                  ))}
                                  {dayRows.length > 3 ? <span className="agenda-day-more">+{dayRows.length - 3}</span> : null}
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
                                className={`agenda-span-event is-${establishmentMissionTone(segment.item)} ${segment.isStart ? 'starts' : 'continues'} ${segment.isEnd ? 'ends' : 'continues'}`}
                                style={{
                                  gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
                                  gridRow: segment.lane + 1,
                                }}
                                onClick={() => {
                                  setSelectedDay(dateKey(calendarEventWeeks[weekIndex].days[segment.startIndex]));
                                  setDetailOpen(true);
                                }}
                              >
                                <strong>{segment.item.mission.title}</strong>
                                <span>{segment.item.mission.startTime || establishmentMissionLabel(segment.item)}</span>
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
                          <span>{selectedRows.length} événement(s)</span>
                        </div>
                        <button type="button" className="agenda-popover-close" aria-label="Fermer" onClick={() => setDetailOpen(false)}>x</button>
                      </div>

                      {selectedRows.length > 0 ? (
                        <div className="agenda-detail-events">
                          {selectedRows.map((row) => (
                            <div key={row.mission.id} className="agenda-detail-event">
                              <div>
                                <strong>{row.mission.title}</strong>
                                <span>{candidateName(row.selectedApplication) || row.mission.establishment?.name || row.mission.city || 'Candidat à confirmer'}</span>
                              </div>
                              <Badge tone={establishmentMissionTone(row)}>{establishmentMissionLabel(row)}</Badge>
                              <div className="actions">
                                {row.conversation ? <LinkButton href={getEstablishmentConversationPath(row.conversation.id)} variant="light">Messagerie</LinkButton> : null}
                                <LinkButton href={`/establishment/missions/${row.mission.id}`} variant="secondary">Mission</LinkButton>
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
                                placeholder="Ex : appeler le candidat, vérifier les documents, préparer l'accueil..."
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
                    {upcomingEvents.map((row) => (
                      <div key={row.mission.id} className="agenda-upcoming-row">
                        <div className="agenda-upcoming-main">
                          <strong>{row.mission.title}</strong>
                          <span>
                            {row.selectedApplication
                              ? `Candidat : ${candidateName(row.selectedApplication) || 'Validé'}`
                              : 'Aucun candidat validé'} • {row.mission.city}
                          </span>
                        </div>
                        <div className="agenda-upcoming-meta">
                          <span className="upcoming-date">{row.date ? formatDate(row.date) : 'Date à confirmer'}</span>
                          <span className="upcoming-time">{row.mission.startTime || '—'}</span>
                        </div>
                        <div className="agenda-upcoming-badge">
                          <Badge tone={establishmentMissionTone(row)}>
                            {establishmentMissionLabel(row)}
                          </Badge>
                        </div>
                        <div className="actions">
                          {row.conversation ? (
                            <LinkButton href={getEstablishmentConversationPath(row.conversation.id)} variant="light">
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
                    <p>Publiez des annonces pour planifier de nouvelles missions.</p>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="agenda-list-card">
              <div className="toolbar">
                <div>
                  <h2>Historique des missions</h2>
                  <p className="small">Toutes vos missions publiées, pourvues et confirmées.</p>
                </div>
              </div>

              <EstablishmentMissionHistoryList rows={rows} />
            </Card>
          )}
        </>
      )}
    </>
  );
}
