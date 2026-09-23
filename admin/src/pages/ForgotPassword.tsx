import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '@/lib/api';
import { TextField } from '@/components/Field';
import { AuthShell, FormError } from '@/components/AuthShell';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface VerifyResponse {
  data: { token: string; email: string };
}

/**
 * Step one of the reset: name the account.
 *
 * The token that comes back is handed to the next screen through router state rather
 * than the URL, so it stays out of history, bookmarks and any proxy log.
 */
export function ForgotPasswordPage() {
  useDocumentTitle();

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post<VerifyResponse>('/api/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      navigate('/reset-password', {
        replace: true,
        state: { token: data.data.token, email: data.data.email },
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not find that account'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your registered email to set a new password"
      footer={
        <p className="dim center" style={{ fontSize: 12, textAlign: 'center' }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      <form className="card card-pad stack gap-4" onSubmit={onSubmit} noValidate>
        <TextField
          label="Enter your registered email"
          type="email"
          autoComplete="email"
          placeholder="admin@aura.dev"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        <FormError message={error} />

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy && <span className="spinner" />}
          {busy ? 'Checking' : 'Continue'}
        </button>
      </form>
    </AuthShell>
  );
}
