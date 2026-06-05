'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { candidateAreaLabel } from '@/lib/grammar';
import { roleLabel } from '@/lib/labels';
import type { Notification, Profile } from '@/lib/types';
import { useAuth } from './AuthProvider';

type NavItem = { href: string; label: string; icon: string };

const candidateNav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/app/agenda', label: 'Agenda', icon: 'A' },
  { href: '/app/billing', label: 'Facturation', icon: 'F' },
  { href: '/app/search', label: 'Recherche', icon: 'R' },
  { href: '/app/messages', label: 'Messagerie', icon: 'M' },
];

const establishmentNav: NavItem[] = [
  { href: '/establishment/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/establishment/onboarding', label: 'Établissement', icon: 'E' },
  { href: '/establishment/missions', label: 'Missions', icon: 'M' },
  { href: '/establishment/missions/new', label: 'Créer mission', icon: '+' },
  { href: '/establishment/applications', label: 'Candidatures', icon: 'C' },
  { href: '/establishment/messages', label: 'Messagerie', icon: 'M' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/admin/users', label: 'Utilisateurs', icon: 'U' },
  { href: '/admin/documents', label: 'Documents', icon: 'F' },
  { href: '/admin/establishments', label: 'Établissements', icon: 'E' },
  { href: '/admin/missions', label: 'Missions', icon: 'M' },
];

function areaLabel(area: 'candidate' | 'establishment' | 'admin', profile?: Pick<Profile, 'candidateGender'> | null) {
  if (area === 'candidate') return candidateAreaLabel(profile);
  if (area === 'establishment') return 'Espace établissement';
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
  const [candidateProfile, setCandidateProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const nav = area === 'candidate' ? candidateNav : area === 'establishment' ? establishmentNav : adminNav;
  const userProfileHref = profileHref(area);
  const userAccountHref = accountHref(area);
  const userHomeHref = homeHref(area);
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;

  async function onLogout() {
    setMobileNavOpen(false);
    setAccountMenuOpen(false);
    setNotificationsOpen(false);
    await logout();
    router.push('/login');
  }

  async function loadNotifications() {
    if (area !== 'candidate') return;

    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      setNotifications(await api.get<Notification[]>('/notifications'));
    } catch (e: any) {
      setNotificationsError(e.message);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function deleteNotification(id: string) {
    const deletedNotification = notifications.find((notification) => notification.id === id);
    const deletedIndex = notifications.findIndex((notification) => notification.id === id);

    setNotifications((items) => items.filter((notification) => notification.id !== id));
    setNotificationsError(null);

    try {
      await api.delete(`/notifications/${id}`);
    } catch (e: any) {
      if (deletedNotification) {
        setNotifications((items) => {
          if (items.some((notification) => notification.id === id)) return items;
          const restored = [...items];
          restored.splice(Math.max(deletedIndex, 0), 0, deletedNotification);
          return restored;
        });
      }
      setNotificationsError(e.message);
    }
  }

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setNotificationsOpen(false);
      }
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
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (area !== 'candidate') {
      setNotifications([]);
      setNotificationsOpen(false);
      return;
    }

    void loadNotifications();
  }, [area]);

  useEffect(() => {
    if (area !== 'candidate' || user?.role !== 'CANDIDATE') {
      setCandidateProfile(null);
      return;
    }

    api.get<Profile>('/me/profile')
      .then(setCandidateProfile)
      .catch(() => setCandidateProfile(null));
  }, [area, user?.role]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Link href={userHomeHref} className="brand">
            <span>
              Medi<em>Link</em>
            </span>
          </Link>
        </div>

        <nav id="sidebar-nav" className={`sidebar-nav ${mobileNavOpen ? 'open' : ''}`}>
          {nav.map((item) => {
            const active = pathname === item.href
              || pathname.startsWith(`${item.href}/`)
              || (area === 'candidate' && item.href === '/app/agenda' && pathname.startsWith('/app/missions/'));
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
                <span>{roleLabel(user?.role, candidateProfile)}</span>
              </span>
            </div>
            <div className="mobile-menu-actions">
              <Link href={userProfileHref} className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
                <span>Mon profil</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              <Link href={userAccountHref} className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
                <span>Paramètres du compte</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              {area === 'candidate' ? (
                <Link href="/app/notifications" className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
                  <span>Notifications</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
              ) : null}
              <button type="button" className="account-menu-item danger" onClick={onLogout}>
                <span>Déconnexion</span>
                <span className="menu-arrow">&gt;</span>
              </button>
            </div>
          </div>
        </nav>

        {area === 'candidate' ? (
          <div className="notification-menu-wrap" ref={notificationsRef}>
            {notificationsOpen ? (
              <div className="notification-menu" role="dialog" aria-label="Notifications recentes">
                <div className="notification-menu-head">
                  <div>
                    <strong>Notifications</strong>
                    <span>{unreadNotifications > 0 ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}` : 'Tout est lu'}</span>
                  </div>
                  <Link href="/app/notifications" className="notification-menu-link" onClick={() => setNotificationsOpen(false)}>
                    Voir plus
                  </Link>
                </div>

                <div className="notification-menu-list">
                  {notificationsLoading ? (
                    <div className="notification-menu-empty">Chargement...</div>
                  ) : notificationsError ? (
                    <div className="notification-menu-empty error">{notificationsError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-menu-empty">Aucune notification.</div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className={`notification-menu-item ${notification.readAt ? '' : 'unread'}`}>
                        <div className="notification-menu-item-head">
                          <strong>{notification.title}</strong>
                          <span className="notification-menu-item-meta">
                            <span>{formatDateTime(notification.createdAt)}</span>
                            <button
                              type="button"
                              className="notification-delete-button"
                              aria-label={`Supprimer la notification ${notification.title}`}
                              onClick={() => void deleteNotification(notification.id)}
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 16H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </span>
                        </div>
                        <p>{notification.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className={`notification-bell ${notificationsOpen ? 'open' : ''}`}
              aria-label="Ouvrir les notifications"
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setAccountMenuOpen(false);
                setNotificationsOpen((open) => !open);
                if (!notificationsOpen) void loadNotifications();
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotifications > 0 ? <span className="notification-dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span> : null}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileNavOpen}
          aria-controls="sidebar-nav"
          onClick={() => {
            setNotificationsOpen(false);
            setMobileNavOpen((open) => !open);
          }}
        >
          <span />
          <span />
          <span />
          <span className="sr-only">Menu</span>
        </button>

        <div className="sidebar-footer" ref={accountMenuRef}>
          {accountMenuOpen ? (
            <div className="account-menu" role="menu">
              <div className="account-menu-head">
                <span className="avatar">{initials(user?.email)}</span>
                <span className="truncate">
                  <strong>{user?.email || 'Utilisateur'}</strong>
                  <br />
                  <span>{roleLabel(user?.role, candidateProfile)}</span>
                </span>
              </div>
              <div className="account-menu-section">
                <Link href={userProfileHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Mon profil</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link href={userAccountHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Paramètres du compte</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link href={userAccountHref} className="account-menu-item" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                  <span>Sécurité et mot de passe</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
              </div>
              <button type="button" className="account-menu-item danger" role="menuitem" onClick={onLogout}>
                <span>Déconnexion</span>
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
              setNotificationsOpen(false);
              setAccountMenuOpen((open) => !open);
            }}
          >
            <span className="avatar">{initials(user?.email)}</span>
            <span className="truncate">
              <strong>{user?.email || 'Utilisateur'}</strong>
              <br />
              <span>{roleLabel(user?.role, candidateProfile)}</span>
            </span>
            <span className="user-chip-arrow">v</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{areaLabel(area, candidateProfile)}</strong>
            <div className="small">Plateforme MediLink</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
