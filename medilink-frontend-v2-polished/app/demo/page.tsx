import type { Metadata } from 'next';
import DemoForm from './DemoForm';
import './demo.css';

export const metadata: Metadata = {
  title: 'Demander une démo — MédiLink',
  description: 'Découvrez comment MédiLink simplifie vos remplacements médicaux. Demandez une présentation adaptée à votre activité.',
};

export default function DemoPage() {
  return <div className="demo-page">
    <header className="demo-nav">
      <a className="demo-logo" href="/landing.html" aria-label="MédiLink — Accueil">Médi<em>Link</em></a>
      <a className="demo-back" href="/landing.html">← <span>Retour à l’accueil</span></a>
    </header>
    <main className="demo-layout">
      <section className="demo-intro" aria-labelledby="demo-title">
        <p className="demo-eyebrow"><span /> DÉCOUVRONS MÉDILINK ENSEMBLE</p>
        <h1 id="demo-title">Vos remplacements,<br /><em>l’esprit plus libre.</em></h1>
        <p className="demo-lead">Et si l’on vous montrait comment simplifier votre quotidien ? Découvrez MédiLink à travers une démo adaptée à votre façon d’exercer.</p>
        <ol className="demo-benefits">
          <li><span>01</span><div><h2>Partons de vos besoins</h2><p>Votre activité, votre organisation, vos attentes.</p></div></li>
          <li><span>02</span><div><h2>Découvrez votre futur quotidien</h2><p>Matching, échanges et suivi : un parcours concret, de bout en bout.</p></div></li>
          <li><span>03</span><div><h2>Prenez le temps d’échanger</h2><p>Posez vos questions et voyez ce qui vous correspond.</p></div></li>
        </ol>
        <div className="demo-note"><span aria-hidden="true">✳</span><p>Pour les médecins remplaçants,<br /><strong>les cabinets et les établissements de santé.</strong></p></div>
      </section>
      <section className="demo-card" aria-labelledby="demo-form-title">
        <p className="demo-card-kicker">FAISONS CONNAISSANCE</p>
        <h2 id="demo-form-title">Demander une démo</h2>
        <p className="demo-card-sub">Laissez-nous vos coordonnées. Notre équipe vous recontactera pour organiser votre présentation.</p>
        <DemoForm />
      </section>
    </main>
    <footer className="demo-footer"><span>MédiLink · Le remplacement médical, simplement.</span><a href="/landing.html">Découvrir la plateforme ↗</a></footer>
  </div>;
}
