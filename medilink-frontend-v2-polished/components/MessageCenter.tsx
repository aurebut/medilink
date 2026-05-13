'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/lib/types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Textarea } from './ui';
import { useAuth } from './AuthProvider';

const WORKFLOW_PREFIX = '__MEDILINK_WORKFLOW__';

type ConversationWithLast = Conversation & { messages?: Message[] };
type WorkflowKind =
  | 'FINAL_PROPOSAL'
  | 'PAYMENT_REQUIRED'
  | 'PROPOSAL_REJECTED'
  | 'FUNDS_SECURED'
  | 'MISSION_COMPLETED'
  | 'PAYMENT_RELEASED'
  | 'INVOICES_GENERATED';

type ProposalPayload = {
  amount: number;
  currency?: string;
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
  amount: string;
  currency: string;
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

function workflowLabel(kind: WorkflowKind) {
  const labels: Record<WorkflowKind, string> = {
    FINAL_PROPOSAL: 'Proposition finale',
    PAYMENT_REQUIRED: 'Paiement requis',
    PROPOSAL_REJECTED: 'Proposition refusee',
    FUNDS_SECURED: 'Paiement securise',
    MISSION_COMPLETED: 'Mission terminee',
    PAYMENT_RELEASED: 'Paiement libere',
    INVOICES_GENERATED: 'Factures generees',
  };
  return labels[kind];
}

export function MessageCenter() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithLast[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposal, setProposal] = useState<ProposalForm>({
    amount: '',
    currency: 'EUR',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
  const currentStatus = state.invoices
    ? 'Factures disponibles'
    : state.released
      ? 'Paiement libere'
      : state.completed
        ? 'Mission terminee'
        : state.fundsSecured
          ? 'Mission confirmee'
          : state.paymentRequired
            ? 'Paiement requis'
          : state.rejected
            ? 'Proposition refusee'
            : state.hasProposal
              ? 'Proposition envoyee'
              : 'Discussion';

  async function loadConversations() {
    try {
      const data = await api.get<ConversationWithLast[]>('/conversations');
      setConversations(data);
      if (!activeId && data[0]) setActiveId(data[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id: string) {
    try {
      const data = await api.get<Message[]>(`/conversations/${id}/messages`);
      setMessages(data);
      await api.post(`/conversations/${id}/read`, {});
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const current = conversations.find((c) => c.id === activeId);
    setProposal({
      amount: current?.mission?.compensationAmount ? String(current.mission.compensationAmount) : '',
      currency: current?.mission?.compensationCurrency || 'EUR',
      startDate: current?.mission?.startDate ? current.mission.startDate.slice(0, 10) : '',
      endDate: current?.mission?.endDate ? current.mission.endDate.slice(0, 10) : '',
      startTime: current?.mission?.startTime || '',
      endTime: current?.mission?.endTime || '',
      notes: '',
    });
  }, [activeId]);
  useEffect(() => {
    if (!activeId) return undefined;
    const timer = setInterval(() => void loadMessages(activeId), 8000);
    return () => clearInterval(timer);
  }, [activeId]);

  async function refresh() {
    if (activeId) await loadMessages(activeId);
    await loadConversations();
  }

  async function send() {
    if (!activeId || !body.trim()) return;
    try {
      const created = await api.post<Message>(`/conversations/${activeId}/messages`, { body: body.trim() });
      setMessages((prev) => [...prev, created]);
      setBody('');
      await loadConversations();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function submitProposal(e: FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setBusyAction('proposal');
    setError(null);
    try {
      await api.post(`/conversations/${activeId}/proposal`, {
        amount: Number(proposal.amount),
        currency: proposal.currency || 'EUR',
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
    const title = kind === 'recruiter' ? 'Facture etablissement' : 'Justificatif candidat';
    const content = [
      title,
      '',
      `Mission: ${active.mission?.title || ''}`,
      `Etablissement: ${active.establishment?.name || ''}`,
      `Ville: ${active.mission?.city || ''}`,
      `Date: ${p.startDate ? formatDate(p.startDate) : ''}`,
      `Horaire: ${p.startTime || ''}${p.endTime ? ` - ${p.endTime}` : ''}`,
      `Montant: ${formatMoney(p.amount, p.currency || 'EUR')}`,
      '',
      kind === 'recruiter'
        ? 'Document genere apres validation de fin de mission et confirmation du paiement.'
        : 'Document genere pour le candidat apres confirmation du paiement.',
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
    return <EmptyState title="Aucune conversation" description="Les conversations sont creees automatiquement lorsqu'un candidat postule a une mission." />;
  }

  return (
    <div className="message-layout">
      <Card className="conversation-list">
        <div className="toolbar">
          <div>
            <h2>Conversations</h2>
            <div className="small">{conversations.length} echange(s)</div>
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
                <div className="small">{last?.body.startsWith(WORKFLOW_PREFIX) ? 'Mise a jour du suivi' : last?.body || 'Aucun message'} - {formatDateTime(conv.lastMessageAt)}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="message-pane">
        <div className="toolbar">
          <div>
            <h2>{active?.mission?.title || 'Conversation'}</h2>
            <div className="small">{active?.establishment?.name} - {active?.mission?.city}</div>
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
              <div key={m.id} className={`message ${mine ? 'mine' : ''} ${system ? 'system' : ''}`}>
                <div>{m.body}</div>
                <div className="small">{formatDateTime(m.createdAt)}</div>
              </div>
            );
          })}
        </div>

        <div className="message-form">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ecrire un message..." />
          <Button onClick={send}>Envoyer</Button>
        </div>
      </Card>
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
          <Badge>{hasProposal ? 'Proposition envoyee' : 'Prochaine etape'}</Badge>
          <h3>{hasProposal ? 'Envoyer une nouvelle proposition finale' : 'Formaliser une proposition finale'}</h3>
          <p>La proposition apparaitra dans le fil avec les boutons d'acceptation cote candidat.</p>
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
        <h3>Details de l'accord</h3>
      </div>
      <div className="form-row">
        <Field label="Montant">
          <Input type="number" min="0" required value={proposal.amount} onChange={(e) => onChange({ amount: e.target.value })} />
        </Field>
        <Field label="Devise">
          <Input value={proposal.currency} onChange={(e) => onChange({ currency: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Date debut">
          <Input type="date" value={proposal.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </Field>
        <Field label="Date fin">
          <Input type="date" value={proposal.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Heure debut">
          <Input type="time" value={proposal.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </Field>
        <Field label="Heure fin">
          <Input type="time" value={proposal.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </Field>
      </div>
      <Field label="Conditions / notes">
        <Textarea value={proposal.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Consignes, contact sur place, conditions particulieres..." />
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
            <div><span>Montant</span><strong>{formatMoney(proposal.amount, proposal.currency || 'EUR')}</strong></div>
            <div><span>Date</span><strong>{proposal.startDate ? formatDate(proposal.startDate) : '-'}</strong></div>
            <div><span>Horaire</span><strong>{proposal.startTime || '-'} {proposal.endTime ? `- ${proposal.endTime}` : ''}</strong></div>
            <div><span>Paiement</span><strong>Bloque par Medilink</strong></div>
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
          <h3>Paiement requis</h3>
          <p>Le candidat a accepte. Le recruteur doit payer maintenant pour confirmer la mission ; Medilink conserve les fonds jusqu'a la fin.</p>
          {recruiterCanSecure ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onSecure}>{busyAction === 'secure' ? 'Paiement...' : 'Payer et confirmer'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'PROPOSAL_REJECTED' ? (
        <>
          <h3>Proposition refusee</h3>
          <p>La proposition finale a ete refusee. Le recruteur peut discuter avec le candidat puis envoyer une nouvelle proposition.</p>
        </>
      ) : null}

      {workflow.kind === 'FUNDS_SECURED' ? (
        <>
          <h3>Mission confirmee</h3>
          <p>Le paiement du recruteur est securise par Medilink. Les fonds seront liberes au candidat apres validation de la fin de mission.</p>
          {recruiterCanComplete ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onComplete}>{busyAction === 'complete' ? 'Validation...' : 'Marquer la mission terminee'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'MISSION_COMPLETED' ? (
        <>
          <h3>Mission terminee</h3>
          <p>La fin de mission a ete validee. Le paiement securise peut maintenant etre libere au candidat.</p>
          {recruiterCanPay ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onPay}>{busyAction === 'pay' ? 'Liberation...' : 'Liberer le paiement'}</Button>
            </div>
          ) : null}
        </>
      ) : null}

      {workflow.kind === 'PAYMENT_RELEASED' ? (
        <>
          <h3>Paiement libere</h3>
          <p>Les fonds ont ete liberes au candidat. Les factures et justificatifs peuvent etre generes.</p>
          {canGenerateInvoices ? (
            <div className="actions">
              <Button disabled={Boolean(busyAction)} onClick={onGenerateInvoices}>{busyAction === 'invoices' ? 'Generation...' : 'Generer les factures'}</Button>
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
