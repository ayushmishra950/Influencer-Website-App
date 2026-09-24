'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { CreatorSignupForm } from '@/components/CreatorSignupForm';
import type { Category } from '@/lib/types';

/**
 * The full-page version of signing up. The fields themselves live in
 * CreatorSignupForm, which the contact dialog uses too — one form, two places to open
 * it, so the two can never drift apart.
 */
export function RegisterForm({ categories }: { categories: Category[] }) {
  const [done, setDone] = useState(false);

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
      subtitle="Add your details — a person reviews every application, usually within a day or two"
      footer={
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          Already listed?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--violet-400)' }}>
            Sign in
          </Link>
        </p>
      }
    >
      <CreatorSignupForm categories={categories} onDone={() => setDone(true)} />
    </AuthShell>
  );
}
