import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/api';
import { Logo } from '@/components/Logo';
import { TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoginPage() {
  const { user, loading, login } = useAuth();

  useDocumentTitle();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center" style={{ minHeight: '100vh', padding: 20, position: 'relative' }}>
      {/* This page renders outside the dashboard shell, so it carries its own control. */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>

      <div className="stack gap-5 animate-in" style={{ width: '100%', maxWidth: 400 }}>
        <div className="center stack gap-4">
          <Logo size={44} withWordmark={false} />
          <div className="stack gap-1" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 24 }}>Admin sign in</h1>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Manage creator verification for the Aura network
            </p>
          </div>
        </div>

        <form className="card card-pad stack gap-4" onSubmit={onSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="admin@aura.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
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
              <span>{error}</span>
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <p className="dim center" style={{ fontSize: 12, textAlign: 'center' }}>
          Influencer accounts sign in through the mobile app.
        </p>
      </div>
    </div>
  );
}
