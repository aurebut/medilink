import { Suspense } from 'react';
import { MessageCenter } from '@/components/MessageCenter';
import { LoadingCard, PageHeader } from '@/components/ui';

export default function CandidateMessagesPage() {
  return (
    <>
      <PageHeader title="Messagerie" description="Conversations liées aux candidatures et aux missions." />
      <Suspense fallback={<LoadingCard label="Chargement de la messagerie..." />}>
        <MessageCenter />
      </Suspense>
    </>
  );
}
