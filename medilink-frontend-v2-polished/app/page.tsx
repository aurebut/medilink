'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
  FileWarning,
  Headphones,
  MailX,
  Shield,
  User,
  Zap,
} from 'lucide-react';

const problems = [
  {
    icon: MailX,
    title: 'Informations dispersées',
    description:
      'Appels, emails et fichiers éparpillés. Chaque mission devient un puzzle à reconstituer manuellement.',
  },
  {
    icon: FileWarning,
    title: 'Documents difficiles',
    description:
      'CV, diplômes et attestations éparpillés. Vérification fastidieuse et partage peu sécurisé.',
  },
  {
    icon: CreditCard,
    title: 'Paiement hors suivi',
    description:
      "L'accord final et le paiement gérés en dehors du recrutement, sans traçabilité ni sécurité.",
  },
];

const features = [
  ['Missions', 'Publier un besoin court, clair et daté.'],
  ['Candidatures', 'Suivre les profils et les statuts reçus.'],
  ['Documents', 'Centraliser CV, diplômes et attestations.'],
  ['Messagerie', 'Garder le contexte de chaque échange.'],
  ['Proposition', 'Formaliser le montant et les conditions.'],
  ['Paiement', 'Sécuriser la confirmation de mission.'],
];

const candidatePath = [
  ['Complète son profil', 'CV, diplômes et attestations centralisés et vérifiés une fois pour toutes.'],
  ['Trouve une mission', 'Filtres par lieu, niveau de qualification et disponibilité personnelle.'],
  ['Postule et échange', "Messagerie contextuelle attachée à chaque mission, pas de perte d'information."],
  ['Accepte la proposition', 'Montant, dates et conditions formalisés. Paiement sécurisé garanti.'],
];

const establishmentPath = [
  ['Publie une mission', 'Définissez le profil recherché, les dates, le lieu et la rémunération.'],
  ['Consulte les candidatures', 'Accès instantané aux CV, diplômes et attestations des candidats.'],
  ['Échange avec les profils', 'Conversation contextualisée directement liée à la mission publiée.'],
  ["Confirme l'accord", 'Formalisation sécurisée et justificatifs automatiques générés.'],
];

