'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMissionPublicPath, getMissionPublicUrl } from '@/lib/mission-links';
import { Button, Input, LinkButton } from './ui';

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function MissionShareActions({
  missionId,
  showUrl = false,
}: {
  missionId: string;
  showUrl?: boolean;
}) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const publicPath = getMissionPublicPath(missionId);
  const publicUrl = useMemo(() => getMissionPublicUrl(missionId, origin), [missionId, origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy() {
    await copyText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mission-share">
      {showUrl ? (
        <Input aria-label="Lien public de la mission" readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
      ) : null}
      <div className="actions">
        <Button type="button" variant="light" onClick={copy}>{copied ? 'Lien copie' : 'Copier le lien'}</Button>
        <LinkButton variant="light" href={publicPath}>Voir le lien public</LinkButton>
      </div>
    </div>
  );
}
