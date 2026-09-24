'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { apiRequest, errorMessage } from '@/lib/client-api';
import { takeResetHandoff } from '@/lib/reset-handoff';

/** Step two: set the new password, then send them to sign in with it. */
export function ResetPasswordForm() {
  const router = useRouter();

  // Read once on mount: the handoff is single use, so a re-render must not consume it.
  const [handoff] = useState(takeResetHandoff);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Opened directly, with nothing from the email step — there is nothing to reset.
  useEffect(() => {
    if (!handoff) router.replace('/forgot-password');
  }, [handoff, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setError('');
    setBusy(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token: handoff?.token, password, confirmPassword },
      });
      router.replace('/login');
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password'));
    } finally {
      setBusy(false);
    }
  }

  if (!handoff) return null;

  return (
    <AuthShell title="Set a new password" subtitle={`For ${handoff.email}`}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="At least 8 characters"
          placeholder="Enter a new password"
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter the new password"
        />

        <FormError message={error} />

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Saving' : 'Set new password'}
        </button>
      </form>
    </AuthShell>
  );
}
