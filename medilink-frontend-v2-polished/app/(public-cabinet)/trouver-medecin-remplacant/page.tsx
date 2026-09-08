import { LandingContent } from '@/components/marketing/LandingContent';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata("Trouver un médecin remplaçant pour votre cabinet", "Préparez votre annonce de remplacement médical, précisez vos besoins et centralisez les candidatures et les échanges dans votre espace cabinet MédiLink.", "/trouver-medecin-remplacant");

export default function Page() { return <LandingContent variant="establishment" />; }
