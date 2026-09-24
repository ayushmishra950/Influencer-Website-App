'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { apiRequest, errorMessage } from '@/lib/client-api';
import { useSelectPrefilled } from '@/lib/use-select-prefilled';
import type { Category } from '@/lib/types';

const EMPTY = {
  name: '', email: '', password: '', phone: '', bio: '',
  category: '', country: 'India', state: '', city: '',
  instagram: '', youtube: '',
};

function Text({ label, value, onChange, required = false, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId();
  const selectPrefilled = useSelectPrefilled();

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label} {required && <span style={{ color: 'var(--rose-400)' }}>*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="input"
        {...selectPrefilled}
        {...rest}
      />
    </div>
  );
}

export function RegisterForm({ categories }: { categories: Category[] }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (!form.category) return setError('Choose the niche you create in');

    setError('');
    setBusy(true);
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          category: form.category,
          location: {
            country: form.country.trim(),
            state: form.state.trim(),
            city: form.city.trim(),
          },
          social: { instagram: form.instagram.trim(), youtube: form.youtube.trim() },
        },
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Registration received"
        subtitle="Registration is not activation — a person reviews every profile"
      >
        <div className="grid gap-4 text-center">
          <p className="prose-body text-[14.5px]">
            Our team will check your accounts and publish your profile once it is approved.
            You will be able to sign in from that moment, and you will be notified either way.
          </p>
          <Link href="/creators" className="btn btn-ghost w-full">Browse creators meanwhile</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      size="wide"
      title="Join as a creator"
      subtitle="Add your details — our team reviews every application"
      footer={
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Already listed?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--violet-400)' }}>
            Sign in
          </Link>
        </p>
      }
    >
      {/* Paired into two columns on anything wider than a phone, and stacked below it.
          Fields that belong together sit on the same row: city with state, the two
          social handles side by side. */}
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Full name" name="name" value={form.name} onChange={set('name')} required autoComplete="name" placeholder="Enter your full name" />
          <Text label="Email" name="email" value={form.email} onChange={set('email')} required type="email" autoComplete="email" placeholder="Enter your email address" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            hint="At least 8 characters"
            placeholder="Create a password"
          />

          <div className="grid content-start gap-1.5">
            <label htmlFor="niche" className="text-[13px] font-semibold">
              Niche <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <select
              id="niche"
              value={form.category}
              onChange={(event) => set('category')(event.target.value)}
              required
              className="input"
            >
              <option value="">Choose a niche</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="City" value={form.city} onChange={set('city')} required placeholder="e.g. Jaipur" />
          <Text label="State" value={form.state} onChange={set('state')} required placeholder="e.g. Rajasthan" />
          <Text label="Country" value={form.country} onChange={set('country')} required placeholder="e.g. India" />
        </div>

        <Text label="Phone" value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="Optional — for our team only" />

        <div className="grid gap-1.5">
          <label htmlFor="bio" className="text-[13px] font-semibold">Bio</label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(event) => set('bio')(event.target.value)}
            rows={3}
            maxLength={600}
            placeholder="What you make, and who it is for"
            className="input h-auto py-3"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Instagram" value={form.instagram} onChange={set('instagram')} type="url" placeholder="e.g. https://instagram.com/yourname" />
          <Text label="YouTube" value={form.youtube} onChange={set('youtube')} type="url" placeholder="e.g. https://youtube.com/@yourname" />
        </div>

        <FormError message={error} />

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ minWidth: 200 }}>
            {busy ? 'Submitting' : 'Submit for review'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
