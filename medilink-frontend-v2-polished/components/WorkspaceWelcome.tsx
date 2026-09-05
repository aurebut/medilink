import Image from 'next/image';

/** Shared landing artwork is decorative, never a substitute for a user's photo. */
export function WorkspaceWelcome({ title, description, area }: {
  title: string;
  description: string;
  area: 'candidate' | 'establishment';
}) {
  return (
    <header className="workspace-welcome">
      <div className="workspace-welcome-copy">
        <span className="workspace-eyebrow">{area === 'candidate' ? 'Votre espace médecin' : 'Votre espace cabinet'}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="workspace-welcome-art" aria-hidden="true">
        <Image src="/landing-assets/hero-medecin.png" alt="" fill sizes="(max-width: 640px) 100vw, 360px" />
        <span>Plus de place <em>pour le soin.</em></span>
      </div>
    </header>
  );
}
