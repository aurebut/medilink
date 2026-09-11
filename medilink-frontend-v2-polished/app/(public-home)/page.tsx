import { LandingContent } from '@/components/marketing/LandingContent';
import { pageMetadata } from '@/lib/seo';
import './process-art.css';
import './workspace-editorial.css';
import './continuity-editorial.css';

export const metadata = pageMetadata("Remplacement médical pour médecins et cabinets", "Préparez vos remplacements en médecine générale avec MédiLink : disponibilités, conditions d’exercice et échanges entre médecins remplaçants et cabinets.", "/");

export default function Page() { return <LandingContent variant="home" />; }
