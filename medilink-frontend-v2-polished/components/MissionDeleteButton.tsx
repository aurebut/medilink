'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { Button } from './ui';

export function MissionDeleteButton({
  mission,
  onDeleted,
  label = 'Supprimer',
}: {
  mission: Pick<Mission, 'id' | 'title'>;
  onDeleted?: (missionId: string) => void;
  label?: string;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`Supprimer definitivement la mission "${mission.title}" ? Les candidatures et conversations liees seront aussi supprimees.`)) {
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
    <Button type="button" variant="danger" onClick={() => void remove()} disabled={deleting}>
      {deleting ? 'Suppression...' : label}
    </Button>
  );
}
