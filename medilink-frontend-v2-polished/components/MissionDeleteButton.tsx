'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { Button } from './ui';

export function MissionDeleteButton({
  mission,
  onDeleted,
  label = 'Supprimer',
  iconOnly = false,
}: {
  mission: Pick<Mission, 'id' | 'title'>;
  onDeleted?: (missionId: string) => void;
  label?: string;
  iconOnly?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`Supprimer définitivement la mission "${mission.title}" ? Les candidatures et conversations liées seront aussi supprimées.`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/missions/${mission.id}`);
      onDeleted?.(mission.id);
    } catch (e: any) {
      alert(e.message || 'Impossible de supprimer cette mission.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="danger"
      className={iconOnly ? 'icon-action-button' : ''}
      aria-label={deleting ? `Suppression de ${mission.title}` : `Supprimer ${mission.title}`}
      title="Supprimer"
      onClick={() => void remove()}
      disabled={deleting}
    >
      {iconOnly ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 16H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      ) : deleting ? 'Suppression...' : label}
    </Button>
  );
}
