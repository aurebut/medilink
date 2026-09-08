import { landingContent } from '@/content/landing-content';

export function LandingContent({ variant }: { variant: keyof typeof landingContent }) {
  // Only repository-authored markup is accepted; never pass API or user content here.
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: landingContent[variant] }} />;
}
