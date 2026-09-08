import { readingMinutes, type Guide } from '@/content/guides';
import { GuideVisual } from './GuideVisual';

export function GuideCard({ guide, featured = false }: { guide: Guide; featured?: boolean }) {
  return <a className={`editorial-card${featured ? ' editorial-card-featured' : ''}`} href={`/guides/${guide.slug}`}>
    <GuideVisual image={guide.image} priority={featured} />
    <div className="editorial-card-copy">
      <p className="guide-kicker">{featured ? 'Pour commencer · ' : ''}{guide.topic}</p>
      {featured ? <h2>{guide.title}</h2> : <h3>{guide.title}</h3>}
      <p className="editorial-card-description">{guide.description}</p>
      <div className="editorial-card-bottom"><span>Lire le guide <span aria-hidden="true">↗</span></span><small>{readingMinutes(guide)} min de lecture</small></div>
    </div>
  </a>;
}
