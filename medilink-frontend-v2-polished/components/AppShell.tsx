'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { roleLabel } from '@/lib/labels';
import { useAuth } from './AuthProvider';

type NavItem = { href: string; label: string; icon: string };

const candidateNav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/app/profile', label: 'Mon profil', icon: 'P' },
  { href: '/app/search', label: 'Recherche', icon: 'R' },
  { href: '/app/applications', label: 'Candidatures', icon: 'C' },
  { href: '/app/messages', label: 'Messagerie', icon: 'M' },
  { href: '/app/notifications', label: 'Notifications', icon: 'N' },
];

const establishmentNav: NavItem[] = [
  { href: '/establishment/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/establishment/onboarding', label: 'Etablissement', icon: 'E' },
  { href: '/establishment/missions', label: 'Missions', icon: 'M' },
  { href: '/establishment/missions/new', label: 'Creer mission', icon: '+' },
  { href: '/establishment/applications', label: 'Candidatures', icon: 'C' },
  { href: '/establishment/messages', label: 'Messagerie', icon: 'M' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/admin/users', label: 'Utilisateurs', icon: 'U' },
  { href: '/admin/documents', label: 'Documents', icon: 'F' },
  { href: '/admin/establishments', label: 'Etablissements', icon: 'E' },
  { href: '/admin/missions', label: 'Missions', icon: 'M' },
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

function profileHref(area: 'candidate' | 'establishment' | 'admin') {
  if (area === 'candidate') return '/app/profile';
  if (area === 'establishment') return '/establishment/onboarding';
  return '/admin/users';
}

function accountHref(area: 'candidate' | 'establishment' | 'admin') {
  if (area === 'candidate') return '/app/account';
  if (area === 'establishment') return '/establishment/account';
  return '/admin/account';
}

function homeHref(area: 'candidate' | 'establishment' | 'admin') {
  if (area === 'candidate') return '/app/dashboard';
  if (area === 'establishment') return '/establishment/dashboard';
  return '/admin/dashboard';
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const nav = area === 'candidate' ? candidateNav : area === 'establishment' ? establishmentNav : adminNav;
  const userProfileHref = profileHref(area);
  const userAccountHref = accountHref(area);
  const userHomeHref = homeHref(area);

  async function onLogout() {
    setMobileNavOpen(false);
    setAccountMenuOpen(false);
    await logout();
    router.push('/login');
  }

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    }

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Link href={userHomeHref} className="brand">
            <span className="brand-mark">M</span>
            <span>
              Medi<em>Link</em>
            </span>
          </Link>
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

          <div className="mobile-menu-account">
            <div className="mobile-menu-user">
              <span className="avatar">{initials(user?.email)}</span>
              <span className="truncate">
                <strong>{user?.email || 'Utilisateur'}</strong>
                <br />
                <span>{roleLabel(user?.role)}</span>
              </span>
            </div>
            <div className="mobile-menu-actions">
              <Link href={userProfileHref} className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
                <span>Mon profil</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              <Link href={userAccountHref} className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
                <span>Parametres du compte</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              <button type="button" className="account-menu-item danger" onClick={onLogout}>
                <span>Deconnexion</span>
                <span className="menu-arrow">&gt;</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer" ref={accountMenuRef}>
          {accountMenuOpen ? (
            <div className="account-menu" role="menu">
              <div className="account-menu-head">
                <span className="avatar">{initials(user?.email)}</span>
                <span className="truncate">
                  <strong>{user?.email || 'Utilisateur'}</strong>
                  <br />
                  <span>{roleLabel(user?.role)}</span>
                </span>
              </div>
              <div className="account-menu-section">
                <Link href={userProfileHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Mon profil</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link href={userAccountHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Parametres du compte</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link href={userAccountHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Securite et mot de passe</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
              </div>
              <button type="button" className="account-menu-item danger" role="menuitem" onClick={onLogout}>
                <span>Deconnexion</span>
                <span className="menu-arrow">&gt;</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className={`user-chip ${accountMenuOpen ? 'open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setAccountMenuOpen((open) => !open);
            }}
          >
            <span className="avatar">{initials(user?.email)}</span>
            <span className="truncate">
              <strong>{user?.email || 'Utilisateur'}</strong>
              <br />
              <span>{roleLabel(user?.role)}</span>
            </span>
            <span className="user-chip-arrow">v</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{areaLabel(area)}</strong>
            <div className="small">Plateforme MediLink</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
