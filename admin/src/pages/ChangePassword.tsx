import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/Layout';
import { TextField } from '@/components/Field';
import { FormError } from '@/components/AuthShell';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmChangePassword } from '@/lib/confirmations';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Changes the signed-in admin's own password. */
export function ChangePasswordPage() {
  useDocumentTitle();

  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setError('');
    const { confirmed } = await confirm(confirmChangePassword());
    if (!confirmed) return;

    setBusy(true);
    try {
      await api.post('/api/auth/change-password', { password, confirmPassword });
      notify('Password updated', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Change password"
        subtitle={user?.email ? `Signed in as ${user.email}` : 'Update your sign-in password'}
      />

      {/* Full width, like every other page in the dashboard. The two fields sit side
          by side rather than stacked, so neither input stretches the whole way across
          on a wide screen, and they drop to one column when there is no room. */}
      <form className="card card-pad stack gap-4 animate-in" onSubmit={onSubmit} noValidate>
        <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
          <div className="stack grow" style={{ minWidth: 260 }}>
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
          </div>
          <div className="stack grow" style={{ minWidth: 260 }}>
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <FormError message={error} />

        {/* The button follows the form's own width rules, not the card's: a submit
            stretched across 1400px reads as a banner, not as something to click. */}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ minWidth: 180 }}>
            {busy && <span className="spinner" />}
            {busy ? 'Saving' : 'Update password'}
          </button>
        </div>
      </form>
    </>
  );
}
