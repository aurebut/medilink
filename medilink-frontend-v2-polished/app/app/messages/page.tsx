import { MessageCenter } from '@/components/MessageCenter';
import { PageHeader } from '@/components/ui';

export default function CandidateMessagesPage() {
  return (
    <>
      <PageHeader title="Messagerie" description="Conversations liées aux candidatures et aux missions." />
      <MessageCenter />
    </>
  );
}