const cycleSteps = [
  ['Mission publiée', 'Définition du besoin'],
  ['Candidature reçue', 'Profils et documents'],
  ['Échange centralisé', 'Messagerie dédiée'],
  ['Proposition finale', 'Montant et conditions'],
  ['Paiement sécurisé', 'Transaction protégée'],
  ['Justificatifs', 'Documents générés'],
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="landing-editorial bg-stone-50 text-stone-900 antialiased">
      <div className="grain" />

      <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-stone-50/90 backdrop-blur-sm' : ''}`}>
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-serif text-2xl font-medium tracking-tight text-stone-900">Médilink</span>
            </Link>

            <div className="hidden items-center gap-10 md:flex">
              <a href="#probleme" className="text-sm font-light tracking-wide text-stone-600 transition-colors duration-300 hover:text-stone-900">Le problème</a>
              <a href="#solution" className="text-sm font-light tracking-wide text-stone-600 transition-colors duration-300 hover:text-stone-900">La solution</a>
              <a href="#parcours" className="text-sm font-light tracking-wide text-stone-600 transition-colors duration-300 hover:text-stone-900">Parcours</a>
              <a href="#cycle" className="text-sm font-light tracking-wide text-stone-600 transition-colors duration-300 hover:text-stone-900">Processus</a>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/login" className="hidden text-sm font-light text-stone-500 transition-colors duration-300 hover:text-stone-900 md:block">Connexion</Link>
              <Link href="/register" className="btn-primary rounded-sm px-5 py-2.5 text-sm font-medium sm:px-6">Démarrer</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-end overflow-hidden bg-stone-50 pb-20 pt-32">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="space-y-10 lg:col-span-7">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Plateforme de remplacement médical</p>
                <div className="hairline-left mt-4 w-16" />
              </div>

              <h1 className="text-balance font-serif text-6xl font-light leading-[0.95] tracking-tight text-stone-900 md:text-7xl lg:text-8xl">
                Remplacements
                <br />
                médicaux,
                <br />
                <span className="italic text-stone-500">
                  sans échange
                  <br />
                  dispersé.
                </span>
              </h1>

              <p className="text-balance max-w-lg text-base font-light leading-relaxed text-stone-500 md:text-lg">
                Médilink centralise les missions courtes, les candidatures, les documents, la messagerie et le paiement sécurisé entre établissements et professionnels de santé.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/register" className="btn-primary rounded-sm px-8 py-3.5 text-sm font-medium tracking-wide">Je cherche une mission</Link>
                <Link href="/register" className="btn-secondary rounded-sm px-8 py-3.5 text-sm font-medium tracking-wide">Je publie une mission</Link>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm lg:aspect-[3/4]">
                <img
                  src="https://images.stockcake.com/public/0/c/6/0c6f8fa8856e3.jpg"
                  alt="Hall d'hôpital moderne, lumière naturelle"
                  className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/20 to-transparent" />
              </div>
              <div className="absolute -bottom-6 left-4 max-w-xs bg-stone-50 p-5 sm:-left-6 sm:p-6">
                <p className="font-serif text-3xl font-light text-stone-900">127%</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">de missions pourvues en moins de temps</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="probleme" className="bg-stone-50 py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="reveal lg:col-span-4">
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Le problème</p>
              <h2 className="text-balance font-serif text-4xl font-light leading-[1.1] text-stone-900 md:text-5xl">Trop de canaux pour une mission courte.</h2>
            </div>

            <div className="grid gap-12 md:grid-cols-3 lg:col-span-8">
              {problems.map(({ icon: Icon, title, description }) => (
                <div className="reveal space-y-6" key={title}>
                  <div className="flex h-8 w-8 items-center justify-center">
                    <Icon className="h-5 w-5 text-stone-400" strokeWidth={1.5} />
                  </div>
                  <div className="hairline-solid w-full" />
                  <h3 className="font-serif text-xl font-medium text-stone-900">{title}</h3>
                  <p className="text-sm font-light leading-relaxed text-stone-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="solution" className="bg-white py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid items-center gap-20 lg:grid-cols-2">
            <div className="reveal order-2 lg:order-1">
              <div className="relative">
                <img
                  src="https://kimi-web-img.moonshot.cn/img/thumbs.dreamstime.com/d42aca8991bbba2b73e148781299dd1cb171857e.jpg"
                  alt="Stéthoscope élégant"
                  className="aspect-[4/3] w-full rounded-sm object-cover"
                />
                <div className="absolute -bottom-8 right-4 max-w-xs bg-teal-900 p-6 text-stone-100 sm:-right-8 sm:p-8">
                  <p className="font-serif text-2xl font-light italic">"Un seul espace pour tout suivre."</p>
                </div>
              </div>
            </div>

            <div className="reveal order-1 space-y-12 lg:order-2">
              <div>
                <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">La réponse Médilink</p>
                <h2 className="text-balance mb-8 font-serif text-4xl font-light leading-[1.1] text-stone-900 md:text-5xl">Un espace unique pour suivre ce qui compte.</h2>
                <p className="max-w-md text-base font-light leading-relaxed text-stone-500">
                  La plateforme rapproche le recrutement, les pièces administratives et la formalisation de la mission, sans jamais disperser les informations importantes.
                </p>
              </div>

              <div className="space-y-8">
                {features.map(([title, description]) => (
                  <div className="feature-item" key={title}>
                    <h4 className="mb-1 font-serif text-lg font-medium text-stone-900">{title}</h4>
                    <p className="text-sm font-light text-stone-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="parcours" className="bg-stone-50 py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="reveal mx-auto mb-20 max-w-2xl text-center lg:mb-24">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Deux parcours</p>
            <h2 className="text-balance font-serif text-4xl font-light leading-[1.1] text-stone-900 md:text-5xl">Le même fil de mission, vu par chaque côté.</h2>
          </div>

          <div className="grid gap-16 lg:grid-cols-2">
            <PathColumn
              icon={<User className="h-4 w-4 text-stone-100" strokeWidth={1.5} />}
              label="Professionnels de santé"
              title="Trouver une mission fiable"
              items={candidatePath}
              cta="Je cherche une mission"
              ctaVariant="primary"
            />
            <PathColumn
              icon={<Building2 className="h-4 w-4 text-stone-100" strokeWidth={1.5} />}
              label="Établissements"
              title="Couvrir un besoin ponctuel"
              items={establishmentPath}
              cta="Je publie une mission"
              ctaVariant="secondary"
              darkIcon
            />
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      <section id="cycle" className="bg-white py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="reveal mx-auto mb-20 max-w-2xl text-center lg:mb-24">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Cycle complet</p>
            <h2 className="text-balance font-serif text-4xl font-light leading-[1.1] text-stone-900 md:text-5xl">De l'annonce au justificatif, le suivi reste lisible.</h2>
          </div>

          <div className="hidden md:block">
            <div className="relative">
              <div className="cycle-line absolute left-0 right-0 top-5" />
              <div className="relative grid grid-cols-6 gap-8">
                {cycleSteps.map(([title, detail]) => (
                  <div className="cycle-item reveal text-center" key={title}>
                    <div className="cycle-dot mx-auto mb-6" />
                    <p className="mb-1 font-serif text-lg font-medium text-stone-900">{title}</p>
                    <p className="text-xs font-light text-stone-400">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8 md:hidden">
            {cycleSteps.map(([title, detail]) => (
              <div className="reveal flex items-start gap-4" key={title}>
                <div className="cycle-dot mt-2 flex-shrink-0" />
                <div>
                  <p className="font-serif text-lg font-medium text-stone-900">{title}</p>
                  <p className="text-sm font-light text-stone-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative h-[60vh] overflow-hidden">
        <img
          src="https://kimi-web-img.moonshot.cn/img/static.vecteezy.com/c8c928cf635d4dabb722c6bdf4117c4766bc5794.jpeg"
          alt="Corridor d'hôpital minimaliste"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-900/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-8 text-center">
            <p className="text-balance font-serif text-3xl font-light italic leading-tight text-white md:text-5xl">"L'essentiel est de ne rien perdre<br />en chemin."</p>
          </div>
        </div>
      </section>

      <section className="bg-teal-950 py-28 lg:py-32">
        <div className="reveal mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
          <h2 className="mb-6 font-serif text-5xl font-light text-stone-100 md:text-6xl">Médilink</h2>
          <p className="mb-4 text-lg font-light leading-relaxed text-stone-400 md:text-xl">Une plateforme sobre pour organiser les missions médicales courtes.</p>
          <p className="mx-auto mb-16 max-w-lg text-sm font-light text-stone-500">
            Pour les gardes, remplacements, vacations et renforts ponctuels. Conçue pour les professionnels de santé et leurs établissements.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/register" className="rounded-sm bg-stone-100 px-10 py-4 text-sm font-medium tracking-wide text-teal-950 transition-colors duration-300 hover:bg-white">Créer un compte professionnel</Link>
            <Link href="/register" className="rounded-sm border border-stone-600 px-10 py-4 text-sm font-medium tracking-wide text-stone-300 transition-colors duration-300 hover:border-stone-400 hover:text-stone-100">Inscrire mon établissement</Link>
          </div>

          <div className="mt-16 grid gap-5 text-xs uppercase tracking-wide text-stone-500 sm:mt-20 sm:flex sm:items-center sm:justify-center sm:gap-12">
            <TrustItem icon={<Shield className="h-3 w-3" strokeWidth={1.5} />} label="Données sécurisées" />
            <TrustItem icon={<Zap className="h-3 w-3" strokeWidth={1.5} />} label="Mise en place rapide" />
            <TrustItem icon={<Headphones className="h-3 w-3" strokeWidth={1.5} />} label="Support dédié" />
          </div>
        </div>
      </section>

      <footer className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-20 grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <span className="font-serif text-2xl font-light text-stone-300">Médilink</span>
              <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-stone-600">
                Plateforme de remplacement médical qui centralise les missions courtes, les candidatures, les documents et le paiement sécurisé.
              </p>
            </div>

            <FooterColumn title="Professionnels" links={['Trouver une mission', 'Mon profil', 'Mes documents', 'Messagerie']} className="md:col-span-3 md:col-start-7" />
            <FooterColumn title="Établissements" links={['Publier une mission', 'Candidatures', 'Paiement sécurisé', 'Justificatifs']} className="md:col-span-3" />
          </div>

          <div className="hairline-solid mb-8 w-full" />

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs font-light text-stone-700">© 2026 Médilink. Tous droits réservés.</p>
            <div className="flex gap-8">
              <a href="#" className="text-xs font-light text-stone-700 transition-colors hover:text-stone-400">Mentions légales</a>
              <a href="#" className="text-xs font-light text-stone-700 transition-colors hover:text-stone-400">Confidentialité</a>
              <a href="#" className="text-xs font-light text-stone-700 transition-colors hover:text-stone-400">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PathColumn({
  icon,
  label,
  title,
  items,
  cta,
  ctaVariant,
  darkIcon = false,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  items: string[][];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  darkIcon?: boolean;
}) {
  return (
    <div className="reveal space-y-12">
      <div className="flex items-center gap-4 border-b border-stone-200 pb-6">
        <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${darkIcon ? 'bg-stone-800' : 'bg-teal-900'}`}>{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">{label}</p>
          <h3 className="font-serif text-2xl font-medium text-stone-900">{title}</h3>
        </div>
      </div>

      <div className="space-y-10">
        {items.map(([itemTitle, description], index) => (
          <div className="flex gap-6" key={itemTitle}>
            <span className="path-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="pt-2">
              <h4 className="mb-2 font-serif text-lg font-medium text-stone-900">{itemTitle}</h4>
              <p className="text-sm font-light leading-relaxed text-stone-500">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/register" className={`inline-block rounded-sm px-8 py-3.5 text-sm font-medium tracking-wide ${ctaVariant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}>
        {cta}
      </Link>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function FooterColumn({ title, links, className }: { title: string; links: string[]; className: string }) {
  return (
    <div className={className}>
      <h4 className="mb-6 text-xs uppercase tracking-[0.2em] text-stone-500">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-sm font-light text-stone-600 transition-colors hover:text-stone-300">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
