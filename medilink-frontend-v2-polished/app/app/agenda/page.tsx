'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementTone, conversationForApplication, latestAgreement, missionDateValue, sortByMissionDate } from '@/lib/candidate-workspace';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Profile } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toDateKey(value?: string | null) {
  if (!value) return 'undated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'undated';
  return date.toISOString().slice(0, 10);
}

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

export default function CandidateAgendaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
  const calendarAnchor = upcomingEvents.find((event) => event.date)?.date ? new Date(upcomingEvents.find((event) => event.date)!.date!) : new Date();
  const calendarDays = useMemo(() => buildCalendarDays(calendarAnchor), [calendarAnchor]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((event) => {
      const key = toDateKey(event.date);
      map.set(key, [...(map.get(key) || []), event]);
    });
    return map;
  }, [events]);

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
              <h2>{monthLabel(calendarAnchor)}</h2>
              <p className="small">Missions, propositions et candidatures datées.</p>
            </div>
            <LinkButton href="/app/missions" variant="light">Voir les missions</LinkButton>
          </div>

          <div className="agenda-calendar">
            {weekDays.map((day) => (
              <div key={day} className="agenda-weekday">{day}</div>
            ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsByDay.get(day.key) || [];
              return (
                <div key={day.key} className={`agenda-day ${day.inMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''}`}>
                  <div className="agenda-day-number">{day.date.getDate()}</div>
                  <div className="agenda-day-events">
                    {dayEvents.slice(0, 3).map(({ application, agreement }) => (
                      <div key={application.id} className={`agenda-event is-${agreementTone(agreement?.status)}`}>
                        <strong>{application.mission?.title || 'Mission'}</strong>
                        <span>{application.mission?.startTime || agreementLabel(agreement?.status)}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 ? <span className="agenda-more">+{dayEvents.length - 3}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="agenda-side">
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
