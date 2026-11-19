/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Full document navigation between isolated root layouts; fixed-size fixture images. */
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { ApercuAgenda } from '@/components/apercu/ApercuAgenda';
import { ApercuNav } from '@/components/apercu/ApercuNav';
import { ApercuReveal } from '@/components/apercu/ApercuReveal';
import { ApercuShowcase } from '@/components/apercu/ApercuShowcase';
import { contributors, criteria, faqGroups, footerColumns } from '@/content/apercu-content';
import './apercu.css';

export const metadata: Metadata = {
  title: { absolute: 'Aperçu design — MédiLink' },
  alternates: { canonical: '/' },
};

const Arrow = () => <svg className="ap-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m3.5 8.4 3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

// Each word lights up in turn as the sentence crosses the screen (where scroll-linked animation exists).
function Lit({ text, from = 0, accent = false }: { text: string; from?: number; accent?: boolean }) {
  return <>{text.split(' ').map((word, index) => <span className={accent ? 'ap-lit ap-lit--accent' : 'ap-lit'} style={{ '--i': from + index } as CSSProperties} key={`${from}-${index}`}>{word}{' '}</span>)}</>;
}

export default function Page() {
  return <>
    <a className="ap-skip" href="#main-content">Aller au contenu</a>
    <ApercuNav />
    <main id="main-content">
      <section className="ap-hero" aria-labelledby="ap-hero-title">
        <div className="ap-hero-lines" aria-hidden="true" />
        <div className="ap-wrap ap-hero-copy">
          <p className="ap-hero-kicker">Le remplacement médical, de la recherche à la transmission.</p>
          <h1 id="ap-hero-title"><span>La plateforme de remplacement</span> <span>conçue <em>avec</em> et <em>pour</em></span> <span>les médecins généralistes</span></h1>
          <div className="ap-hero-row">
            <p className="ap-hero-sub">MédiLink rapproche médecins remplaçants et cabinets selon leurs disponibilités et leurs conditions d’exercice.</p>
            <div className="ap-hero-actions">
              <a className="ap-btn ap-btn--peach" href="/demo">Demander une démo <Arrow /></a>
              <a className="ap-textlink" href="#parcours">Comment ça marche</a>
            </div>
          </div>
        </div>
        <div className="ap-wrap"><ApercuAgenda /></div>
      </section>

      <section className="ap-statement" aria-labelledby="ap-statement-title">
        <div className="ap-wrap">
          <h2 id="ap-statement-title">
            <Lit text="Gérez chaque mission au même endroit, sans vous éparpiller," />
            <Lit text="avant," from={9} accent /><Lit text="pendant" from={10} accent /><Lit text="et" from={11} /><Lit text="après" from={12} accent /><Lit text="le remplacement." from={13} />
          </h2>
        </div>
      </section>

      <section className="ap-chapters" id="parcours" aria-label="Les trois temps du remplacement">
        <article className="ap-chapter ap-chapter--avant">
          <div className="ap-wrap ap-chapter-grid">
            <div className="ap-chapter-copy" data-reveal>
              <p className="ap-chapter-when"><span>01</span> Avant</p>
              <h3>Matchez</h3>
              <p className="ap-lead">Nous vous rapprochons selon vos critères.</p>
              <dl className="ap-points">
                <div><dt>Remplaçant</dt><dd>Indiquez vos disponibilités et vos préférences.</dd></div>
                <div><dt>Établissement</dt><dd>Décrivez votre besoin et vos critères d’exercice.</dd></div>
              </dl>
            </div>
            <div className="ap-match" data-reveal role="img" aria-label="Illustration : les critères du cabinet et ceux du médecin remplaçant s’alignent — dates, lieu, spécialité, logiciel, horaires et conditions.">
              <div className="ap-match-party ap-match-party--cabinet" aria-hidden="true">
                <img src="/landing-assets/people/cabinet-des-tilleuls.webp" alt="" width="120" height="80" loading="lazy" />
                <strong>Cabinet des Tilleuls</strong><span>Paris</span>
              </div>
              <div className="ap-match-sheet" aria-hidden="true">
                <p className="ap-match-title">Les critères <em>s’alignent.</em></p>
                <ul>{criteria.map((name, index) => <li key={name} style={{ '--i': index } as CSSProperties}><span>{name}</span><i><Check /></i></li>)}</ul>
                <p className="ap-match-foot">Une compatibilité expliquée.</p>
              </div>
              <div className="ap-match-party ap-match-party--doctor" aria-hidden="true">
                <img src="/landing-assets/people/sarah-bernard.webp" alt="" width="80" height="80" loading="lazy" />
                <strong>Dre Sarah Bernard</strong><span>Médecin remplaçante</span>
              </div>
              <p className="ap-fiction" aria-hidden="true">Illustration · données fictives</p>
            </div>
          </div>
        </article>

        <article className="ap-chapter ap-chapter--pendant">
          <div className="ap-wrap">
            <div className="ap-chapter-copy ap-chapter-copy--wide" data-reveal>
              <div>
                <p className="ap-chapter-when"><span>02</span> Pendant</p>
                <h3>Pilotez</h3>
              </div>
              <p className="ap-lead">Un seul endroit pour un remplacement serein : le suivi, les échanges et les documents de la mission.</p>
            </div>
            <div data-reveal><ApercuShowcase /></div>
          </div>
        </article>

        <article className="ap-chapter ap-chapter--apres">
          <div className="ap-wrap ap-chapter-grid ap-chapter-grid--flip">
            <div className="ap-chapter-copy" data-reveal>
              <p className="ap-chapter-when"><span>03</span> Après</p>
              <h3>Concluez</h3>
              <p className="ap-lead">Terminez le remplacement l’esprit tranquille.</p>
              <dl className="ap-points">
                <div><dt>Paiement</dt><dd>Validez le règlement du remplacement.</dd></div>
                <div><dt>Bilan</dt><dd>Retrouvez toute la mission dans un récapitulatif clair.</dd></div>
              </dl>
            </div>
            <div className="ap-recap" data-reveal role="img" aria-label="Exemple illustratif de bilan de fin de mission : du 14 au 18 septembre, 5 jours, 90 consultations, paiement confirmé et transmissions réunies.">
              <div className="ap-recap-sheet" aria-hidden="true">
                <header><span className="ap-tag">Exemple de bilan</span><span className="ap-mono">14 – 18 septembre</span></header>
                <p className="ap-recap-title">Toute la mission, <em>en un regard.</em></p>
                <div className="ap-recap-figures">
                  <div><strong>5</strong><span>jours</span></div>
                  <div><strong>90</strong><span>consultations</span></div>
                </div>
                <ul>
                  <li><i><Check /></i> Paiement confirmé</li>
                  <li><i><Check /></i> Transmissions réunies</li>
                </ul>
              </div>
              <div className="ap-recap-transfer" aria-hidden="true">
                <span className="ap-mono">Rétrocession</span>
                <div><img src="/landing-assets/people/cabinet-des-tilleuls.webp" alt="" width="36" height="36" loading="lazy" /><i /><img src="/landing-assets/people/sarah-bernard.webp" alt="" width="36" height="36" loading="lazy" /></div>
                <p>De l’établissement au médecin remplaçant.</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="ap-contributors" aria-labelledby="ap-contributors-title">
        <div className="ap-wrap">
          <header className="ap-section-head" data-reveal>
            <p className="ap-kicker">Les médecins contributeurs</p>
            <h2 id="ap-contributors-title">Des médecins ont participé au <em>développement de la plateforme.</em></h2>
          </header>
          <div className="ap-contributor-list" role="list">
            {contributors.map((person, index) => <figure className="ap-contributor" role="listitem" data-reveal key={person.photo} style={{ '--i': index } as CSSProperties}>
              <div className="ap-contributor-photo"><img src={person.photo} width="314" height="218" alt="Portrait d’illustration à remplacer par celui du médecin contributeur" loading="lazy" decoding="async" /><span>Portrait d’illustration</span></div>
              <figcaption>
                <strong>Dr [Prénom Nom]</strong>
                <span>Spécialité · Mode d’exercice à renseigner</span>
                <p>Ce qu’il ou elle a aidé à définir : à compléter avec son rôle dans la conception.</p>
              </figcaption>
            </figure>)}
          </div>
        </div>
      </section>

      <section className="ap-paths" aria-labelledby="ap-paths-title">
        <div className="ap-wrap">
          <header className="ap-section-head" data-reveal>
            <p className="ap-kicker">Votre recherche</p>
            <h2 id="ap-paths-title">Vous cherchez une mission <em>ou un remplaçant ?</em></h2>
          </header>
          <div className="ap-path-grid">
            <article className="ap-path ap-path--doctor" data-reveal>
              <p className="ap-path-who">Médecin remplaçant</p>
              <h3>Choisissez vos remplacements avec les informations qui comptent.</h3>
              <p>Consultez les dates, l’organisation du cabinet et les conditions proposées.</p>
              <a className="ap-btn ap-btn--ink" href="/remplacement-medical">Découvrir le parcours remplaçant <Arrow /></a>
              <div className="ap-path-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="ap-path ap-path--cabinet" data-reveal>
              <p className="ap-path-who">Cabinet / médecin installé</p>
              <h3>Présentez votre besoin avant les premiers échanges.</h3>
              <p>Précisez les dates à couvrir et le fonctionnement de votre cabinet.</p>
              <a className="ap-btn ap-btn--ink" href="/trouver-medecin-remplacant">Découvrir le parcours cabinet <Arrow /></a>
              <div className="ap-path-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
          </div>
        </div>
      </section>

      <section className="ap-faq" id="faq" aria-labelledby="ap-faq-title">
        <div className="ap-wrap ap-faq-grid">
          <header className="ap-section-head" data-reveal>
            <p className="ap-kicker">Questions fréquentes</p>
            <h2 id="ap-faq-title">Vos questions <em>avant de commencer.</em></h2>
          </header>
          <div className="ap-faq-groups">
            {faqGroups.map(group => <div className="ap-faq-group" data-reveal key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map(item => <details key={item.question}>
                <summary>{item.question}<i aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>)}
            </div>)}
          </div>
        </div>
      </section>

      <section className="ap-cta" aria-labelledby="ap-cta-title">
        <div className="ap-wrap">
          <div className="ap-cta-panel" data-reveal>
            <div className="ap-cta-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <h2 id="ap-cta-title">Découvrez comment préparer votre prochain remplacement <em>avec MédiLink.</em></h2>
            <a className="ap-btn ap-btn--peach" href="/demo">Demander une démo <Arrow /></a>
          </div>
        </div>
      </section>
    </main>

    <footer className="ap-footer">
      <div className="ap-wrap">
        <div className="ap-footer-top">
          <div className="ap-footer-brand">
            <a className="ap-logo" href="/" aria-label="MédiLink — Accueil">Médi<em>Link</em></a>
            <p>MédiLink réunit médecins remplaçants et cabinets pour trouver, préparer et suivre leurs remplacements.</p>
          </div>
          {footerColumns.map(column => <nav className="ap-footer-col" aria-label={column.title} key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map(link => <a href={link.href} key={link.label}>{link.label}</a>)}
          </nav>)}
        </div>
        <div className="ap-footer-bottom"><span>© 2026 MédiLink</span><span>Remplacements médicaux · France</span></div>
      </div>
    </footer>
    <ApercuReveal />
  </>;
}
