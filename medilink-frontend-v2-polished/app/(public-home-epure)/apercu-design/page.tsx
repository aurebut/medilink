import type { Metadata } from 'next';
import { LandingContent } from '@/components/marketing/LandingContent';
import '../../(public-home)/process-art.css';
import '../../(public-home)/process-copy.css';
import '../../(public-home)/workspace-editorial.css';
import '../../(public-home)/continuity-editorial.css';
import '../../(public-home)/documents-editorial.css';
import '../../(public-home)/hero-frame.css';
import '../../(public-home)/section-spacing.css';
import '../../(public-home)/blue-editorial.css';
import '../../(public-home)/interface-previews.css';
import '../../(public-home)/preview-layouts.css';
import '../../(public-home)/contributors-carousel.css';
import './epure.css';

// Same content, sections and animations as the homepage; only `epure.css` differs.
export const metadata: Metadata = {
  title: { absolute: 'Aperçu design épuré — MédiLink' },
  alternates: { canonical: '/' },
};

export default function Page() { return <LandingContent variant="home" />; }
