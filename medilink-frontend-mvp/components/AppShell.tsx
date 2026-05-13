'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  { href: '/establishment/onboarding', label: 'Établissement' },
  { href: '/establishment/missions', label: 'Missions' },
  { href: '/establishment/missions/new', label: 'Créer mission' },
  { href: '/establishment/applications', label: 'Candidatures' },
  { href: '/establishment/messages', label: 'Messagerie' },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/establishments', label: 'Établissements' },
  { href: '/admin/missions', label: 'Missions' },
];

export function AppShell({ children, area }: { children: React.ReactNode; area: 'candidate' | 'establishment' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const nav = area === 'candidate' ? candidateNav : area === 'establishment' ? establishmentNav : adminNav;

  async function onLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brand-mark">M</span><span>Médilink</span></Link>
        <nav className="sidebar-nav">
          {nav.map((item) => <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}>{item.label}</Link>)}
        </nav>
        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <span>{roleLabel(user?.role)}</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><strong>{area === 'candidate' ? 'Espace candidat' : area === 'establishment' ? 'Espace établissement' : 'Administration'}</strong><div className="small">MVP connecté au backend</div></div>
          <Button variant="light" onClick={onLogout}>Déconnexion</Button>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
