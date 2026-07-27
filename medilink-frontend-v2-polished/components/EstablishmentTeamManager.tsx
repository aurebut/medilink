'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type {
  Establishment,
  EstablishmentMemberRole,
} from '@/lib/types';
import { useAuth } from './AuthProvider';
import { Alert, Badge, Button, Card, Field, Input, Select } from './ui';

const roleLabels: Record<EstablishmentMemberRole, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  RECRUITER: 'Recruteur',
  VIEWER: 'Lecteur',
};

const roleHelp: Record<Exclude<EstablishmentMemberRole, 'OWNER'>, string> = {
  ADMIN: 'Peut gérer la fiche, l’équipe, les missions et les candidatures.',
  RECRUITER: 'Peut gérer les missions, les candidatures et les échanges.',
  VIEWER: 'Accès en lecture seule aux informations de l’établissement.',
};

export function EstablishmentTeamManager({
  establishment,
  onChanged,
}: {
  establishment: Establishment;
  onChanged: () => Promise<unknown>;
}) {
  const { user } = useAuth();
  const members = useMemo(
    () => establishment.members || [],
    [establishment.members],
  );
  const currentMembership = members.find((member) => member.userId === user?.id);
  const canManage =
    currentMembership?.role === 'OWNER' || currentMembership?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] =
    useState<Exclude<EstablishmentMemberRole, 'OWNER'>>('RECRUITER');
  const [roles, setRoles] = useState<Record<string, EstablishmentMemberRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRoles(
      Object.fromEntries(members.map((member) => [member.id, member.role])),
    );
  }, [members]);

  const assignableRoles = useMemo(
    () =>
      (currentMembership?.role === 'OWNER'
        ? (['ADMIN', 'RECRUITER', 'VIEWER'] as const)
        : (['RECRUITER', 'VIEWER'] as const)),
    [currentMembership?.role],
  );

  async function addOrUpdateMember(event: FormEvent) {
    event.preventDefault();
    setBusyId('new');
    setError(null);
    setMessage(null);
    try {
      await api.post(`/establishments/${establishment.id}/members`, {
        email: email.trim(),
        role: newRole,
      });
      setEmail('');
      setMessage('Accès ajouté ou mis à jour.');
      await onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setError(
          'Aucun compte ne correspond à cet email. La personne doit d’abord créer un compte établissement.',
        );
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Impossible de modifier cet accès.',
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function updateMember(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    const role = roles[memberId];
    if (!member?.user?.email || !role || role === member.role) return;
    setBusyId(memberId);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/establishments/${establishment.id}/members`, {
        email: member.user.email,
        role,
      });
      setMessage(`Rôle de ${member.user.email} mis à jour.`);
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossible de modifier ce rôle.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(memberId: string) {
    setBusyId(memberId);
    setError(null);
    setMessage(null);
    try {
      await api.delete(
        `/establishments/${establishment.id}/members/${memberId}`,
      );
      setPendingRemovalId(null);
      setMessage('Accès retiré.');
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossible de retirer cet accès.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="establishment-team-card">
      <h2>Équipe et accès</h2>
      <p className="text-secondary">
        Chaque personne utilise son propre compte. Les droits s’appliquent
        uniquement à cet établissement.
      </p>

      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <ul className="establishment-team-list" aria-label="Membres de l’équipe">
        {members.map((member) => {
          const isOwner = member.role === 'OWNER';
          const isSelf = member.userId === user?.id;
          const isPeerAdmin =
            currentMembership?.role === 'ADMIN' && member.role === 'ADMIN';
          const rowCanManage =
            canManage && !isOwner && !isSelf && !isPeerAdmin;
          const selectedRole = roles[member.id] || member.role;

          return (
            <li key={member.id} className="establishment-team-member">
              <div className="establishment-team-identity">
                <strong>{member.user?.email || 'Compte établissement'}</strong>
                <span>
                  {isSelf ? 'Vous · ' : ''}
                  {roleLabels[member.role]}
                </span>
              </div>

              {rowCanManage ? (
                <div className="establishment-team-actions">
                  <label className="sr-only" htmlFor={`member-role-${member.id}`}>
                    Rôle de {member.user?.email}
                  </label>
                  <Select
                    id={`member-role-${member.id}`}
                    value={selectedRole}
                    onChange={(event) =>
                      setRoles((current) => ({
                        ...current,
                        [member.id]: event.target.value as EstablishmentMemberRole,
                      }))
                    }
                    disabled={busyId === member.id}
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="light"
                    disabled={
                      busyId === member.id || selectedRole === member.role
                    }
                    onClick={() => void updateMember(member.id)}
                  >
                    Enregistrer
                  </Button>
                  {pendingRemovalId === member.id ? (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={busyId === member.id}
                        onClick={() => void removeMember(member.id)}
                      >
                        Confirmer le retrait
                      </Button>
                      <Button
                        type="button"
                        variant="light"
                        onClick={() => setPendingRemovalId(null)}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => setPendingRemovalId(member.id)}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              ) : (
                <Badge tone={isOwner ? 'success' : 'neutral'}>
                  {roleLabels[member.role]}
                </Badge>
              )}
            </li>
          );
        })}
      </ul>

      {canManage ? (
        <form className="form establishment-team-add" onSubmit={addOrUpdateMember}>
          <h3>Ajouter une personne déjà inscrite</h3>
          <p className="text-secondary">
            Saisissez l’email exact de son compte établissement. Envoyez-lui
            votre lien d’inscription si elle n’en possède pas encore.
          </p>
          <div className="form-row">
            <Field label="Email professionnel" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Rôle" description={roleHelp[newRole]} required>
              <Select
                value={newRole}
                onChange={(event) =>
                  setNewRole(
                    event.target.value as Exclude<
                      EstablishmentMemberRole,
                      'OWNER'
                    >,
                  )
                }
                required
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Ajout en cours…' : 'Ajouter ou mettre à jour'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
