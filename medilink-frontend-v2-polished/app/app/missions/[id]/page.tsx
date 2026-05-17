import { redirect } from 'next/navigation';

export default function CandidateMissionDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/missions/${params.id}`);
}
