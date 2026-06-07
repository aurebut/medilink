import { redirect } from 'next/navigation';

export default function ApplicationsPage() {
  redirect('/app/search?tab=applications');
}
