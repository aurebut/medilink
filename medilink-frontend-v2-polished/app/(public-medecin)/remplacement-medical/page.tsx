import { LandingContent } from '@/components/marketing/LandingContent';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Remplacement médecin généraliste : trouvez votre mission',
  'Trouvez des missions adaptées à votre profil, échangez avec le médecin et préparez les documents de votre remplacement. Découvrez MédiLink en démo.',
  '/remplacement-medical',
);

export default function Page() { return <LandingContent variant="candidate" />; }
