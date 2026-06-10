'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { roleLabel } from '@/lib/labels';
import { api } from '@/lib/api';
import { Alert, Badge, Button, Card, Field, Input, PageHeader } from './ui';
import { useAuth } from './AuthProvider';

export function AccountSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleResendVerification() {
    setMessage(null);
    setError(null);
    setResendingEmail(true);
    try {
      const result = await api.post<{ message: string }>('/auth/resend-verification', {});
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message || 'Impossible de renvoyer le mail.');
    } finally {
      setResendingEmail(false);
    }
  }

  async function requestPasswordReset(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSendingReset(true);

    try {
      const result = await api.post<{ message: string }>('/auth/forgot-password', { email: email || user?.email });
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingReset(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    if (deleteEmailInput !== user?.email) {
      setDeleteError('L\'adresse email saisie ne correspond pas.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete('/auth/me');
      await logout();
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Une erreur est survenue lors de la suppression du compte.');
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Paramètres du compte"
        description="Email de connexion, sécurité et déconnexion de votre session Medilink."
      />

      <div className="grid-main">
        <Card>
          <h2>Compte</h2>
          <div className="info-list">
            <div>
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div>
              <span>Rôle</span>
              <strong>{roleLabel(user?.role)}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>{user?.status || '-'}</strong>
            </div>
            <div>
              <span>Vérification email</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user?.emailVerified ? 'Vérifié' : 'En attente'}
                {!user?.emailVerified && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="banner-button"
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {resendingEmail ? 'Envoi...' : 'Renvoyer'}
                  </button>
                )}
              </strong>
            </div>
            <div>
              <span>Téléphone</span>
              <strong>{user?.phone || '-'}</strong>
            </div>
          </div>
        </Card>

        <div className="grid">
          <Card>
            <div className="toolbar">
              <div>
                <h2>Sécurité</h2>
                <p className="small">Recevez un lien pour définir un nouveau mot de passe.</p>
              </div>
              <Badge tone={user?.emailVerified ? 'success' : 'warning'}>
                {user?.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
              </Badge>
            </div>

            <form className="form" onSubmit={requestPasswordReset}>
              {message ? <Alert type="success">{message}</Alert> : null}
              {error ? <Alert type="error">{error}</Alert> : null}
              <Field label="Email du compte">
                <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Button disabled={sendingReset}>{sendingReset ? 'Envoi...' : 'Envoyer un lien de réinitialisation'}</Button>
            </form>
          </Card>

          <Card>
            <h2>Session</h2>
            <p>Déconnectez cette session sur cet appareil.</p>
            <div className="actions">
              <Button variant="danger" disabled={loggingOut} onClick={onLogout}>
                {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </Button>
            </div>
          </Card>

          <Card className="danger-zone-card">
            <h2 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)' }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Zone de danger
            </h2>
            <p className="small">Supprimez définitivement votre compte Medilink et toutes vos données.</p>
            <div className="actions" style={{ marginTop: '16px' }}>
              <Button variant="danger" onClick={() => { setShowDeleteModal(true); setDeleteEmailInput(''); setDeleteError(null); }}>
                Supprimer le compte
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-container">
            <div className="delete-modal-header">
              <div className="delete-modal-alert-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3>Supprimer le compte</h3>
            </div>
            
            <div className="delete-modal-body">
              <p className="delete-warning-text">
                Cette action est <strong>définitive</strong> et <strong>irréversible</strong>. Elle entraînera :
              </p>
              <ul className="delete-bullets">
                <li>La suppression de votre profil candidat ou recruteur.</li>
                <li>La suppression de vos documents importés.</li>
                <li>Le retrait de toutes vos candidatures et de vos participations à des établissements.</li>
                <li>La clôture définitive de votre accès à la plateforme.</li>
              </ul>
              
              <div className="delete-confirmation-prompt">
                <p>Pour confirmer, veuillez saisir votre email ci-dessous :</p>
                <strong className="delete-user-email">{user?.email}</strong>
              </div>

              <form onSubmit={handleDeleteAccount} style={{ marginTop: '16px' }}>
                {deleteError && <Alert type="error">{deleteError}</Alert>}
                <Field label="Adresse email de confirmation">
                  <Input 
                    type="email" 
                    required 
                    placeholder="Saisissez votre email" 
                    value={deleteEmailInput} 
                    onChange={(e) => setDeleteEmailInput(e.target.value)}
                    disabled={deleting}
                  />
                </Field>
                
                <div className="delete-modal-footer">
                  <Button 
                    type="button" 
                    variant="light" 
                    disabled={deleting} 
                    onClick={() => setShowDeleteModal(false)}
                    style={{ marginRight: '10px' }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    variant="danger" 
                    disabled={deleting || deleteEmailInput !== user?.email}
                  >
                    {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .danger-zone-card {
          border: 1px solid rgba(180, 35, 24, 0.2) !important;
          background: rgba(180, 35, 24, 0.02) !important;
        }

        .delete-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(11, 25, 41, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: deleteModalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .delete-modal-container {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          width: 100%;
          max-width: 480px;
          padding: 28px;
          animation: deleteModalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .delete-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .delete-modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: var(--heading);
        }

        .delete-modal-alert-icon {
          background: rgba(180, 35, 24, 0.1);
          color: var(--danger);
          border-radius: 999px;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .delete-warning-text {
          color: var(--text);
          font-size: 15px;
          margin-bottom: 12px;
        }

        .delete-bullets {
          padding-left: 20px;
          margin: 0 0 20px 0;
          color: var(--muted);
          font-size: 14px;
          display: grid;
          gap: 8px;
        }

        .delete-bullets li {
          line-height: 1.4;
        }

        .delete-confirmation-prompt {
          background: var(--surface-soft);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          margin-bottom: 16px;
          border: 1px solid var(--line);
        }

        .delete-confirmation-prompt p {
          margin: 0 0 4px 0;
          font-size: 13px;
          color: var(--muted);
        }

        .delete-user-email {
          font-size: 15px;
          color: var(--heading);
          user-select: all;
          word-break: break-all;
        }

        .delete-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        @keyframes deleteModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes deleteModalScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
