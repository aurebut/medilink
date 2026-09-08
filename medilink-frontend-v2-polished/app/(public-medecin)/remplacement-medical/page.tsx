import { LandingContent } from '@/components/marketing/LandingContent';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata("Remplacement médecin généraliste : préparez vos missions", "Médecin généraliste remplaçant : créez votre profil, renseignez vos disponibilités et préparez vos prochaines candidatures avec MédiLink.", "/remplacement-medical");

export default function Page() { return <LandingContent variant="candidate" />; }
