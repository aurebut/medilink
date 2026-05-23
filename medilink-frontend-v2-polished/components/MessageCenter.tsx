'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, getApiEventUrl } from '@/lib/api';
import type { Conversation, Message } from '@/lib/types';
import { formatCompensation, formatDate, formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Textarea } from './ui';
import { useAuth } from './AuthProvider';

const WORKFLOW_PREFIX = '__MEDILINK_WORKFLOW__';

type ConversationWithLast = Conversation & { messages?: Message[] };
type ChatMessage = Message & { localStatus?: 'pending' };
type RealtimeEvent = {
  type: 'message.created';
  conversationId: string;
  message: Message;
};
type WorkflowKind =
  | 'FINAL_PROPOSAL'
  | 'PAYMENT_REQUIRED'
  | 'PROPOSAL_REJECTED'
  | 'FUNDS_SECURED'
  | 'MISSION_COMPLETED'
  | 'PAYMENT_RELEASED'
  | 'INVOICES_GENERATED';

type ProposalPayload = {
  compensationMode?: string;
  amount?: number;
  currency?: string;
  retrocessionPercentage?: number | null;
  startDate?: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string;
};

type WorkflowPayload = {
  kind: WorkflowKind;
  proposal?: ProposalPayload;
};

type ProposalForm = {
  compensationMode: string;
  amount: string;
  currency: string;
  retrocessionPercentage: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notes: string;
};

function parseWorkflow(message: Message): WorkflowPayload | null {
  if (message.messageType !== 'SYSTEM' || !message.body.startsWith(WORKFLOW_PREFIX)) return null;
  try {
    return JSON.parse(message.body.slice(WORKFLOW_PREFIX.length)) as WorkflowPayload;
  } catch {
    return null;
  }
}

function isRecruiterRole(role?: string) {
  return Boolean(role && role !== 'CANDIDATE');
}

function createClientRequestId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  const byClientRequest = new Map<string, ChatMessage>();

  [...current, ...incoming].forEach((message) => {
    const clientKey = message.clientRequestId
      ? `${message.conversationId}:${message.senderUserId}:${message.clientRequestId}`
      : null;
    const existing = clientKey ? byClientRequest.get(clientKey) : null;

    if (existing) {
      const preferred = existing.localStatus === 'pending' && message.localStatus !== 'pending' ? message : existing;
      byId.delete(existing.id);
      byId.set(preferred.id, preferred);
      byClientRequest.set(clientKey!, preferred);
      return;
    }

    byId.set(message.id, message);
    if (clientKey) byClientRequest.set(clientKey, message);
  });

  return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function workflowLabel(kind: WorkflowKind) {
  const labels: Record<WorkflowKind, string> = {
    FINAL_PROPOSAL: 'Proposition finale',
    PAYMENT_REQUIRED: 'Confirmation requise',
    PROPOSAL_REJECTED: 'Proposition refusée',
    FUNDS_SECURED: 'Mission confirmée',
    MISSION_COMPLETED: 'Mission terminée',
    PAYMENT_RELEASED: 'Rétrocession validée',
    INVOICES_GENERATED: 'Factures générées',
  };
  return labels[kind];
}

