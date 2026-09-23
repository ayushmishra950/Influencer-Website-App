import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Chrome for the signed-out screens: sign in, and the two steps of a password reset.
 *
 * They render outside the dashboard shell, so each would otherwise carry its own copy
 * of the logo, heading and theme toggle — and drift apart the first time one changed.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="center" style={{ minHeight: '100vh', padding: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>

      <div className="stack gap-5 animate-in" style={{ width: '100%', maxWidth: 400 }}>
        <div className="center stack gap-4">
          <Logo size={44} withWordmark={false} />
          <div className="stack gap-1" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 24 }}>{title}</h1>
            <p className="muted" style={{ fontSize: 13.5 }}>{subtitle}</p>
          </div>
        </div>

        {children}

        {footer}
      </div>
    </div>
  );
}

/** The inline error panel these screens share. */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="row gap-2"
      style={{
        padding: '10px 12px', borderRadius: 'var(--r-md)',
        background: 'var(--rose-bg)', color: 'var(--rose-400)',
        border: '1px solid rgba(251,113,133,.25)', fontSize: 13,
      }}
      role="alert"
    >
      <Icon name="warning" size={15} />
      <span>{message}</span>
    </div>
  );
}
