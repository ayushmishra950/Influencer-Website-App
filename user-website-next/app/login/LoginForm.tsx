'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { apiRequest, errorMessage, tokenStore } from '@/lib/client-api';
import { useSelectPrefilled } from '@/lib/use-select-prefilled';
import { notifySessionChange } from '@/lib/session';

interface LoginResponse {
  data: { token: string };
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectPrefilled = useSelectPrefilled();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      tokenStore.set(response.data.token);
      notifySessionChange();
      // The dashboard, not the profile: signing in should open onto where you are, not
      // straight into a form.
      router.push('/dashboard');
      // The profile reads the session on the server-rendered shell, so it needs a refresh.
      router.refresh();
    } catch (err) {
      // A blocked sign-in comes back as a 403 carrying the actual reason (under review,
      // not approved, archived), so it is shown as-is rather than flattened.
      setError(errorMessage(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Manage your creator profile and stay visible to brands"
      footer={
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          New to Aura?{' '}
          <Link href="/register" className="font-semibold" style={{ color: 'var(--violet-400)' }}>
            Create a creator account
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-[13px] font-semibold">
            Email <span style={{ color: 'var(--rose-400)' }}>*</span>
          </label>
          <input
            id="email"
            // `name` and `autoComplete` together are what let a password manager treat
            // this and the password below as one credential, rather than guessing.
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

        <div className="grid gap-1.5">
          <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Enter your password" />
          {/* Directly under the field it belongs to: someone who has just mistyped a
              password is looking here, not at the bottom of the card. */}
          <Link
            href="/forgot-password"
            className="justify-self-end text-[12.5px]"
            style={{ color: 'var(--violet-400)' }}
          >
            Forgot password?
          </Link>
        </div>

        <FormError message={error} />

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
