'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, primeApiCache, subscribeApiCache } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { candidateAreaLabel } from '@/lib/grammar';
import { roleLabel } from '@/lib/labels';
import type { CandidateDashboardData, Conversation, EstablishmentDashboardData, Notification, Profile } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useAuth } from './AuthProvider';

type NavItem = { href: string; label: string; icon: string };

const candidateNav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/app/agenda', label: 'Agenda', icon: 'A' },
  { href: '/app/current-missions', label: 'Missions en cours', icon: '>' },
  { href: '/app/billing', label: 'Ma compta', icon: 'C' },
  { href: '/app/search', label: 'Annonce et candidature', icon: 'A' },
  { href: '/app/messages', label: 'Messagerie', icon: 'M' },
];

const establishmentNav: NavItem[] = [
  { href: '/establishment/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/establishment/agenda', label: 'Agenda', icon: 'A' },
  { href: '/establishment/missions', label: 'Annonce et candidature', icon: 'A' },
  { href: '/establishment/current-missions', label: 'Missions en cours', icon: '>' },
  { href: '/establishment/billing', label: 'Ma compta', icon: 'C' },
  { href: '/establishment/messages', label: 'Messagerie', icon: 'M' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'D' },
  { href: '/admin/users', label: 'Utilisateurs', icon: 'U' },
  { href: '/admin/documents', label: 'Documents', icon: 'F' },
  { href: '/admin/establishments', label: 'Établissements', icon: 'E' },
  { href: '/admin/missions', label: 'Missions', icon: 'M' },
];

const WARMED_PATH_TTL_MS = 60_000;
const warmedPaths = new Map<string, number>();

function warmApi(paths: string[]) {
  const now = Date.now();
  paths.forEach((path) => {
    const warmedAt = warmedPaths.get(path);
    if (warmedAt && now - warmedAt < WARMED_PATH_TTL_MS) return;
    warmedPaths.set(path, now);
    api.preload(path);
  });
}

