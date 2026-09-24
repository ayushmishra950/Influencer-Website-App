'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { FormError } from '@/components/FormError';
import { apiRequest, errorMessage } from '@/lib/client-api';
import { setResetHandoff } from '@/lib/reset-handoff';
import { useSelectPrefilled } from '@/lib/use-select-prefilled';

interface VerifyResponse {
  data: { token: string; email: string };
}

/** Step one of the reset: name the account, then move on to choosing a password. */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectPrefilled = useSelectPrefilled();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await apiRequest<VerifyResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      });
      setResetHandoff(response.data);
      router.push('/reset-password');
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
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Remembered it?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--violet-400)' }}>
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <label htmlFor="reset-email" className="text-[13px] font-semibold">
            Enter your registered email <span style={{ color: 'var(--rose-400)' }}>*</span>
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            autoComplete="email"
            required
            className="input"
            {...selectPrefilled}
          />
        </div>

        <FormError message={error} />

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Checking' : 'Continue'}
        </button>
      </form>
    </AuthShell>
  );
}
