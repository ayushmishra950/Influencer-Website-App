import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Stats } from '@/lib/types';

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useDocumentTitle();

  // Drives the sidebar badges; refreshed on a slow interval so they stay honest.
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<{ data: Stats }>('/api/admin/stats')).data.data,
    refetchInterval: 60_000,
  });

  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div>
      <style>{`
        .app-main { margin-left: var(--sidebar-w); }
        .topbar-mobile-only { display: none; }
        @media (max-width: 900px) {
          aside { transform: translateX(-100%); transition: transform .25s var(--ease); }
          aside[data-open="true"] { transform: none; box-shadow: var(--shadow-lg); }
          .app-main { margin-left: 0; }
          .topbar-mobile-only { display: flex; }
        }
      `}</style>

      <Sidebar
        pendingCount={stats?.pending ?? 0}
        pendingPackages={stats?.pendingPackages ?? 0}
        newEnquiries={stats?.newEnquiries ?? 0}
        open={navOpen}
        onNavigate={() => setNavOpen(false)}
      />

      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--backdrop)' }}
        />
      )}

      <div className="app-main">
        {/* Sticky on every width: on desktop it exists so the theme control has a
            consistent home in the top right, on mobile it also carries the nav. */}
        <header
          className="between"
          style={{
            height: 'var(--topbar-h)',
            padding: '0 clamp(16px, 3vw, 32px)',
            borderBottom: '1px solid var(--line)',
            background: 'color-mix(in srgb, var(--ink-1000) 82%, transparent)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <span className="topbar-mobile-only row gap-3">
            <button className="btn btn-ghost btn-icon" onClick={() => setNavOpen(true)} aria-label="Open navigation">
              <Icon name="menu" size={18} />
            </button>
            <Logo size={26} withWordmark={false} />
          </span>

          <span className="grow" />

          <ThemeToggle />
        </header>

        <main style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="between wrap gap-4" style={{ marginBottom: 24 }}>
      <div className="stack gap-1">
        <h1>{title}</h1>
        {subtitle && <p className="muted" style={{ fontSize: 13.5 }}>{subtitle}</p>}
      </div>
      {actions && <div className="row wrap gap-2">{actions}</div>}
    </div>
  );
}