export function MessageCenter() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 620px)').matches : false
  ));
  const [conversations, setConversations] = useState<ConversationWithLast[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposal, setProposal] = useState<ProposalForm>({
    compensationMode: 'RETROCESSION',
    amount: '',
    currency: 'EUR',
    retrocessionPercentage: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const sendingMessageRef = useRef(false);
  activeIdRef.current = activeId;

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);
  const workflows = useMemo(() => messages.map((m) => ({ message: m, workflow: parseWorkflow(m) })).filter((x) => x.workflow), [messages]);
  const lastProposal = useMemo(
    () => [...workflows].reverse().find((x) => x.workflow?.kind === 'FINAL_PROPOSAL') || null,
    [workflows],
  );
  const state = useMemo(() => {
    const kinds = workflows.map((x) => x.workflow?.kind);
    return {
      hasProposal: kinds.includes('FINAL_PROPOSAL'),
      paymentRequired: kinds.includes('PAYMENT_REQUIRED'),
      fundsSecured: kinds.includes('FUNDS_SECURED'),
      rejected: kinds.includes('PROPOSAL_REJECTED'),
      completed: kinds.includes('MISSION_COMPLETED'),
      released: kinds.includes('PAYMENT_RELEASED'),
      invoices: kinds.includes('INVOICES_GENERATED'),
    };
  }, [workflows]);

  const recruiter = isRecruiterRole(user?.role);
  const candidate = user?.role === 'CANDIDATE';
  const currentRetrocession = lastProposal?.workflow?.proposal?.compensationMode === 'RETROCESSION';
  const currentStatus = state.invoices
    ? 'Factures disponibles'
    : state.released
      ? currentRetrocession ? 'Rétrocession validée' : 'Paiement libéré'
      : state.completed
        ? 'Mission terminée'
        : state.fundsSecured
          ? 'Mission confirmée'
          : state.paymentRequired
            ? 'Confirmation requise'
          : state.rejected
            ? 'Proposition refusée'
            : state.hasProposal
              ? 'Proposition envoyée'
              : 'Discussion';

  async function loadConversations() {
    try {
      const data = await api.get<ConversationWithLast[]>('/conversations');
      setConversations(data);
      if (!activeId && data[0] && !isMobile) setActiveId(data[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id: string) {
    try {
      const data = await api.get<Message[]>(`/conversations/${id}/messages`);
      if (activeIdRef.current === id) {
        setMessages((prev) => mergeMessages(prev, data));
      }
      await api.post(`/conversations/${id}/read`, {});
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 620px)');
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!isMobile && !activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [isMobile, activeId, conversations]);
  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    void loadMessages(activeId);
    const current = conversations.find((c) => c.id === activeId);
    setProposal({
      compensationMode: current?.mission?.compensationMode || 'RETROCESSION',
      amount: current?.mission?.compensationAmount ? String(current.mission.compensationAmount) : '',
      currency: current?.mission?.compensationCurrency || 'EUR',
      retrocessionPercentage: current?.mission?.retrocessionPercentage ? String(current.mission.retrocessionPercentage) : '',
      startDate: current?.mission?.startDate ? current.mission.startDate.slice(0, 10) : '',
      endDate: current?.mission?.endDate ? current.mission.endDate.slice(0, 10) : '',
      startTime: current?.mission?.startTime || '',
      endTime: current?.mission?.endTime || '',
      notes: '',
    });
  }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeId, messages.length]);
  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState !== 'visible') return;
      void refresh();
    }

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [activeId]);
  useEffect(() => {
    const source = new EventSource(getApiEventUrl('/conversations/events'), { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeEvent;
        if (payload.type !== 'message.created') return;

        if (activeIdRef.current === payload.conversationId) {
          setMessages((prev) => mergeMessages(prev, [payload.message]));
          void api.post(`/conversations/${payload.conversationId}/read`, {});
        }

        api.get<ConversationWithLast[]>('/conversations')
          .then(setConversations)
          .catch((e: any) => setError(e.message));
      } catch {
        // Ignore malformed realtime payloads; the next focus refresh will recover state.
      }
    };

    return () => source.close();
  }, []);

  async function refresh() {
    if (activeId) await loadMessages(activeId);
    await loadConversations();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const messageBody = body.trim();
    if (!activeId || !messageBody || sendingMessageRef.current) return;

    const conversationId = activeId;
    const clientRequestId = createClientRequestId();
    const pendingMessage: ChatMessage = {
      id: `pending-${clientRequestId}`,
      conversationId,
      senderUserId: user?.id || '',
      clientRequestId,
      body: messageBody,
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
      localStatus: 'pending',
    };

    sendingMessageRef.current = true;
    setSendingMessage(true);
    setError(null);
    setBody('');
    setMessages((prev) => mergeMessages(prev, [pendingMessage]));
    try {
      const created = await api.post<Message>(`/conversations/${conversationId}/messages`, { body: messageBody, clientRequestId });
      if (activeIdRef.current === conversationId) {
        setMessages((prev) => mergeMessages(prev, [created]));
      }
      await loadConversations();
    } catch (e: any) {
      setMessages((prev) => prev.filter((message) => message.clientRequestId !== clientRequestId));
      if (activeIdRef.current === conversationId) setBody(messageBody);
      setError(e.message);
    } finally {
      sendingMessageRef.current = false;
      setSendingMessage(false);
    }
  }

  async function submitProposal(e: FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setBusyAction('proposal');
    setError(null);
    try {
      await api.post(`/conversations/${activeId}/proposal`, {
        compensationMode: 'RETROCESSION',
        amount: undefined,
        currency: proposal.currency || 'EUR',
        retrocessionPercentage: proposal.retrocessionPercentage ? Number(proposal.retrocessionPercentage) : undefined,
        startDate: proposal.startDate || undefined,
        endDate: proposal.endDate || undefined,
        startTime: proposal.startTime || undefined,
        endTime: proposal.endTime || undefined,
        notes: proposal.notes || undefined,
      });
      setProposalOpen(false);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(action: string, path: string) {
    if (!activeId) return;
    setBusyAction(action);
    setError(null);
    try {
      await api.post(`/conversations/${activeId}${path}`, {});
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyAction(null);
    }
  }

  function downloadInvoice(kind: 'recruiter' | 'candidate') {
    if (!active || !lastProposal?.workflow?.proposal) return;
    const p = lastProposal.workflow.proposal;
    const title = kind === 'recruiter' ? 'Facture établissement' : 'Justificatif candidat';
    const content = [
      title,
      '',
      `Mission: ${active.mission?.title || ''}`,
      `Établissement: ${active.establishment?.name || ''}`,
      `Ville: ${active.mission?.city || ''}`,
      `Date: ${p.startDate ? formatDate(p.startDate) : ''}`,
      `Horaire: ${p.startTime || ''}${p.endTime ? ` - ${p.endTime}` : ''}`,
      `Rémunération: ${formatCompensation({
        compensationMode: p.compensationMode,
        retrocessionPercentage: p.retrocessionPercentage,
        compensationAmount: p.amount,
        compensationCurrency: p.currency || 'EUR',
      })}`,
      '',
      kind === 'recruiter'
        ? 'Document généré après validation de fin de mission et confirmation du paiement.'
        : 'Document généré pour le candidat après confirmation du paiement.',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'recruiter' ? 'facture-etablissement.txt' : 'justificatif-candidat.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Card><p className="muted">Chargement des conversations...</p></Card>;
  if (conversations.length === 0) {
    return <EmptyState title="Aucune conversation" description="Les conversations sont créées automatiquement lorsqu'un candidat postule à une mission." />;
  }

  const showConversationList = !isMobile || !activeId;
  const showMessagePane = !isMobile || Boolean(activeId);

  return (
    <div className={`message-layout ${isMobile ? 'message-layout-mobile' : ''} ${isMobile && activeId ? 'message-layout-mobile-active' : ''}`}>
      {showConversationList ? <Card className="conversation-list">
        <div className="toolbar">
          <div>
            <h2>Conversations</h2>
            <div className="small">{conversations.length} échange(s)</div>
          </div>
        </div>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="conversation-items">
          {conversations.map((conv) => {
            const last = conv.messages?.[0];
            return (
              <button
                key={conv.id}
                className={`conversation-button ${conv.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(conv.id)}
              >
                <strong>{conv.establishment?.name || conv.mission?.title || 'Conversation'}</strong>
                <div className="small">{conv.mission?.title}</div>
                <div className="small">{last?.body.startsWith(WORKFLOW_PREFIX) ? 'Mise à jour du suivi' : last?.body || 'Aucun message'} - {formatDateTime(conv.lastMessageAt)}</div>
              </button>
            );
          })}
        </div>
      </Card> : null}

      {showMessagePane ? <Card className="message-pane">
        <div className="toolbar">
          <div className="message-heading">
            {isMobile ? (
              <Button type="button" variant="light" className="mobile-conversation-back" onClick={() => setActiveId(null)}>
                Retour
              </Button>
            ) : null}
            <div>
              <h2>{active?.mission?.title || 'Conversation'}</h2>
              <div className="small">{active?.establishment?.name} - {active?.mission?.city}</div>
            </div>
          </div>
          <Badge tone={state.rejected ? 'danger' : state.fundsSecured || state.released ? 'success' : 'neutral'}>{currentStatus}</Badge>
        </div>

        <div className="messages">
          {recruiter && !state.paymentRequired && !state.fundsSecured && !state.rejected ? (
            <WorkflowComposer
              open={proposalOpen}
              proposal={proposal}
              disabled={busyAction === 'proposal'}
              hasProposal={state.hasProposal}
              onOpen={() => setProposalOpen(true)}
              onCancel={() => setProposalOpen(false)}
              onChange={(next) => setProposal((prev) => ({ ...prev, ...next }))}
              onSubmit={submitProposal}
            />
          ) : null}

          {messages.map((m) => {
            const workflow = parseWorkflow(m);
            if (workflow) {
              return (
                <WorkflowMessageCard
                  key={m.id}
                  workflow={workflow}
                  createdAt={m.createdAt}
                  active={active}
                  candidateCanAnswer={candidate && workflow.kind === 'FINAL_PROPOSAL' && !state.paymentRequired && !state.fundsSecured && !state.rejected}
                  recruiterCanSecure={recruiter && workflow.kind === 'PAYMENT_REQUIRED' && !state.fundsSecured}
                  recruiterCanComplete={recruiter && workflow.kind === 'FUNDS_SECURED' && !state.completed}
                  recruiterCanPay={recruiter && workflow.kind === 'MISSION_COMPLETED' && !state.released}
                  canGenerateInvoices={workflow.kind === 'PAYMENT_RELEASED' && !state.invoices}
                  canDownloadInvoices={workflow.kind === 'INVOICES_GENERATED'}
                  busyAction={busyAction}
                  onAccept={() => runAction('accept', '/proposal/accept')}
                  onReject={() => runAction('reject', '/proposal/reject')}
                  onSecure={() => runAction('secure', '/payment/secure')}
                  onComplete={() => runAction('complete', '/mission/complete')}
                  onPay={() => runAction('pay', '/payment/release')}
                  onGenerateInvoices={() => runAction('invoices', '/invoices/generate')}
                  onDownloadRecruiter={() => downloadInvoice('recruiter')}
                  onDownloadCandidate={() => downloadInvoice('candidate')}
                />
              );
            }

            const mine = m.senderUserId === user?.id;
            const system = m.messageType === 'SYSTEM';
            return (
              <div key={m.id} className={`message ${mine ? 'mine' : ''} ${system ? 'system' : ''} ${m.localStatus === 'pending' ? 'pending' : ''}`}>
                <div>{m.body}</div>
                <div className="small">{m.localStatus === 'pending' ? 'Envoi...' : formatDateTime(m.createdAt)}</div>
              </div>
            );
          })}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        <form className="message-form" onSubmit={send}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écrire un message..." disabled={sendingMessage} />
          <Button disabled={sendingMessage || !body.trim()}>{sendingMessage ? 'Envoi...' : 'Envoyer'}</Button>
        </form>
      </Card> : null}
    </div>
  );
}

function WorkflowComposer({
  open,
  proposal,
  disabled,
  hasProposal,
  onOpen,
  onCancel,
  onChange,
  onSubmit,
}: {
  open: boolean;
  proposal: ProposalForm;
  disabled: boolean;
  hasProposal: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onChange: (next: Partial<ProposalForm>) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) {
    return (
      <div className="workflow-card">
        <div>
          <Badge>{hasProposal ? 'Proposition envoyée' : 'Prochaine étape'}</Badge>
          <h3>{hasProposal ? 'Envoyer une nouvelle proposition finale' : 'Formaliser une proposition finale'}</h3>
          <p>La proposition apparaîtra dans le fil avec les boutons d'acceptation côté candidat.</p>
        </div>
        <div className="actions">
          <Button onClick={onOpen}>{hasProposal ? 'Modifier la proposition' : 'Envoyer une proposition'}</Button>
        </div>
      </div>
    );
  }

  return (
    <form className="workflow-card workflow-form" onSubmit={onSubmit}>
      <div>
        <Badge>Proposition finale</Badge>
        <h3>Détails de l'accord</h3>
      </div>
      <Field label="Pourcentage de rétrocession">
        <Input type="number" min="1" max="100" required value={proposal.retrocessionPercentage} onChange={(e) => onChange({ retrocessionPercentage: e.target.value })} />
      </Field>
      <div className="form-row">
        <Field label="Date début">
          <Input type="date" value={proposal.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </Field>
        <Field label="Date fin">
          <Input type="date" value={proposal.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Heure début">
          <Input type="time" value={proposal.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </Field>
        <Field label="Heure fin">
          <Input type="time" value={proposal.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </Field>
      </div>
      <Field label="Conditions / notes">
        <Textarea value={proposal.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Consignes, contact sur place, conditions particulières..." />
      </Field>
      <div className="actions">
        <Button disabled={disabled}>{disabled ? 'Envoi...' : 'Publier dans le chat'}</Button>
        <Button type="button" variant="light" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

function WorkflowMessageCard({
  workflow,
  createdAt,
  active,
  candidateCanAnswer,
  recruiterCanSecure,
  recruiterCanComplete,
  recruiterCanPay,
  canGenerateInvoices,
  canDownloadInvoices,
  busyAction,
  onAccept,
  onReject,
  onSecure,
  onComplete,
  onPay,
  onGenerateInvoices,
  onDownloadRecruiter,
  onDownloadCandidate,
}: {
  workflow: WorkflowPayload;
  createdAt: string;
  active: ConversationWithLast | null;
  candidateCanAnswer: boolean;
  recruiterCanSecure: boolean;
  recruiterCanComplete: boolean;
  recruiterCanPay: boolean;
  canGenerateInvoices: boolean;
  canDownloadInvoices: boolean;
  busyAction: string | null;
  onAccept: () => void;
  onReject: () => void;
  onSecure: () => void;
  onComplete: () => void;
  onPay: () => void;
  onGenerateInvoices: () => void;
  onDownloadRecruiter: () => void;
  onDownloadCandidate: () => void;
}) {
  const proposal = workflow.proposal;
  const retrocession = proposal?.compensationMode === 'RETROCESSION';

  return (
    <div className="workflow-card">
      <div className="workflow-card-head">
        <Badge tone={workflow.kind === 'PROPOSAL_REJECTED' ? 'danger' : workflow.kind === 'FINAL_PROPOSAL' ? 'warning' : 'success'}>
          {workflowLabel(workflow.kind)}
        </Badge>
        <span className="small">{formatDateTime(createdAt)}</span>
      </div>

      {workflow.kind === 'FINAL_PROPOSAL' && proposal ? (
        <>
          <h3>{active?.mission?.title || 'Mission'}</h3>
          <div className="workflow-summary">
            <div><span>Rémunération</span><strong>{formatCompensation({
              compensationMode: proposal.compensationMode,
              retrocessionPercentage: proposal.retrocessionPercentage,
              compensationAmount: proposal.amount,
              compensationCurrency: proposal.currency || 'EUR',
            })}</strong></div>
            <div><span>Date</span><strong>{proposal.startDate ? formatDate(proposal.startDate) : '-'}</strong></div>
            <div><span>Horaire</span><strong>{proposal.startTime || '-'} {proposal.endTime ? `- ${proposal.endTime}` : ''}</strong></div>
            <div><span>Modalité</span><strong>{retrocession ? 'Rétrocession après encaissement' : 'Bloqué par Medilink'}</strong></div>
          </div>
          {proposal.notes ? <p>{proposal.notes}</p> : null}
          {candidateCanAnswer ? (
            <div className="actions">
              <Button variant="success" disabled={Boolean(busyAction)} onClick={onAccept}>{busyAction === 'accept' ? 'Acceptation...' : 'Accepter'}</Button>
              <Button variant="danger" disabled={Boolean(busyAction)} onClick={onReject}>{busyAction === 'reject' ? 'Refus...' : 'Refuser'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'PAYMENT_REQUIRED' ? (
        <>
          <h3>{retrocession ? 'Accord accepté' : 'Paiement requis'}</h3>
          <p>{retrocession ? "Le candidat a accepté la rétrocession d'honoraires. Le recruteur peut confirmer la mission et suivre le règlement selon les honoraires encaissés." : "Le candidat a accepté. Le recruteur doit payer maintenant pour confirmer la mission ; Medilink conserve les fonds jusqu'à la fin."}</p>
          {recruiterCanSecure ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onSecure}>{busyAction === 'secure' ? 'Confirmation...' : retrocession ? 'Confirmer la mission' : 'Payer et confirmer'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'PROPOSAL_REJECTED' ? (
        <>
          <h3>Proposition refusée</h3>
          <p>La proposition finale a été refusée. Le recruteur peut discuter avec le candidat puis envoyer une nouvelle proposition.</p>
        </>
      ) : null}

      {workflow.kind === 'FUNDS_SECURED' ? (
        <>
          <h3>Mission confirmée</h3>
          <p>{retrocession ? "La mission est confirmée avec une rémunération en rétrocession d'honoraires." : "Le paiement du recruteur est sécurisé par Medilink. Les fonds seront libérés au candidat après validation de la fin de mission."}</p>
          {recruiterCanComplete ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onComplete}>{busyAction === 'complete' ? 'Validation...' : 'Marquer la mission terminée'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'MISSION_COMPLETED' ? (
        <>
          <h3>Mission terminée</h3>
          <p>{retrocession ? "La fin de mission a été validée. La rétrocession d'honoraires peut maintenant être confirmée." : 'La fin de mission a été validée. Le paiement sécurisé peut maintenant être libéré au candidat.'}</p>
          {recruiterCanPay ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onPay}>{busyAction === 'pay' ? 'Validation...' : retrocession ? 'Valider la rétrocession' : 'Libérer le paiement'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'PAYMENT_RELEASED' ? (
        <>
          <h3>{retrocession ? 'Rétrocession validée' : 'Paiement libéré'}</h3>
          <p>{retrocession ? "La rétrocession d'honoraires a été validée. Les justificatifs peuvent être générés." : 'Les fonds ont été libérés au candidat. Les factures et justificatifs peuvent être générés.'}</p>
          {canGenerateInvoices ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onGenerateInvoices}>{busyAction === 'invoices' ? 'Génération...' : 'Générer les factures'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'INVOICES_GENERATED' ? (
        <>
          <h3>Factures disponibles</h3>
          <p>Les documents de fin de mission sont disponibles pour les deux parties.</p>
          {canDownloadInvoices ? (
            <div className="actions">
              <Button variant="light" onClick={onDownloadRecruiter}>Facture recruteur</Button>
              <Button variant="light" onClick={onDownloadCandidate}>Justificatif candidat</Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
