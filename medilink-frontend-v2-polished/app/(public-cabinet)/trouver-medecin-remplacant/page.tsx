import { LandingContent } from '@/components/marketing/LandingContent';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Trouver un médecin remplaçant pour votre cabinet',
  'Trouvez un médecin remplaçant, partagez les documents et suivez les comptes rendus et la rétrocession. Découvrez les tarifs MédiLink et demandez une démo.',
  '/trouver-medecin-remplacant',
);

export default function Page() { return <LandingContent variant="establishment" />; }
