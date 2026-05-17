'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from './ui';
import { roleLabel } from '@/lib/labels';

type NavItem = { href: string; label: string };

const candidateNav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/profile', label: 'Mon profil' },
  { href: '/app/search', label: 'Recherche' },
  { href: '/app/applications', label: 'Candidatures' },
  { href: '/app/messages', label: 'Messagerie' },
  { href: '/app/notifications', label: 'Notifications' },
];

const establishmentNav: NavItem[] = [
  { href: '/establishment/dashboard', label: 'Dashboard' },
  { href: '/establishment/onboarding', label: 'Etablissement' },
  { href: '/establishment/missions', label: 'Missions' },
  { href: '/establishment/missions/new', label: 'Creer mission' },
  { href: '/establishment/applications', label: 'Candidatures' },
  { href: '/establishment/messages', label: 'Messagerie' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/establishments', label: 'Etablissements' },
  { href: '/admin/missions', label: 'Missions' },
];

export function AppShell({ children, area }: { children: React.ReactNode; area: 'candidate' | 'establishment' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const nav = area === 'candidate' ? candidateNav : area === 'establishment' ? establishmentNav : adminNav;

  async function onLogout() {
    setMobileNavOpen(false);
    await logout();
    router.push('/login');
  }

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-head">
          <Link href="/" className="brand"><span className="brand-mark">M</span><span>Medilink</span></Link>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="sidebar-nav"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
            <span className="sr-only">Menu</span>
          </button>
        </div>
        <nav id="sidebar-nav" className={`sidebar-nav ${mobileNavOpen ? 'open' : ''}`}>
          <button type="button" className="mobile-menu-close" onClick={() => setMobileNavOpen(false)}>
            <span>Fermer</span>
            <span>x</span>
          </button>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <span>{roleLabel(user?.role)}</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <strong>{area === 'candidate' ? 'Espace candidat' : area === 'establishment' ? 'Espace etablissement' : 'Administration'}</strong>
            <div className="small">MVP connecte au backend</div>
          </div>
          <Button variant="light" onClick={onLogout}>Deconnexion</Button>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
