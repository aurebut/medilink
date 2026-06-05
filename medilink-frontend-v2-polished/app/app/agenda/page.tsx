'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementTone, conversationForApplication, dateKey, latestAgreement, missionDateValue, sortByMissionDate, weekDayLabels } from '@/lib/candidate-workspace';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Profile } from '@/lib/types';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState('');
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
    setDraftNote(notes[selectedDay] || '');
  }, [notes, selectedDay]);

  useEffect(() => {
    Promise.all([
      api.get<Profile>('/me/profile'),
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([p, a, c]) => {
      setProfile(p);
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

  const upcomingEvents = events.filter((event) => event.upcoming).slice(0, 8);
  const acceptedEvents = events.filter((event) => event.application.status === 'ACCEPTED');
  const proposalEvents = events.filter((event) => latestAgreement(event.conversation)?.status === 'PROPOSED');
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
    window.localStorage.setItem('medilink_candidate_agenda_notes', JSON.stringify(next));
  }

  function clearNote() {
    const next = { ...notes };
    delete next[selectedDay];
    setDraftNote('');
    setNotes(next);
    window.localStorage.setItem('medilink_candidate_agenda_notes', JSON.stringify(next));
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Vue opérationnelle des missions, propositions et disponibilités déclarées."
        actions={<LinkButton href="/app/profile" variant="light">Modifier mes disponibilités</LinkButton>}
      />

      <div className="grid-3 dashboard-stat-grid">
        <Card className="stat-card">
          <div className="stat">
            <span>Missions acceptées</span>
            <strong>{acceptedEvents.length}</strong>
            <div className="small">A placer dans votre planning.</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat">
            <span>Propositions à traiter</span>
            <strong>{proposalEvents.length}</strong>
            <div className="small">Réponse attendue dans la messagerie.</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat">
            <span>Prochains événements</span>
            <strong>{upcomingEvents.length}</strong>
            <div className="small">Missions ou candidatures datées.</div>
          </div>
        </Card>
      </div>

      <div className="agenda-workspace">
        <Card className="agenda-calendar-card">
          <div className="agenda-calendar-head">
            <div>
              <span>Calendrier</span>
              <h2>{monthLabel(calendarMonth)}</h2>
              <p className="small">Missions, propositions et candidatures datées.</p>
            </div>
            <div className="agenda-month-actions">
              <Button type="button" variant="light" onClick={() => setCalendarMonth((month) => addMonths(month, -1))}>Mois précédent</Button>
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  const today = new Date();
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDay(dateKey(today));
                }}
              >
                Aujourd’hui
              </Button>
              <Button type="button" variant="light" onClick={() => setCalendarMonth((month) => addMonths(month, 1))}>Mois suivant</Button>
            </div>
          </div>

          <div className="agenda-calendar">
            {weekDayLabels.map((day) => (
              <div key={day} className="agenda-weekday">{day}</div>
            ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsByDay.get(day.key) || [];
              const hasNote = Boolean(notes[day.key]);
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`agenda-day ${day.inMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${selectedDay === day.key ? 'selected' : ''}`}
                  onClick={() => setSelectedDay(day.key)}
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
        </Card>

        <div className="agenda-side">
          <Card className="agenda-detail-card">
            <div className="toolbar">
              <div>
                <h2>{selectedDate ? formatDate(selectedDate.toISOString()) : 'Jour sélectionné'}</h2>
                <p className="small">Détails, événements et note personnelle.</p>
              </div>
              <Badge tone={selectedEvents.length ? 'warning' : 'neutral'}>{selectedEvents.length} événement(s)</Badge>
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
              <label className="field">
                <span className="label">Note du jour</span>
                <Textarea
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder="Ex : appeler le secrétariat, préparer documents, indisponible l’après-midi..."
                />
              </label>
              <div className="actions">
                <Button type="button" onClick={saveNote}>Enregistrer la note</Button>
                {notes[selectedDay] ? <Button type="button" variant="light" onClick={clearNote}>Effacer</Button> : null}
              </div>
            </div>
          </Card>

          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Planning à venir</h2>
                <p className="small">Les prochaines dates à surveiller.</p>
              </div>
            </div>
            {upcomingEvents.length > 0 ? (
            <div className="timeline-list">
              {upcomingEvents.slice(0, 5).map(({ application, conversation, agreement, date }) => (
                <div key={application.id} className="timeline-item">
                  <div className="timeline-date">
                    <strong>{formatDate(date)}</strong>
                    <span>{application.mission?.startTime || 'Horaire à confirmer'}</span>
                  </div>
                  <div className="timeline-content">
                    <div className="toolbar compact">
                      <div>
                        <h3>{application.mission?.title || 'Mission'}</h3>
                        <p className="small">{application.mission?.establishment?.name || application.mission?.city || 'Etablissement à confirmer'}</p>
                      </div>
                      <Badge tone={agreementTone(agreement?.status)}>{agreement ? agreementLabel(agreement.status) : statusLabel(application.status)}</Badge>
                    </div>
                    <div className="actions">
                      {conversation ? <LinkButton href="/app/messages" variant="light">Messagerie</LinkButton> : null}
                      {application.missionId ? <LinkButton href={`/app/missions/${application.missionId}`} variant="secondary">Voir la mission</LinkButton> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
            <EmptyState
              title="Aucune date à venir"
              description="Les missions acceptées et candidatures datées apparaîtront ici."
              action={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
            />
            )}
          </Card>

          <Card className="dashboard-panel">
            <h2>Disponibilités</h2>
            <div className="dashboard-feature">
              <span>Notes actuelles</span>
              <strong>{profile?.availabilityNotes || 'Non renseignées'}</strong>
              <p>Cette information vient du profil candidat. Une prochaine version pourra gérer des créneaux précis.</p>
            </div>
          </Card>

          <Card className="dashboard-panel">
            <h2>Priorités agenda</h2>
            <div className="dashboard-mini-list">
              <div><span>Répondre aux propositions</span><Badge tone={proposalEvents.length ? 'warning' : 'success'}>{proposalEvents.length}</Badge></div>
              <div><span>Préparer les missions confirmées</span><Badge tone={acceptedEvents.length ? 'warning' : 'neutral'}>{acceptedEvents.length}</Badge></div>
              <div><span>Compléter les indisponibilités</span><Badge tone={profile?.availabilityNotes ? 'success' : 'warning'}>{profile?.availabilityNotes ? 'OK' : 'A faire'}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
