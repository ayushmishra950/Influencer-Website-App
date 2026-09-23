import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '@/lib/api';
import { TextField } from '@/components/Field';
import { AuthShell, FormError } from '@/components/AuthShell';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface ResetState {
  token?: string;
  email?: string;
}

/** Step two: set the new password, then send them to sign in with it. */
export function ResetPasswordPage() {
  useDocumentTitle();

  const navigate = useNavigate();
  const { notify } = useToast();
  const { state } = useLocation() as { state: ResetState | null };

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reached directly, with no token from the email step — there is nothing to reset.
  if (!state?.token) return <Navigate to="/forgot-password" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setError('');
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', {
        token: state?.token,
        password,
        confirmPassword,
      });
      notify('Password updated. Please sign in.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={state.email ? `For ${state.email}` : 'Choose a new password for your account'}
    >
      <form className="card card-pad stack gap-4" onSubmit={onSubmit} noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
          required
          autoFocus
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <FormError message={error} />

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy && <span className="spinner" />}
          {busy ? 'Saving' : 'Set new password'}
        </button>
      </form>
    </AuthShell>
  );
}
