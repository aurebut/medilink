'use client';

import { useState } from 'react';
import styles from './ProfileAvatar.module.css';

export function ProfileAvatar({
  src,
  name,
  className = '',
  decorative = false,
}: {
  src?: string | null;
  name: string;
  className?: string;
  decorative?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showPhoto = Boolean(src && src !== failedSource);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'M';

  return (
    <span className={`${styles.avatar} ${className}`} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined}>
      {showPhoto ? (
        // Profile and establishment images can use expiring signed URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={src!} alt="" width={44} height={44} decoding="async" onError={() => setFailedSource(src!)} />
      ) : initials}
    </span>
  );
}
