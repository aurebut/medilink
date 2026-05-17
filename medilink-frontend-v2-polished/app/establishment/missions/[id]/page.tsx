import { redirect } from 'next/navigation';

export default function EstablishmentMissionDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/missions/${params.id}`);
}
