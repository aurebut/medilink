'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { roleLabel } from '@/lib/labels';
import { useAuth } from './AuthProvider';
import { Badge, Button } from './ui';

type NavItem = { href: string; label: string; icon: string };

const candidateNav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/app/profile', label: 'Mon profil', icon: '◉' },
  { href: '/app/search', label: 'Recherche', icon: '⌕' },
  { href: '/app/applications', label: 'Candidatures', icon: '✓' },
  { href: '/app/messages', label: 'Messagerie', icon: '✉' },
  { href: '/app/notifications', label: 'Notifications', icon: '•' },
];

const establishmentNav: NavItem[] = [
  { href: '/establishment/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/establishment/onboarding', label: 'Etablissement', icon: '◆' },
  { href: '/establishment/missions', label: 'Missions', icon: '≡' },
  { href: '/establishment/missions/new', label: 'Creer mission', icon: '+' },
  { href: '/establishment/applications', label: 'Candidatures', icon: '✓' },
  { href: '/establishment/messages', label: 'Messagerie', icon: '✉' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '◉' },
  { href: '/admin/documents', label: 'Documents', icon: '□' },
  { href: '/admin/establishments', label: 'Etablissements', icon: '◆' },
  { href: '/admin/missions', label: 'Missions', icon: '≡' },
];

function areaLabel(area: 'candidate' | 'establishment' | 'admin') {
  if (area === 'candidate') return 'Espace candidat';
  if (area === 'establishment') return 'Espace etablissement';
  return 'Administration';
}

function initials(email?: string) {
  if (!email) return 'M';
  return email.slice(0, 1).toUpperCase();
}

export function AppShell({
  children,
  area,
}: {
  children: React.ReactNode;
  area: 'candidate' | 'establishment' | 'admin';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const nav = area === 'candidate' ? candidateNav : area === 'establishment' ? establishmentNav : adminNav;

  async function onLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-head">
          <Link href="/" className="brand">
            <span className="brand-mark">M</span>
            <span>Medilink</span>
          </Link>
          <button
            type="button"
            className="mobile-menu-button"
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
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="nav-main">
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{initials(user?.email)}</span>
            <span className="truncate">
              <strong>{user?.email || 'Utilisateur'}</strong>
              <br />
              <span>{roleLabel(user?.role)}</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{areaLabel(area)}</strong>
            <div className="small">Plateforme Medilink</div>
          </div>
          <div className="actions">
            <Badge tone="success">API connectee</Badge>
            <Button variant="light" onClick={onLogout}>Deconnexion</Button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
