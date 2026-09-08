/* eslint-disable @next/next/no-html-link-for-pages -- Public navigation deliberately loads each isolated root layout. */
import { guides } from '@/content/guides';
import { GuideCard } from '@/components/marketing/GuideCard';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('Guides du remplacement en médecine générale', 'Premier remplacement, contrat, rétrocession, annonce et accueil au cabinet : six guides pratiques pour les médecins remplaçants et les cabinets médicaux.', '/guides');

const collections = [
  { id: 'preparer', title: 'Préparer sa prochaine mission', description: 'Trouver ses repères, comparer les conditions et poser les bonnes questions.', topics: ['Débuter', 'Choisir une mission'] },
  { id: 'conditions', title: 'Comprendre les conditions', description: 'Relire le contrat et clarifier la rétrocession avant de commencer.', topics: ['Conditions et contrat'] },
  { id: 'cabinet', title: 'Organiser le remplacement au cabinet', description: 'De l’annonce au premier jour : donner les informations qui facilitent l’arrivée.', topics: ['Vie du cabinet'] },
];

export default function GuidesPage() {
  return <main id="main-content" className="guides-main">
    <nav aria-label="Fil d’Ariane"><ol className="guide-breadcrumb"><li><a href="/">Accueil</a></li><li aria-current="page">Guides</li></ol></nav>
    <header className="guide-header guide-index-header"><p className="guide-kicker">Le carnet du remplacement</p><h1>Le remplacement en médecine générale,<br /><em>en pratique.</em></h1><p className="guide-intro">Nos guides du remplacement en médecine générale : des repères concrets pour choisir une mission, clarifier les conditions et prendre ses marques au cabinet.</p></header>
    <GuideCard guide={guides[0]} featured />
    <nav className="guide-collections-nav" aria-label="Thèmes des guides">{collections.map(collection => <a href={`#${collection.id}`} key={collection.id}>{collection.title} <span aria-hidden="true">↓</span></a>)}</nav>
    {collections.map((collection, index) => <section className="guide-collection" id={collection.id} key={collection.id} aria-labelledby={`${collection.id}-title`}>
      <div className="guide-collection-heading"><span className="guide-collection-number" aria-hidden="true">0{index + 1}</span><div><h2 id={`${collection.id}-title`}>{collection.title}</h2><p>{collection.description}</p></div></div>
      <div className="editorial-grid">{guides.filter(guide => collection.topics.includes(guide.topic)).map(guide => <GuideCard guide={guide} key={guide.slug} />)}</div>
    </section>)}
    <aside className="guide-editorial-note"><strong>Des ressources pour préparer vos échanges.</strong><p>Les guides sont rédigés par l’équipe MédiLink. Les sujets réglementaires renvoient vers l’Ordre des médecins et l’Assurance Maladie ; les exemples sont signalés comme fictifs. Retrouvez les sources et la date de mise à jour dans chaque article.</p></aside>
  </main>;
}
