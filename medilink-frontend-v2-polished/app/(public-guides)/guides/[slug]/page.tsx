/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation avoids carrying public CSS between root layouts. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { guides, readingMinutes } from '@/content/guides';
import { GuideVisual } from '@/components/marketing/GuideVisual';
import { GuideCard } from '@/components/marketing/GuideCard';
import { SITE_URL, pageMetadata, jsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return guides.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  const metadata = pageMetadata(guide.seoTitle, guide.description, `/guides/${guide.slug}`);
  const socialImage = guide.image.src.replace('.webp', '-social.jpg');
  return {
    ...metadata,
    authors: [{ name: 'Équipe MédiLink', url: SITE_URL }],
    openGraph: { ...metadata.openGraph, type: 'article', publishedTime: guide.published, modifiedTime: guide.updated, authors: ['Équipe MédiLink'], images: [{ url: socialImage, width: 1200, height: 630, alt: guide.image.alt }] },
    twitter: { ...metadata.twitter, images: [{ url: socialImage, alt: guide.image.alt }] },
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  const related = guide.related.flatMap(relatedSlug => guides.filter(item => item.slug === relatedSlug));
  const canonical = `${SITE_URL}/guides/${guide.slug}`;
  const schema = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, url: canonical, mainEntityOfPage: canonical, inLanguage: 'fr-FR', articleSection: guide.topic, datePublished: guide.published, dateModified: guide.updated, author: { '@type': 'Organization', name: 'Équipe MédiLink', url: SITE_URL }, publisher: { '@type': 'Organization', name: 'MédiLink', url: SITE_URL }, image: `${SITE_URL}${guide.image.src.replace('.webp', '-social.jpg')}` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` }, { '@type': 'ListItem', position: 3, name: guide.shortTitle, item: canonical } ] },
  ];
  return <main id="main-content" className="guides-main">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <nav aria-label="Fil d’Ariane"><ol className="guide-breadcrumb"><li><a href="/">Accueil</a></li><li><a href="/guides">Guides</a></li><li aria-current="page">{guide.shortTitle}</li></ol></nav>
    <header className="guide-header guide-hero"><div><p className="guide-kicker">{guide.topic} · Guide pratique</p><h1>{guide.title}</h1><p className="guide-audience">Pour les {guide.audience.toLocaleLowerCase('fr-FR')}</p><p className="guide-meta">Par Équipe MédiLink · {readingMinutes(guide)} min de lecture<br />Publié le <time dateTime={guide.published}>{dateLabel(guide.published)}</time>{guide.updated !== guide.published && <> · Mis à jour le <time dateTime={guide.updated}>{dateLabel(guide.updated)}</time></>}</p></div><GuideVisual image={guide.image} priority caption /></header>
    <div className="guide-body-grid"><aside className="guide-toc" aria-labelledby="sommaire"><h2 id="sommaire">Dans ce guide</h2><ol>{guide.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title.replace(/^\d+\. /, '')}</a></li>)}{guide.faq && <li><a href="#questions-frequentes">Questions fréquentes</a></li>}</ol></aside>
    <article className="guide-article" aria-label={guide.title}>
      <p className="guide-opening">{guide.intro}</p>
      <div className="guide-takeaway"><strong>Le repère à garder</strong><p>{guide.takeaway}</p></div>
      {guide.sections.map(section => <section className="guide-section" id={section.id} key={section.id}>
        <h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.checklist && <ul className="guide-checklist">{section.checklist.map(item => <li key={item}>{item}</li>)}</ul>}
        {section.table && <div className="guide-table-scroll" role="region" aria-label={section.table.caption} tabIndex={0}><table className="guide-table"><caption>{section.table.caption}</caption><thead><tr>{section.table.headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th scope="row" key={index}>{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>}
        {section.template && <pre className="guide-template">{section.template}</pre>}
        {section.links && <div className="guide-context-links"><strong>Pour aller plus loin</strong>{section.links.map(link => <a href={link.url} key={link.url}>{link.label} <span aria-hidden="true">→</span></a>)}</div>}
        {section.sources && <div className="guide-sources">Sources officielles consultées le {dateLabel(guide.updated)}<ul>{section.sources.map(source => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul></div>}
      </section>)}
      {guide.faq && <section className="guide-section guide-faq" id="questions-frequentes"><h2>Questions fréquentes</h2>{guide.faq.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
      <section className="guide-cta"><p className="guide-kicker">La suite, sur MédiLink</p><h2>{guide.audience === 'Cabinets médicaux' ? 'Préparez votre prochain remplacement.' : 'Donnez une suite à vos recherches.'}</h2><p>{guide.cta.text}</p><a className="btn btn-primary" href={guide.cta.href}>{guide.cta.label} <span aria-hidden="true">→</span></a></section>
      <p className="guide-path-link"><a href={guide.audience === 'Cabinets médicaux' ? '/trouver-medecin-remplacant' : '/remplacement-medical'}>Découvrir le parcours {guide.audience === 'Cabinets médicaux' ? 'cabinet' : 'médecin remplaçant'} sur MédiLink →</a></p>
    </article></div>
    <section className="guide-related"><div className="guide-related-heading"><h2>Pour préparer la suite</h2><a href="/guides">Tous les guides →</a></div><div className="editorial-grid editorial-grid-related">{related.map(item => <GuideCard guide={item} key={item.slug} />)}</div></section>
  </main>;
}
