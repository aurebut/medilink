/* eslint-disable @next/next/no-html-link-for-pages -- Public navigation deliberately loads each isolated root layout. */
import { guides, readingMinutes } from '@/content/guides';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('Guides du remplacement en médecine générale', 'Checklists et trames pratiques pour préparer votre premier remplacement en médecine générale ou rédiger une annonce pour votre cabinet.', '/guides');

export default function GuidesPage() {
  return <main id="main-content" className="guides-main">
    <ol className="guide-breadcrumb" aria-label="Fil d’Ariane"><li><a href="/">Accueil</a></li><li aria-current="page">Guides</li></ol>
    <header className="guide-header"><p className="guide-kicker">Les ressources MédiLink</p><h1>Préparer un remplacement en médecine générale.</h1><p className="guide-intro">Médecin remplaçant ou cabinet médical : retrouvez les questions à poser, les informations à réunir et les étapes à préparer avant de travailler ensemble.</p></header>
    <div className="seo-resource-grid">{guides.map(guide => <a className="seo-resource-card" href={`/guides/${guide.slug}`} key={guide.slug}><small>{guide.audience} · {readingMinutes(guide)} min</small><h2>{guide.title}</h2><p>{guide.description}</p><span>Lire le guide →</span></a>)}</div>
  </main>;
}
