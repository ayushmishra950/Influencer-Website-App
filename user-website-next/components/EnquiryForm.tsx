'use client';

import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/FormError';
import { apiRequest, errorMessage } from '@/lib/client-api';

/**
 * Campaign enquiry form. Posts to the API, where it lands in the admin's inbox.
 *
 * Validated here as well as on the server, for two reasons: a typo should be answered
 * instantly rather than after a round trip, and the submit endpoint is rate limited by
 * IP -- counting rejected attempts too -- so spending those attempts on a mistyped
 * email would be spending them on nothing.
 */
const WHO = ['Brand', 'Agency', 'Creator', 'Something else'] as const;
const BUDGET = ['Under ₹1 lakh', '₹1–5 lakh', '₹5–15 lakh', '₹15 lakh+', 'Not sure yet'] as const;

const EMPTY = {
  who: 'Brand' as string,
  budget: '' as string,
  name: '',
  phone: '',
  email: '',
  company: '',
  website: '',
};

type Form = typeof EMPTY;
type Errors = Partial<Record<keyof Form, string>>;

/** Mirrors the server's rules, message for message, so the two never disagree. */
function validate(form: Form): Errors {
  const errors: Errors = {};

  if (form.name.trim().length < 2) errors.name = 'Enter your full name';

  // Deliberately loose: the point is to catch "not an address at all", not to
  // adjudicate what a valid address looks like. The server checks it properly.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid work email';
  }

  // Counts digits, so spaces, +91 and dashes are all fine to type.
  if (form.phone.replace(/\D/g, '').length < 6) {
    errors.phone = 'Enter a phone number we can reach you on';
  }

  if (!form.company.trim()) errors.company = 'Which brand or company is this for?';

  return errors;
}

function Field({ label, value, onChange, error, required = false, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold">
        {label} {required && <span style={{ color: 'var(--rose-400)' }}>*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="input"
        style={error ? { borderColor: 'var(--rose-400)' } : undefined}
        {...rest}
      />
      {!!error && (
        <span className="text-[12px]" style={{ color: 'var(--rose-400)' }}>{error}</span>
      )}
    </label>
  );
}

function Choice({ legend, options, value, onChange, name }: {
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-[13px] font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className="chip cursor-pointer border px-3.5 py-2 text-[13px]"
              style={{
                background: selected ? 'var(--violet-bg)' : 'var(--ink-800)',
                color: selected ? 'var(--violet-400)' : 'var(--text-2)',
                borderColor: selected ? 'var(--violet-500)' : 'var(--line)',
              }}
            >
              {/* A real radio, visually replaced — so keyboard and screen readers get
                  a proper group rather than a row of clickable divs. */}
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EnquiryForm() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear that field's error as soon as it is being fixed, rather than making
    // someone submit again to find out whether they got it right.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure('');

    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSending(true);
    try {
      const response = await apiRequest<{ message?: string }>('/api/public/enquiries', {
        method: 'POST',
        body: {
          who: form.who,
          budget: form.budget,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          website: form.website.trim(),
        },
      });
      setSent(response.message ?? 'Thanks — your brief has reached our team.');
    } catch (error) {
      setFailure(errorMessage(error, 'Could not send your brief. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center sm:p-10">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-full"
          style={{ background: 'var(--mint-bg)', color: 'var(--mint-400)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="mt-4 text-[20px]">Thanks, {form.name.split(' ')[0] || 'there'}</h3>
        <p className="prose-body mx-auto mt-2 max-w-md text-[14.5px]">
          {sent} Someone will get in touch on {form.phone.trim()} or {form.email.trim()}.
        </p>
        <p className="prose-body mx-auto mt-2 max-w-md text-[14.5px]">
          Meanwhile you can browse the directory and shortlist creators yourself — every
          profile is already verified.
        </p>
        <button
          type="button"
          onClick={() => { setForm(EMPTY); setErrors({}); setSent(null); }}
          className="btn btn-ghost mt-5"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5 p-6 sm:p-8" noValidate>
      {!!failure && <FormError message={failure} />}

      <Choice legend="I am a" options={WHO} value={form.who} onChange={set('who')} name="who" />
      <Choice legend="Monthly campaign budget" options={BUDGET} value={form.budget} onChange={set('budget')} name="budget" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" value={form.name} onChange={set('name')} error={errors.name} required autoComplete="name" placeholder="Enter your full name" />
        <Field label="Phone number" name="phone" value={form.phone} onChange={set('phone')} error={errors.phone} required type="tel" autoComplete="tel" placeholder="10-digit mobile number" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work email" name="email" value={form.email} onChange={set('email')} error={errors.email} required type="email" autoComplete="email" placeholder="you@company.com" />
        <Field label="Brand or company" name="company" value={form.company} onChange={set('company')} error={errors.company} required autoComplete="organization" placeholder="Your brand or company name" />
      </div>

      <Field label="Website" name="website" value={form.website} onChange={set('website')} type="url" autoComplete="url" placeholder="https://yourwebsite.com" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          We use this to shortlist creators for your brief. Nothing is shared publicly.
        </p>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 190 }} disabled={sending}>
          {sending ? 'Sending…' : 'Get a creator shortlist'}
        </button>
      </div>
    </form>
  );
}
