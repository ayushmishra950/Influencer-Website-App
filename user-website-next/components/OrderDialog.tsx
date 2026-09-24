'use client';

import { useState, type FormEvent } from 'react';
import { Dialog } from './Dialog';
import { FormError } from './FormError';
import { apiRequest, errorMessage } from '@/lib/client-api';
import { deliveryLabel, formatPrice } from '@/lib/format';
import type { PublicPackage } from '@/lib/types';

/**
 * "Request this package" on a creator's public profile.
 *
 * No sign-in: brands have no accounts here, so this is an open form like the enquiry
 * one. It sends only the package id -- the server reads the price off the package
 * itself, so what is posted cannot decide what the order is worth.
 *
 * Validated here as well as on the server so a typo is answered instantly rather than
 * after a round trip, and so a mistyped email does not spend one of the rate-limited
 * attempts (which count rejections too).
 */
const EMPTY = { buyerName: '', buyerEmail: '', buyerPhone: '', buyerCompany: '', message: '' };

type Form = typeof EMPTY;
type Errors = Partial<Record<keyof Form, string>>;

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (form.buyerName.trim().length < 2) errors.buyerName = 'Enter your full name';
  // Deliberately loose: this catches "not an address at all", the server checks properly.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail.trim())) {
    errors.buyerEmail = 'Enter a valid email';
  }
  // Counts digits, so spaces, +91 and dashes are all fine to type.
  if (form.buyerPhone.replace(/\D/g, '').length < 6) {
    errors.buyerPhone = 'Enter a phone number they can reach you on';
  }
  return errors;
}

function Field({ label, value, onChange, error, required, textarea, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  textarea?: boolean;
} & Record<string, unknown>) {
  const shared = {
    value,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    'aria-invalid': error ? true : undefined,
    className: 'input',
    style: error ? { borderColor: 'var(--rose-400)' } : undefined,
    ...rest,
  };

  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold">
        {label} {required && <span style={{ color: 'var(--rose-400)' }}>*</span>}
      </span>
      {textarea ? <textarea rows={3} {...shared} /> : <input {...shared} />}
      {!!error && <span className="text-[12px]" style={{ color: 'var(--rose-400)' }}>{error}</span>}
    </label>
  );
}

export function OrderButton({ creatorId, creatorName, pkg }: {
  creatorId: string;
  creatorName: string;
  pkg: PublicPackage;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');

  const set = (key: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear that field's error as it is being fixed, rather than making someone
    // submit again to find out whether they got it right.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  function close() {
    setOpen(false);
    // Reset only once it is shut, so nothing visibly wipes while the dialog animates.
    setForm(EMPTY);
    setErrors({});
    setFailure('');
    setSent('');
  }

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
      const response = await apiRequest<{ message?: string }>(
        `/api/public/influencers/${creatorId}/orders`,
        {
          method: 'POST',
          body: {
            packageId: pkg._id,
            buyerName: form.buyerName.trim(),
            buyerEmail: form.buyerEmail.trim(),
            buyerPhone: form.buyerPhone.trim(),
            buyerCompany: form.buyerCompany.trim(),
            message: form.message.trim(),
          },
        },
      );
      setSent(response.message ?? `Your request has reached ${creatorName}.`);
    } catch (error) {
      setFailure(errorMessage(error, 'Could not send your request. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary h-9 px-4 text-[13.5px]">
        Request this package
      </button>

      <Dialog open={open} title={`Request "${pkg.title}"`} onClose={close}>
        {sent ? (
          <div className="text-center">
            <div
              className="mx-auto grid h-12 w-12 place-items-center rounded-full"
              style={{ background: 'var(--mint-bg)', color: 'var(--mint-400)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="mt-4 text-[18px]">Request sent</h3>
            <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">{sent}</p>
            <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">
              They will reply on {form.buyerPhone.trim()} or {form.buyerEmail.trim()}. Nothing
              is charged here — you agree the details directly with them.
            </p>
            <button type="button" onClick={close} className="btn btn-ghost mt-5">Done</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="rounded-xl border p-4" style={{ background: 'var(--ink-800)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold">{pkg.title}</p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                    {[creatorName, deliveryLabel(pkg.deliveryDays)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="shrink-0 text-[17px] font-bold" style={{ color: 'var(--violet-400)' }}>
                  {formatPrice(pkg.price, pkg.currency)}
                </p>
              </div>
            </div>

            {!!failure && <FormError message={failure} />}

            <Field label="Your name" name="buyerName" required autoComplete="name" placeholder="Enter your full name"
              value={form.buyerName} onChange={set('buyerName')} error={errors.buyerName} />
            <Field label="Email" name="buyerEmail" required type="email" autoComplete="email" placeholder="you@company.com"
              value={form.buyerEmail} onChange={set('buyerEmail')} error={errors.buyerEmail} />
            <Field label="Phone" name="buyerPhone" required type="tel" autoComplete="tel" placeholder="10-digit mobile number"
              value={form.buyerPhone} onChange={set('buyerPhone')} error={errors.buyerPhone} />
            <Field label="Brand or company" name="buyerCompany" autoComplete="organization" placeholder="Optional"
              value={form.buyerCompany} onChange={set('buyerCompany')} />
            <Field label="What do you need?" name="message" textarea maxLength={800}
              placeholder="Dates, deliverables, where it will be posted — anything that helps them answer."
              value={form.message} onChange={set('message')} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                Sent straight to {creatorName}. No payment is taken here.
              </p>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
