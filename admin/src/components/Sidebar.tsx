import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { initials } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmSignOut } from '@/lib/confirmations';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  badge?: number;
}

interface SidebarProps {
  pendingCount: number;
  pendingPackages: number;
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ pendingCount, pendingPackages, open, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const signOut = async () => {
    const { confirmed } = await confirm(confirmSignOut());
    if (confirmed) logout();
  };

  const items: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/influencers', label: 'Influencers', icon: 'users' },
    { to: '/review', label: 'Review queue', icon: 'clock', badge: pendingCount },
    { to: '/packages', label: 'Packages', icon: 'price', badge: pendingPackages },
    { to: '/archived', label: 'Archived', icon: 'archive' },
    { to: '/categories', label: 'Categories', icon: 'tag' },
  ];

  return (
    <aside
      className="stack"
      data-open={open}
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--ink-950)',
        borderRight: '1px solid var(--line)',
        position: 'fixed',
        insetBlock: 0,
        left: 0,
        zIndex: 60,
      }}
    >
      <div className="row" style={{ height: 'var(--topbar-h)', padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
        <Logo />
      </div>

      <nav className="stack gap-1 grow" style={{ padding: 12, overflowY: 'auto' }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className="row gap-3"
            style={({ isActive }) => ({
              padding: '9px 12px',
              borderRadius: 'var(--r-md)',
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-2)',
              background: isActive ? 'var(--violet-bg)' : 'transparent',
              boxShadow: isActive ? 'inset 0 0 0 1px rgba(124,92,252,.22)' : 'none',
              transition: 'background .14s var(--ease), color .14s var(--ease)',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? 'var(--violet-400)' : 'var(--text-3)', display: 'flex' }}>
                  <Icon name={item.icon} size={17} />
                </span>
                <span className="grow">{item.label}</span>
                {!!item.badge && (
                  <span
                    className="center mono"
                    style={{
                      minWidth: 20, height: 20, padding: '0 6px',
                      borderRadius: 'var(--r-full)',
                      background: 'var(--amber-bg)', color: 'var(--amber-400)',
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="stack gap-2" style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
        <NotificationBell />

        <div className="row gap-3" style={{ padding: '8px 10px' }}>
          <span
            className="avatar center"
            style={{ width: 32, height: 32, fontSize: 12, background: 'var(--grad-gold)', color: 'var(--ink-1000)' }}
          >
            {initials(user?.name ?? 'A')}
          </span>
          <span className="stack grow" style={{ minWidth: 0, lineHeight: 1.3 }}>
            <strong className="truncate" style={{ fontSize: 13 }}>{user?.name}</strong>
            <span className="dim truncate" style={{ fontSize: 11.5 }}>{user?.email}</span>
          </span>
        </div>
        <button className="btn btn-subtle btn-block" onClick={() => void signOut()} style={{ justifyContent: 'flex-start' }}>
          <Icon name="logout" size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
