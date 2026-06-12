import { MessageCenter } from '@/components/MessageCenter';
import { PageHeader } from '@/components/ui';

export default function EstablishmentMessagesPage() {
  return (
    <div className="messages-page">
      <PageHeader title="Messagerie" description="Échanges avec les candidats, liés aux candidatures." />
      <MessageCenter />
    </div>
  );
}
