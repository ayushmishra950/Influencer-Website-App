import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/api';
import { TextField } from '@/components/Field';
import { AuthShell, FormError } from '@/components/AuthShell';
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
    <AuthShell
      title="Admin sign in"
      subtitle="Manage creator verification for the Aura network"
      footer={
        <p className="dim center" style={{ fontSize: 12, textAlign: 'center' }}>
          Influencer accounts sign in through the mobile app.
        </p>
      }
    >
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

        <div className="stack gap-2">
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {/* Directly under the field it belongs to: someone who has just mistyped a
              password is looking here, not at the bottom of the card. */}
          <Link to="/forgot-password" style={{ fontSize: 12.5, alignSelf: 'flex-end' }}>
            Forgot password?
          </Link>
        </div>

        <FormError message={error} />

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy && <span className="spinner" />}
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