function idleWarm(paths: string[]) {
  if (typeof window === 'undefined') return;

  const warm = () => warmApi(paths);
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(warm, { timeout: 1800 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(warm, 500);
  return () => window.clearTimeout(id);
}

function prefetchRoutes(router: ReturnType<typeof useRouter>, hrefs: string[]) {
  hrefs.forEach((href) => router.prefetch(href));
}

function primeCandidateDashboard(data: CandidateDashboardData) {
  primeApiCache('/me/profile', data.profile);
  primeApiCache('/me/documents', data.documents);
  primeApiCache('/me/applications', data.applications);
  primeApiCache('/conversations', data.conversations);
  primeApiCache('/notifications', data.notifications);
}

function primeEstablishmentDashboard(data: EstablishmentDashboardData) {
  if (data.establishment) {
    primeApiCache('/establishments/me', [data.establishment]);
    primeApiCache(`/establishment/applications?establishmentId=${data.establishment.id}`, data.applications);
    primeApiCache(`/missions/mine?establishmentId=${data.establishment.id}`, data.missions);
  }
  primeApiCache('/conversations', data.conversations);
}

function warmCandidateWorkspace() {
  void api.get<CandidateDashboardData>('/me/dashboard')
    .then(primeCandidateDashboard)
    .catch(() => undefined);
  void api.get<Conversation[]>('/conversations')
    .then((items) => items.slice(0, 3).forEach((item) => api.preload(`/conversations/${item.id}/messages`)))
    .catch(() => undefined);
  warmApi([
    '/missions?limit=50',
    '/me/profile',
    '/me/documents',
    '/me/applications',
    '/conversations',
    '/notifications',
  ]);
}

function warmEstablishmentWorkspace() {
  void api.get<EstablishmentDashboardData>('/establishment/dashboard')
    .then(primeEstablishmentDashboard)
    .catch(() => undefined);
  void api.get<Conversation[]>('/conversations')
    .then((items) => items.slice(0, 3).forEach((item) => api.preload(`/conversations/${item.id}/messages`)))
    .catch(() => undefined);
  warmApi([
    '/establishments/me',
    '/conversations',
    '/notifications',
  ]);
}

function warmPathsForRoute(area: 'candidate' | 'establishment' | 'admin', href: string) {
  if (area === 'candidate') {
    if (href === '/app/dashboard') return ['/me/dashboard'];
    if (href === '/app/search') return ['/missions?limit=50'];
    if (href === '/app/profile') return ['/me/profile', '/me/documents'];
    if (href === '/app/notifications') return ['/notifications'];
    if (href === '/app/messages') return ['/conversations'];
    if (href === '/app/agenda' || href === '/app/current-missions' || href === '/app/billing' || href === '/app/missions') {
      return ['/me/applications', '/conversations'];
    }
  }

  if (area === 'establishment') {
    if (href === '/establishment/dashboard') return ['/establishment/dashboard'];
    if (href === '/establishment/notifications') return ['/notifications'];
    if (href === '/establishment/messages') return ['/conversations'];
    if (
      href === '/establishment/agenda' ||
      href === '/establishment/missions' ||
      href === '/establishment/current-missions' ||
      href === '/establishment/billing' ||
      href === '/establishment/onboarding'
    ) {
      return ['/establishment/dashboard', '/conversations'];
    }
  }

  return [];
}

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

function getNotificationLink(notification: Notification, area: 'candidate' | 'establishment' | 'admin') {
  if (!notification.data) return null;
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    if (area === 'candidate') return `/app/messages?id=${data.conversationId}`;
    if (area === 'establishment') return `/establishment/messages?id=${data.conversationId}`;
  }
  if (data.missionId) {
    if (area === 'candidate') return '/app/missions';
    if (area === 'establishment') return '/establishment/missions?tab=applications';
  }
  return null;
}

function getNotificationBody(notification: Notification, conversations: Conversation[]) {
  if (notification.type === 'NEW_MESSAGE' && notification.data) {
    const data = notification.data as Record<string, any>;
    const conv = conversations.find(c => c.id === data.conversationId);
    if (conv) {
      return `Vous avez reçu un nouveau message de ${conv.establishment?.name || 'l\'établissement'}.`;
    }
  }
  return notification.body;
}

function getNotificationLinkLabel(notification: Notification, area: 'candidate' | 'establishment' | 'admin') {
  if (!notification.data) return '';
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    return 'Voir la conversation';
  }
  if (data.missionId) {
    if (area === 'establishment') return 'Voir les candidatures';
    return 'Suivre la mission';
  }
  return '';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

  async function loadNotifications(options: { silent?: boolean; reload?: boolean } = {}) {
    if (area === 'admin') return;

    if (!options.silent) setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      setNotifications(options.reload
        ? await api.reload<Notification[]>('/notifications')
        : await api.get<Notification[]>('/notifications'));
    } catch (e: any) {
      setNotificationsError(e.message);
    } finally {
      if (!options.silent) setNotificationsLoading(false);
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

  async function deleteAllNotifications() {
    const backupNotifications = [...notifications];
    setNotifications([]);
    setNotificationsError(null);

    try {
      await api.delete('/notifications');
    } catch (e: any) {
      setNotifications(backupNotifications);
      setNotificationsError(e.message);
    }
  }

  function warmRoute(href: string) {
    router.prefetch(href);
    warmApi(warmPathsForRoute(area, href));
    if (area === 'candidate') warmCandidateWorkspace();
    if (area === 'establishment') warmEstablishmentWorkspace();
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
    if (area === 'admin') {
      setNotifications([]);
      setConversations([]);
      setNotificationsOpen(false);
      return;
    }

    void loadNotifications();
    api.get<Conversation[]>('/conversations')
      .then(setConversations)
      .catch(() => {});
  }, [area]);

  useAutoRefresh(async () => {
    if (area === 'admin') return;
    const [nextNotifications, nextConversations] = await Promise.all([
      api.reload<Notification[]>('/notifications'),
      api.reload<Conversation[]>('/conversations'),
    ]);
    setNotifications(nextNotifications);
    setConversations(nextConversations);
  }, { enabled: Boolean(user) && area !== 'admin', intervalMs: 30_000 });

  useEffect(() => {
    if (area === 'admin') return;

    const unsubscribeNotifications = subscribeApiCache<Notification[]>('/notifications', setNotifications);
    const unsubscribeConversations = subscribeApiCache<Conversation[]>('/conversations', setConversations);

    return () => {
      unsubscribeNotifications();
      unsubscribeConversations();
    };
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

  useEffect(() => {
    if (area !== 'candidate' || user?.role !== 'CANDIDATE') return;
    return subscribeApiCache<Profile>('/me/profile', setCandidateProfile);
  }, [area, user?.role]);

  useEffect(() => {
    if (!user || area === 'admin') return;

    if (area === 'candidate') {
      prefetchRoutes(router, candidateNav.map((item) => item.href));
      return idleWarm(['/me/dashboard', '/missions?limit=50', '/me/profile', '/me/documents', '/me/applications', '/conversations', '/notifications']);
    }

    prefetchRoutes(router, establishmentNav.map((item) => item.href));
    return idleWarm(['/establishment/dashboard', '/establishments/me', '/conversations', '/notifications']);
  }, [area, router, user]);

  useEffect(() => {
    if (!user || area === 'admin') return;

    const warm = () => {
      if (area === 'candidate') {
        warmCandidateWorkspace();
        return;
      }

      warmEstablishmentWorkspace();
    };

    if (typeof window === 'undefined') return;
    const id = window.setTimeout(warm, 150);
    return () => window.clearTimeout(id);
  }, [area, user]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Link
            href={userHomeHref}
            className="brand"
            onFocus={() => warmRoute(userHomeHref)}
            onMouseEnter={() => warmRoute(userHomeHref)}
          >
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
                onFocus={() => warmRoute(item.href)}
                onMouseEnter={() => warmRoute(item.href)}
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
              <Link
                href={userProfileHref}
                className="account-menu-item"
                onFocus={() => warmRoute(userProfileHref)}
                onMouseEnter={() => warmRoute(userProfileHref)}
                onClick={() => setMobileNavOpen(false)}
              >
                <span>{area === 'establishment' ? 'Information établissement' : 'Mon profil'}</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              <Link
                href={userAccountHref}
                className="account-menu-item"
                onFocus={() => warmRoute(userAccountHref)}
                onMouseEnter={() => warmRoute(userAccountHref)}
                onClick={() => setMobileNavOpen(false)}
              >
                <span>Paramètres du compte</span>
                <span className="menu-arrow">&gt;</span>
              </Link>
              {area !== 'admin' ? (
                <Link href={area === 'candidate' ? "/app/notifications" : "/establishment/notifications"} className="account-menu-item" onClick={() => setMobileNavOpen(false)}>
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

        {area !== 'admin' ? (
          <div className="notification-menu-wrap" ref={notificationsRef}>
            {notificationsOpen ? (
              <div className="notification-menu" role="dialog" aria-label="Notifications recentes">
                <div className="notification-menu-head">
                  <div>
                    <strong>Notifications</strong>
                    <span>{unreadNotifications > 0 ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}` : 'Tout est lu'}</span>
                  </div>
                  <div className="notification-menu-actions">
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        className="notification-clear-all"
                        onClick={() => void deleteAllNotifications()}
                      >
                        Tout effacer
                      </button>
                    ) : null}
                <Link
                  href={area === 'candidate' ? "/app/notifications" : "/establishment/notifications"}
                  className="notification-menu-link"
                  onFocus={() => warmRoute(area === 'candidate' ? "/app/notifications" : "/establishment/notifications")}
                  onMouseEnter={() => warmRoute(area === 'candidate' ? "/app/notifications" : "/establishment/notifications")}
                  onClick={() => setNotificationsOpen(false)}
                >
                      Voir plus
                    </Link>
                  </div>
                </div>

                <div className="notification-menu-list">
                  {notificationsLoading ? (
                    <div className="notification-menu-empty">Chargement...</div>
                  ) : notificationsError ? (
                    <div className="notification-menu-empty error">{notificationsError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-menu-empty">Aucune notification.</div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => {
                      const notificationLink = getNotificationLink(notification, area);
                      return (
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
                          <p>{getNotificationBody(notification, conversations)}</p>
                          {notificationLink ? (
                            <Link
                              href={notificationLink}
                              className="notification-action-link"
                              onClick={() => setNotificationsOpen(false)}
                            >
                              {getNotificationLinkLabel(notification, area)} &rarr;
                            </Link>
                          ) : null}
                        </div>
                      );
                    })
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
                <Link
                  href={userProfileHref}
                  className="account-menu-item"
                  role="menuitem"
                  onFocus={() => warmRoute(userProfileHref)}
                  onMouseEnter={() => warmRoute(userProfileHref)}
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <span>{area === 'establishment' ? 'Information établissement' : 'Mon profil'}</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link
                  href={userAccountHref}
                  className="account-menu-item"
                  role="menuitem"
                  onFocus={() => warmRoute(userAccountHref)}
                  onMouseEnter={() => warmRoute(userAccountHref)}
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <span>Paramètres du compte</span>
                  <span className="menu-arrow">&gt;</span>
                </Link>
                <Link
                  href={userAccountHref}
                  className="account-menu-item"
                  role="menuitem"
                  onFocus={() => warmRoute(userAccountHref)}
                  onMouseEnter={() => warmRoute(userAccountHref)}
                  onClick={() => setAccountMenuOpen(false)}
                >
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
