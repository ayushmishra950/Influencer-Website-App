'use client';

import { useState, type FormEvent } from 'react';

/**
 * Campaign enquiry form.
 *
 * Static for now: nothing is sent anywhere. The success panel says so rather than
 * thanking someone for a message that was never delivered — a form that quietly
 * swallows enquiries is worse than no form.
 */
const WHO = ['Brand', 'Agency', 'Creator', 'Something else'] as const;
const BUDGET = ['Under ₹1 lakh', '₹1–5 lakh', '₹5–15 lakh', '₹15 lakh+', 'Not sure yet'] as const;

const EMPTY = {
  who: 'Brand' as (typeof WHO)[number],
  budget: '' as string,
  name: '',
  phone: '',
  email: '',
  company: '',
  website: '',
};

function Field({ label, value, onChange, required = false, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        required={required}
        className="input"
        {...rest}
      />
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
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
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
          Your brief is captured. Meanwhile you can browse the directory and shortlist
          creators yourself — every profile is already verified.
        </p>
        <p className="mx-auto mt-4 max-w-md text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          Note: this form is not connected to a mailbox yet, so nothing has been sent.
        </p>
        <button type="button" onClick={() => { setForm(EMPTY); setSent(false); }} className="btn btn-ghost mt-5">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5 p-6 sm:p-8" noValidate>
      <Choice legend="I am a" options={WHO} value={form.who} onChange={set('who')} name="who" />
      <Choice legend="Monthly campaign budget" options={BUDGET} value={form.budget} onChange={set('budget')} name="budget" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" placeholder="Enter your full name" />
        <Field label="Phone number" value={form.phone} onChange={set('phone')} required type="tel" autoComplete="tel" placeholder="10-digit mobile number" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work email" value={form.email} onChange={set('email')} required type="email" autoComplete="email" placeholder="you@company.com" />
        <Field label="Brand or company" value={form.company} onChange={set('company')} required placeholder="Your brand or company name" />
      </div>

      <Field label="Website" value={form.website} onChange={set('website')} type="url" placeholder="https://yourwebsite.com" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          We use this to shortlist creators for your brief. Nothing is shared publicly.
        </p>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 190 }}>
          Get a creator shortlist
        </button>
      </div>
    </form>
  );
}
