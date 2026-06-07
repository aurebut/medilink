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
  showPublicLink = true,
  iconOnly = false,
}: {
  missionId: string;
  showUrl?: boolean;
  showPublicLink?: boolean;
  iconOnly?: boolean;
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
    <div className={`mission-share ${iconOnly ? 'icon-share' : ''}`}>
      {showUrl ? (
        <Input aria-label="Lien public de la mission" readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
      ) : null}
      <div className="actions">
        <Button
          type="button"
          variant="light"
          className={iconOnly ? 'icon-action-button' : ''}
          aria-label={copied ? 'Lien public copié' : 'Copier le lien public'}
          title={copied ? 'Lien copié' : 'Partager'}
          onClick={copy}
        >
          {iconOnly ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v14" />
            </svg>
          ) : copied ? 'Lien copie' : 'Copier le lien'}
        </Button>
        {showPublicLink ? <LinkButton variant="light" href={publicPath}>Voir le lien public</LinkButton> : null}
      </div>
    </div>
  );
}
