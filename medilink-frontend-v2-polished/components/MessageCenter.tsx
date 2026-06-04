'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, getApiEventUrl, getApiUrl, getAuthToken } from '@/lib/api';
import type { Conversation, Message, Profile } from '@/lib/types';
import { formatCompensation, formatDate, formatDateTime } from '@/lib/format';
import { candidateContractedArticle, candidateHas, candidateWithArticle } from '@/lib/grammar';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingCard, Textarea } from './ui';
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

type InvoicePayload = {
  id: string;
  type: 'RECRUITER_INVOICE' | 'CANDIDATE_RECEIPT';
  number: string;
  amount: number;
  currency: string;
  issuedAt: string;
};

type WorkflowPayload = {
  kind: WorkflowKind;
  proposal?: ProposalPayload;
  invoices?: InvoicePayload[];
};

type MobileWorkflowOption = {
  label: string;
  description: string;
  busyLabel?: string;
  tone?: 'primary' | 'light' | 'danger' | 'success';
  disabled?: boolean;
  busy?: boolean;
  onSelect: () => void;
};

type MobileTimelineStep = {
  key: string;
  title: string;
  description: string;
  status: 'done' | 'current' | 'waiting' | 'locked' | 'rejected';
  options?: MobileWorkflowOption[];
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
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
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
  const activeCandidateProfile = active?.application?.candidate?.profile;
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
    setMobileOptionsOpen(false);
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
    if (!isMobile) setMobileOptionsOpen(false);
  }, [isMobile]);
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

  async function downloadInvoice(kind: 'recruiter' | 'candidate') {
    if (!activeId) return;
    setBusyAction(`download-${kind}`);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${activeId}/invoices/${kind}.pdf`), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Téléchargement de la facture impossible.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] || (kind === 'recruiter' ? 'facture-etablissement.pdf' : 'justificatif-candidat.pdf');
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) return <LoadingCard label="Chargement des conversations..." />;
  if (conversations.length === 0) {
    return <EmptyState title="Aucune conversation" description="Les conversations sont creees automatiquement quand une candidature est envoyee." />;
  }

  const showConversationList = !isMobile || !activeId;
  const showMessagePane = !isMobile || Boolean(activeId);
  const candidateCanAnswerLatest = candidate && Boolean(lastProposal) && !state.paymentRequired && !state.fundsSecured && !state.rejected;
  const proposalAction: MobileWorkflowOption = {
    label: state.rejected ? 'Nouvelle proposition' : state.hasProposal ? 'Modifier la proposition' : 'Envoyer une proposition',
    description: 'Préparer les conditions finales dans la conversation.',
    busy: busyAction === 'proposal',
    busyLabel: 'Préparation...',
    onSelect: () => setProposalOpen(true),
  };
  const acceptAction: MobileWorkflowOption = {
    label: 'Accepter',
    description: 'Valider les conditions finales.',
    tone: 'success',
    disabled: Boolean(busyAction),
    busy: busyAction === 'accept',
    busyLabel: 'Acceptation...',
    onSelect: () => runAction('accept', '/proposal/accept'),
  };
  const rejectAction: MobileWorkflowOption = {
    label: 'Refuser',
    description: 'Continuer l’échange dans le chat.',
    tone: 'danger',
    disabled: Boolean(busyAction),
    busy: busyAction === 'reject',
    busyLabel: 'Refus...',
    onSelect: () => runAction('reject', '/proposal/reject'),
  };
  const refreshAction: MobileWorkflowOption = {
    label: 'Actualiser',
    description: 'Recharger les messages et le suivi.',
    tone: 'light',
    disabled: Boolean(busyAction),
    onSelect: () => void refresh(),
  };
  const workflowTimelineSteps: MobileTimelineStep[] = [
    {
      key: 'proposal',
      title: 'Proposition',
      description: state.rejected
        ? 'La dernière proposition a été refusée.'
        : state.hasProposal
          ? 'Les conditions ont été envoyées.'
          : recruiter
            ? 'Préparez les conditions finales.'
            : 'En attente de la proposition.',
      status: state.rejected ? 'rejected' : state.hasProposal ? 'done' : 'current',
      options: recruiter && !state.paymentRequired && !state.fundsSecured ? [proposalAction] : undefined,
    },
    {
      key: 'agreement',
      title: 'Accord candidat',
      description: state.rejected
        ? 'Il faut échanger puis renvoyer une proposition.'
        : state.paymentRequired || state.fundsSecured || state.completed || state.released || state.invoices
          ? 'La proposition est acceptée.'
          : state.hasProposal
            ? candidate
              ? 'Vous pouvez accepter ou refuser.'
              : 'En attente de réponse du candidat.'
            : 'Visible après la proposition.',
      status: state.rejected
        ? 'locked'
        : state.paymentRequired || state.fundsSecured || state.completed || state.released || state.invoices
          ? 'done'
          : state.hasProposal
            ? 'current'
            : 'locked',
      options: candidateCanAnswerLatest ? [acceptAction, rejectAction] : undefined,
    },
    {
      key: 'confirm',
      title: 'Confirmation',
      description: state.fundsSecured || state.completed || state.released || state.invoices
        ? 'La mission est confirmée.'
        : state.paymentRequired
          ? recruiter
            ? 'Confirmez la mission.'
            : 'En attente de confirmation par l’établissement.'
          : 'Disponible après acceptation.',
      status: state.fundsSecured || state.completed || state.released || state.invoices
        ? 'done'
        : state.paymentRequired
          ? 'current'
          : 'locked',
      options: state.paymentRequired && recruiter ? [{
        label: 'Confirmer la mission',
        description: 'Passer à l’étape suivante.',
        disabled: Boolean(busyAction),
        busy: busyAction === 'secure',
        busyLabel: 'Confirmation...',
        onSelect: () => runAction('secure', '/payment/secure'),
      }] : undefined,
    },
    {
      key: 'complete',
      title: 'Fin de mission',
      description: state.completed || state.released || state.invoices
        ? 'La fin de mission est validée.'
        : state.fundsSecured
          ? recruiter
            ? 'Marquez la prestation réalisée.'
            : 'En attente de validation de fin de mission.'
          : 'Disponible après confirmation.',
      status: state.completed || state.released || state.invoices
        ? 'done'
        : state.fundsSecured
          ? 'current'
          : 'locked',
      options: state.fundsSecured && recruiter ? [{
        label: 'Marquer terminée',
        description: 'Valider la prestation.',
        disabled: Boolean(busyAction),
        busy: busyAction === 'complete',
        busyLabel: 'Validation...',
        onSelect: () => runAction('complete', '/mission/complete'),
      }] : undefined,
    },
    {
      key: 'release',
      title: 'Rétrocession',
      description: state.released || state.invoices
        ? 'La rétrocession est validée.'
        : state.completed
          ? recruiter
            ? 'Validez la rétrocession.'
            : 'En attente de validation par l’établissement.'
          : 'Disponible après fin de mission.',
      status: state.released || state.invoices
        ? 'done'
        : state.completed
          ? 'current'
          : 'locked',
      options: state.completed && recruiter ? [{
        label: 'Valider',
        description: 'Débloquer les justificatifs.',
        disabled: Boolean(busyAction),
        busy: busyAction === 'pay',
        busyLabel: 'Validation...',
        onSelect: () => runAction('pay', '/payment/release'),
      }] : undefined,
    },
    {
      key: 'invoices',
      title: 'Factures',
      description: state.invoices
        ? 'Les PDF sont disponibles.'
        : state.released
          ? 'Les PDF peuvent être générés.'
          : 'Disponibles en fin de parcours.',
      status: state.invoices ? 'done' : state.released ? 'current' : 'locked',
      options: state.invoices
        ? [
            {
              label: 'Facture recruteur',
              description: 'PDF établissement.',
              tone: 'light',
              disabled: Boolean(busyAction),
              busy: busyAction === 'download-recruiter',
              busyLabel: 'Téléchargement...',
              onSelect: () => void downloadInvoice('recruiter'),
            },
            {
              label: 'Justificatif candidat',
              description: 'PDF candidat.',
              tone: 'light',
              disabled: Boolean(busyAction),
              busy: busyAction === 'download-candidate',
              busyLabel: 'Téléchargement...',
              onSelect: () => void downloadInvoice('candidate'),
            },
          ]
        : state.released
          ? [{
              label: 'Générer les factures',
              description: 'Créer les PDF.',
              disabled: Boolean(busyAction),
              busy: busyAction === 'invoices',
              busyLabel: 'Génération...',
              onSelect: () => runAction('invoices', '/invoices/generate'),
            }]
          : undefined,
    },
  ];

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
          <div className="message-toolbar-actions">
            <Badge tone={state.rejected ? 'danger' : state.fundsSecured || state.released ? 'success' : 'neutral'}>{currentStatus}</Badge>
            {isMobile ? (
              <Button
                type="button"
                variant="light"
                className="mobile-workflow-toggle"
                aria-expanded={mobileOptionsOpen}
                onClick={() => setMobileOptionsOpen((open) => !open)}
              >
                Options
              </Button>
            ) : null}
          </div>
        </div>

        {isMobile && mobileOptionsOpen ? (
          <MobileWorkflowMenu
            status={currentStatus}
            steps={workflowTimelineSteps}
            refreshAction={refreshAction}
            onClose={() => setMobileOptionsOpen(false)}
          />
        ) : null}

        {!isMobile ? (
          <DesktopWorkflowTimeline
            steps={workflowTimelineSteps}
            refreshAction={refreshAction}
          />
        ) : null}

        <div className="messages">
          {recruiter && !state.paymentRequired && !state.fundsSecured ? (
            <WorkflowComposer
              open={proposalOpen}
              proposal={proposal}
              disabled={busyAction === 'proposal'}
              hasProposal={state.hasProposal}
              onOpen={() => setProposalOpen(true)}
              onCancel={() => setProposalOpen(false)}
              onChange={(next) => setProposal((prev) => ({ ...prev, ...next }))}
              onSubmit={submitProposal}
              candidateLabel={candidateWithArticle(activeCandidateProfile)}
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
                  candidateProfile={activeCandidateProfile}
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
                  onDownloadRecruiter={() => void downloadInvoice('recruiter')}
                  onDownloadCandidate={() => void downloadInvoice('candidate')}
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
  candidateLabel,
}: {
  open: boolean;
  proposal: ProposalForm;
  disabled: boolean;
  hasProposal: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onChange: (next: Partial<ProposalForm>) => void;
  onSubmit: (e: FormEvent) => void;
  candidateLabel: string;
}) {
  if (!open) {
    return (
      <div className="workflow-card workflow-composer-card workflow-composer-prompt">
        <div>
          <Badge>{hasProposal ? 'Proposition envoyée' : 'Prochaine étape'}</Badge>
          <h3>{hasProposal ? 'Envoyer une nouvelle proposition finale' : 'Formaliser une proposition finale'}</h3>
          <p>La proposition apparaitra dans le fil avec les boutons d'acceptation cote {candidateLabel}.</p>
        </div>
        <div className="actions">
          <Button onClick={onOpen}>{hasProposal ? 'Modifier la proposition' : 'Envoyer une proposition'}</Button>
        </div>
      </div>
    );
  }

  return (
    <form className="workflow-card workflow-form workflow-composer-card" onSubmit={onSubmit}>
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

function MobileWorkflowMenu({
  status,
  steps,
  refreshAction,
  onClose,
}: {
  status: string;
  steps: MobileTimelineStep[];
  refreshAction: MobileWorkflowOption;
  onClose: () => void;
}) {
  return (
    <div className="mobile-workflow-menu">
      <div className="mobile-workflow-menu-head">
        <div>
          <span>Suivi</span>
          <strong>{status}</strong>
        </div>
        <button type="button" className="mobile-workflow-close" aria-label="Fermer les options" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="mobile-workflow-timeline">
        {steps.map((step) => (
          <div key={step.key} className={`mobile-timeline-step is-${step.status}`}>
            <div className="mobile-timeline-marker" aria-hidden="true" />
            <div className="mobile-timeline-content">
              <div className="mobile-timeline-title">
                <strong>{step.title}</strong>
                <span>{timelineStatusLabel(step.status)}</span>
              </div>
              <p>{step.description}</p>
              {step.options?.length ? (
                <div className="mobile-workflow-options">
                  {step.options.map((option) => (
                    <MobileWorkflowOptionButton key={option.label} option={option} onClose={onClose} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mobile-workflow-footer">
        <MobileWorkflowOptionButton option={refreshAction} onClose={onClose} />
      </div>
    </div>
  );
}

function timelineStatusLabel(status: MobileTimelineStep['status']) {
  const labels: Record<MobileTimelineStep['status'], string> = {
    done: 'Fait',
    current: 'En cours',
    waiting: 'Attente',
    locked: 'À venir',
    rejected: 'Refusé',
  };
  return labels[status];
}

function MobileWorkflowOptionButton({
  option,
  onClose,
}: {
  option: MobileWorkflowOption;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      className={`mobile-workflow-option ${option.tone ? `is-${option.tone}` : ''}`}
      disabled={option.disabled || option.busy}
      onClick={() => {
        onClose();
        option.onSelect();
      }}
    >
      <strong>{option.busy && option.busyLabel ? option.busyLabel : option.label}</strong>
      <span>{option.description}</span>
    </button>
  );
}

function DesktopWorkflowTimeline({
  steps,
  refreshAction,
}: {
  steps: MobileTimelineStep[];
  refreshAction: MobileWorkflowOption;
}) {
  return (
    <div className="desktop-workflow-timeline" aria-label="Suivi de mission">
      <div className="desktop-workflow-head">
        <div>
          <span>Parcours de mission</span>
          <strong>Suivi opérationnel</strong>
        </div>
        <button
          type="button"
          className="desktop-workflow-refresh-button"
          disabled={refreshAction.disabled || refreshAction.busy}
          onClick={refreshAction.onSelect}
        >
          {refreshAction.busy && refreshAction.busyLabel ? refreshAction.busyLabel : refreshAction.label}
        </button>
      </div>
      <div className="desktop-workflow-steps">
        {steps.map((step) => (
          <div key={step.key} className={`desktop-workflow-step is-${step.status}`}>
            <div className="desktop-workflow-marker" aria-hidden="true" />
            <div className="desktop-workflow-copy">
              <div className="desktop-workflow-title">
                <strong>{step.title}</strong>
                <span>{timelineStatusLabel(step.status)}</span>
              </div>
              <p>{step.description}</p>
              {step.options?.length ? (
                <div className="desktop-workflow-actions">
                  {step.options.map((option) => (
                    <MobileWorkflowOptionButton key={option.label} option={option} onClose={() => undefined} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowStepPanel({
  state,
  recruiter,
  busyAction,
  onSecure,
  onComplete,
  onPay,
  onGenerateInvoices,
  onDownloadRecruiter,
  onDownloadCandidate,
}: {
  state: {
    paymentRequired: boolean;
    fundsSecured: boolean;
    completed: boolean;
    released: boolean;
    invoices: boolean;
  };
  recruiter: boolean;
  busyAction: string | null;
  onSecure: () => void;
  onComplete: () => void;
  onPay: () => void;
  onGenerateInvoices: () => void;
  onDownloadRecruiter: () => void;
  onDownloadCandidate: () => void;
}) {
  if (state.invoices) {
    return (
      <div className="workflow-step-panel">
        <div>
          <strong>Factures disponibles</strong>
          <span>Les deux PDF de fin de mission sont prêts.</span>
        </div>
        <div className="actions">
          <Button variant="light" disabled={Boolean(busyAction)} onClick={onDownloadRecruiter}>
            {busyAction === 'download-recruiter' ? 'Téléchargement...' : 'Facture recruteur PDF'}
          </Button>
          <Button variant="light" disabled={Boolean(busyAction)} onClick={onDownloadCandidate}>
            {busyAction === 'download-candidate' ? 'Téléchargement...' : 'Justificatif candidat PDF'}
          </Button>
        </div>
      </div>
    );
  }

  if (state.released) {
    return (
      <div className="workflow-step-panel">
        <div>
          <strong>Rétrocession validée</strong>
          <span>Les factures PDF peuvent maintenant être générées.</span>
        </div>
        <Button disabled={Boolean(busyAction)} onClick={onGenerateInvoices}>
          {busyAction === 'invoices' ? 'Génération...' : 'Générer les factures PDF'}
        </Button>
      </div>
    );
  }

  if (state.completed) {
    return (
      <div className="workflow-step-panel">
        <div>
          <strong>Mission terminée</strong>
          <span>{recruiter ? 'Validez la rétrocession pour débloquer les factures.' : "En attente de validation de la rétrocession par l'établissement."}</span>
        </div>
        {recruiter ? (
          <Button disabled={Boolean(busyAction)} onClick={onPay}>
            {busyAction === 'pay' ? 'Validation...' : 'Valider la rétrocession'}
          </Button>
        ) : null}
      </div>
    );
  }

  if (state.fundsSecured) {
    return (
      <div className="workflow-step-panel">
        <div>
          <strong>Mission confirmée</strong>
          <span>{recruiter ? 'Marquez la mission terminée une fois la prestation réalisée.' : "En attente de validation de fin de mission par l'établissement."}</span>
        </div>
        {recruiter ? (
          <Button disabled={Boolean(busyAction)} onClick={onComplete}>
            {busyAction === 'complete' ? 'Validation...' : 'Marquer la mission terminée'}
          </Button>
        ) : null}
      </div>
    );
  }

  if (state.paymentRequired) {
    return (
      <div className="workflow-step-panel">
        <div>
          <strong>Accord accepté</strong>
          <span>{recruiter ? 'Confirmez la mission pour passer à l’étape suivante.' : "En attente de confirmation de la mission par l'établissement."}</span>
        </div>
        {recruiter ? (
          <Button disabled={Boolean(busyAction)} onClick={onSecure}>
            {busyAction === 'secure' ? 'Confirmation...' : 'Confirmer la mission'}
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}

function WorkflowMessageCard({
  workflow,
  createdAt,
  active,
  candidateProfile,
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
  candidateProfile?: Pick<Profile, 'candidateGender'> | null;
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
  const candidateLabel = candidateWithArticle(candidateProfile);
  const candidateHasLabel = candidateHas(candidateProfile);
  const candidateTargetLabel = candidateContractedArticle(candidateProfile);

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
          <p>{retrocession ? `${candidateHasLabel} accepte la retrocession d'honoraires. Le recruteur peut confirmer la mission et suivre le reglement selon les honoraires encaisses.` : `${candidateHasLabel} accepte. Le recruteur doit payer maintenant pour confirmer la mission ; Medilink conserve les fonds jusqu'a la fin.`}</p>
          {recruiterCanSecure ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onSecure}>{busyAction === 'secure' ? 'Confirmation...' : retrocession ? 'Confirmer la mission' : 'Payer et confirmer'}</Button>
            </div>
          ) : null}
          <div className="workflow-next-step">
            <strong>Factures PDF</strong>
            <span>Disponibles après confirmation de la mission, fin de mission, puis validation de la rétrocession.</span>
          </div>
        </>
      ) : null}

      {workflow.kind === 'PROPOSAL_REJECTED' ? (
        <>
          <h3>Proposition refusée</h3>
          <p>La proposition finale a ete refusee. Le recruteur peut discuter avec {candidateLabel} puis envoyer une nouvelle proposition.</p>
        </>
      ) : null}

      {workflow.kind === 'FUNDS_SECURED' ? (
        <>
          <h3>Mission confirmée</h3>
          <p>{retrocession ? "La mission est confirmee avec une remuneration en retrocession d'honoraires." : `Le paiement du recruteur est securise par Medilink. Les fonds seront liberes ${candidateTargetLabel} apres validation de la fin de mission.`}</p>
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
          <p>{retrocession ? "La fin de mission a ete validee. La retrocession d'honoraires peut maintenant etre confirmee." : `La fin de mission a ete validee. Le paiement securise peut maintenant etre libere ${candidateTargetLabel}.`}</p>
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
          <p>{retrocession ? "La retrocession d'honoraires a ete validee. Les justificatifs peuvent etre generes." : `Les fonds ont ete liberes ${candidateTargetLabel}. Les factures et justificatifs peuvent etre generes.`}</p>
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
              <Button variant="light" disabled={Boolean(busyAction)} onClick={onDownloadRecruiter}>
                {busyAction === 'download-recruiter' ? 'Téléchargement...' : 'Facture recruteur PDF'}
              </Button>
              <Button variant="light" disabled={Boolean(busyAction)} onClick={onDownloadCandidate}>
                {busyAction === 'download-candidate' ? 'Téléchargement...' : 'Justificatif candidat PDF'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
