/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation avoids carrying public CSS between root layouts. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { guides, readingMinutes } from '@/content/guides';
import { SITE_URL, pageMetadata, jsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  const metadata = pageMetadata(guide.title, guide.description, `/guides/${guide.slug}`);
  return {
    ...metadata,
    authors: [{ name: 'Équipe MédiLink', url: SITE_URL }],
    openGraph: { ...metadata.openGraph, type: 'article', publishedTime: guide.published, modifiedTime: guide.updated, authors: ['Équipe MédiLink'] },
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  const related = guides.find(item => item.slug === guide.related);
  const canonical = `${SITE_URL}/guides/${guide.slug}`;
  const schema = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, url: canonical, mainEntityOfPage: canonical, inLanguage: 'fr-FR', datePublished: guide.published, dateModified: guide.updated, author: { '@type': 'Organization', name: 'Équipe MédiLink', url: SITE_URL }, publisher: { '@type': 'Organization', name: 'MédiLink', url: SITE_URL }, image: `${SITE_URL}/landing-assets/seo-social.jpg` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` }, { '@type': 'ListItem', position: 3, name: guide.title, item: canonical } ] },
  ];
  return <main id="main-content" className="guides-main">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <ol className="guide-breadcrumb" aria-label="Fil d’Ariane"><li><a href="/">Accueil</a></li><li><a href="/guides">Guides</a></li><li aria-current="page">{guide.audience === 'Cabinets médicaux' ? 'Rédiger une annonce' : 'Premier remplacement'}</li></ol>
    <header className="guide-header"><p className="guide-kicker">{guide.audience} · Guide pratique</p><h1>{guide.title}</h1><p className="guide-intro">{guide.intro}</p><p className="guide-meta">Par Équipe MédiLink · Publié le <time dateTime={guide.published}>{dateLabel(guide.published)}</time> · Mis à jour le <time dateTime={guide.updated}>{dateLabel(guide.updated)}</time> · {readingMinutes(guide)} min de lecture</p></header>
    <div className="guide-body-grid"><aside className="guide-toc" aria-labelledby="sommaire"><h2 id="sommaire">Dans ce guide</h2><ol>{guide.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title.replace(/^\d+\. /, '')}</a></li>)}</ol></aside>
    <article className="guide-article" aria-label={guide.title}>
      <div className="guide-takeaway"><strong>À préparer ensemble</strong><p>{guide.takeaway}</p></div>
      {guide.sections.map(section => <section className="guide-section" id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.checklist && <ul className="guide-checklist">{section.checklist.map(item => <li key={item}>{item}</li>)}</ul>}{section.template && <pre className="guide-template">{section.template}</pre>}{section.sources && <div className="guide-sources">Sources officielles consultées le {dateLabel(guide.updated)}<ul>{section.sources.map(source => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul></div>}</section>)}
      <section className="guide-cta"><h2>{guide.audience === 'Cabinets médicaux' ? 'Présentez votre besoin de remplacement.' : 'Préparez vos prochaines candidatures.'}</h2><p>{guide.cta.text}</p><a className="btn btn-primary" href={guide.cta.href}>{guide.cta.label} →</a></section>
      <p><a href={guide.audience === 'Cabinets médicaux' ? '/trouver-medecin-remplacant' : '/remplacement-medical'}>Découvrir le parcours {guide.audience === 'Cabinets médicaux' ? 'cabinet' : 'médecin remplaçant'} sur MédiLink →</a></p>
      {related && <section className="guide-related"><h2>Pour préparer la suite</h2><a className="seo-resource-card" href={`/guides/${related.slug}`}><small>{related.audience}</small><h3>{related.title}</h3><p>{related.description}</p><span>Lire le guide →</span></a></section>}
    </article></div>
  </main>;
}
