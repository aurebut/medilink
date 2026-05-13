'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { Alert, Button, Card, EmptyState, Textarea } from './ui';
import { useAuth } from './AuthProvider';

type ConversationWithLast = Conversation & { messages?: Message[] };

export function MessageCenter() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithLast[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

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
  useEffect(() => { if (activeId) void loadMessages(activeId); }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(() => void loadMessages(activeId), 8000);
    return () => clearInterval(timer);
  }, [activeId]);

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

  if (loading) return <Card><p className="muted">Chargement des conversations...</p></Card>;
  if (conversations.length === 0) return <EmptyState title="Aucune conversation" description="Les conversations sont créées automatiquement lorsqu’un candidat postule à une mission." />;

  return (
    <div className="message-layout">
      <Card className="conversation-list">
        <h2>Conversations</h2>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="conversation-items">
          {conversations.map((conv) => {
            const last = conv.messages?.[0];
            return <button key={conv.id} className={`conversation-button ${conv.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(conv.id)}>
              <strong>{conv.establishment?.name || conv.mission?.title || 'Conversation'}</strong>
              <div className="small">{conv.mission?.title}</div>
              <div className="small">{last?.body || 'Aucun message'} · {formatDateTime(conv.lastMessageAt)}</div>
            </button>;
          })}
        </div>
      </Card>
      <Card className="message-pane">
        <h2>{active?.mission?.title || 'Conversation'}</h2>
        <p className="muted">{active?.establishment?.name} · {active?.mission?.city}</p>
        <div className="messages">
          {messages.map((m) => {
            const mine = m.senderUserId === user?.id;
            const system = m.messageType === 'SYSTEM';
            return <div key={m.id} className={`message ${mine ? 'mine' : ''} ${system ? 'system' : ''}`}>
              <div>{m.body}</div>
              <div className="small">{formatDateTime(m.createdAt)}</div>
            </div>;
          })}
        </div>
        <div className="message-form">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écrire un message..." />
          <Button onClick={send}>Envoyer</Button>
        </div>
      </Card>
    </div>
  );
}
