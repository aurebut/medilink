import type { Metadata } from 'next';
import { apercuLanding } from '@/content/landing-apercu';
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
import './apercu.css';

// Same sections, captures and animations as the homepage, with `apercu.css` and the lighter copy of `landing-apercu.ts`.
export const metadata: Metadata = {
  title: { absolute: 'Aperçu design épuré — MédiLink' },
  alternates: { canonical: '/' },
};

// Repository-authored markup only, derived from the homepage content; never API or user content.
export default function Page() { return <main id="main-content" dangerouslySetInnerHTML={{ __html: apercuLanding }} />; }
