'use client';

import { useId, useState, type FormEvent } from 'react';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { apiRequest, errorMessage } from '@/lib/client-api';
import { useSelectPrefilled } from '@/lib/use-select-prefilled';
import type { Category } from '@/lib/types';

/**
 * The one creator sign-up form, used by /register and by the contact dialog.
 *
 * Shared rather than copied: both create the same account through the same endpoint, so
 * a field added or a rule changed in one place must not quietly differ in the other.
 * The only difference is the message box, and what each caller shows afterwards.
 */
const EMPTY = {
  name: '', email: '', password: '', phone: '', bio: '',
  category: '', country: 'India', state: '', city: '',
  instagram: '', youtube: '', message: '',
};

function Text({ label, value, onChange, required = false, hint, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** One line under the box, for a rule that is easier to state than to guess. */
  hint?: string;
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
      {!!hint && <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{hint}</span>}
    </div>
  );
}

/**
 * Turns whatever someone typed into a profile URL.
 *
 * People know their @handle, not their URL, and a lot of them paste the address bar
 * instead. Both arrive here, and both have to end up as one storable link — the API
 * keeps social accounts as URLs, and the admin opens them to verify the account.
 */
function socialUrl(base: string, input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${base}${value.replace(/^@/, '')}`;
}

/**
 * A labelled group of fields.
 *
 * Twelve inputs in one undifferentiated stack is a wall. Three named groups give
 * somebody a place to be, and a rule to hang the name on separates them without
 * spending much vertical room.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-3)' }}>
          {title}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--line)' }} aria-hidden="true" />
      </div>
      {children}
    </fieldset>
  );
}

export function CreatorSignupForm({ categories, withMessage = false, submitLabel = 'Submit for review', onDone }: {
  categories: Category[];
  /** Adds the question box, and labels the whole thing as getting in touch. */
  withMessage?: boolean;
  submitLabel?: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
          social: {
            instagram: socialUrl('instagram.com', form.instagram),
            youtube: socialUrl('youtube.com/@', form.youtube),
          },
          message: form.message.trim(),
        },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account'));
    } finally {
      setBusy(false);
    }
  }

  return (
    /*
     * `@container`, not `sm:` — the breakpoints below measure this form's own width
     * rather than the window's. The same form is rendered full-width on /register and
     * inside a 560px dialog; keyed to the viewport, the dialog copy was still being
     * given three columns on a desktop and squeezing City, State and Country into
     * 157px each.
     *
     * Every row is either one field or two of equal width. Eleven fields at four
     * different widths gave the eye no rhythm to follow, which is what made it read as
     * a wall rather than a form.
     */
    <form onSubmit={onSubmit} className="@container grid gap-5" noValidate>
      {withMessage && (
        <Section title="Your message">
          <div className="grid gap-1.5">
            <label htmlFor="signup-message" className="text-[13px] font-semibold">
              Your question or suggestion
            </label>
            <textarea
              id="signup-message"
              name="message"
              value={form.message}
              onChange={(event) => set('message')(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ask us anything — how review works, what you can charge, anything you are unsure about."
              className="input h-auto py-3"
            />
            <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              Goes straight to our team, and is never shown on your public profile.
            </span>
          </div>
        </Section>
      )}

      <Section title="Your details">
        <div className="grid gap-4 @md:grid-cols-2">
          <Text label="Full name" name="name" value={form.name} onChange={set('name')} required autoComplete="name" placeholder="Enter your full name" />
          <Text label="Email" name="email" value={form.email} onChange={set('email')} required type="email" autoComplete="email" placeholder="Enter your email address" />
        </div>

        <div className="grid gap-4 @md:grid-cols-2">
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
              name="category"
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

        <div className="grid gap-4 @md:grid-cols-2">
          <Text label="City" name="city" value={form.city} onChange={set('city')} required autoComplete="address-level2" placeholder="e.g. Jaipur" />
          <Text label="State" name="state" value={form.state} onChange={set('state')} required autoComplete="address-level1" placeholder="e.g. Rajasthan" />
        </div>

        <div className="grid gap-4 @md:grid-cols-2">
          <Text label="Country" name="country" value={form.country} onChange={set('country')} required autoComplete="country-name" placeholder="e.g. India" />
          <Text label="Phone" name="phone" value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" placeholder="Optional" hint="For our team only — never public" />
        </div>
      </Section>

      <Section title="Your work">
        <div className="grid gap-1.5">
          <label htmlFor="bio" className="text-[13px] font-semibold">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={(event) => set('bio')(event.target.value)}
            rows={3}
            maxLength={600}
            placeholder="What you make, and who it is for"
            className="input h-auto py-3"
          />
        </div>

        <div className="grid gap-4 @md:grid-cols-2">
          {/* type="text", not "url": most people know their @handle and not their URL,
              and a url input would reject the handle before it reached us. */}
          <Text label="Instagram" name="instagram" value={form.instagram} onChange={set('instagram')} autoComplete="off" placeholder="@yourname" hint="Handle or full link" />
          <Text label="YouTube" name="youtube" value={form.youtube} onChange={set('youtube')} autoComplete="off" placeholder="@yourchannel" hint="Handle or full link" />
        </div>
      </Section>

      <FormError message={error} />

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ minWidth: 200 }}>
          {busy ? 'Submitting' : submitLabel}
        </button>
      </div>
    </form>
  );
}
