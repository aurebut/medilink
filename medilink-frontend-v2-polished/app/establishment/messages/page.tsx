'use client';

import { MessageCenter } from '@/components/MessageCenter';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { PageHeader } from '@/components/ui';

export default function EstablishmentMessagesPage() {
  const { primary } = useEstablishments();

  return (
    <div className="messages-page">
      <PageHeader title="Messagerie" description="Échanges avec les candidats, liés aux candidatures." />
      <MessageCenter key={primary?.id || 'all'} establishmentId={primary?.id} />
    </div>
  );
}
