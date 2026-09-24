'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { CreatorSignupForm } from './CreatorSignupForm';
import { FormError } from './FormError';
import { apiRequest, errorMessage } from '@/lib/client-api';
import type { Category } from '@/lib/types';

/**
 * "Contact us" from the header, for people who are not signed in.
 *
 * It opens the sign-up form with a question box on top, because submitting it does two
 * things: it sends the question to our team, and it creates the creator account. That
 * is stated on the form rather than left as a surprise — nobody should end up with an
 * account and a password they did not realise they were creating.
 *
 * Controlled by the header rather than owning its own trigger: the desktop nav and the
 * mobile menu each need a button, and two triggers sharing one dialog is simpler than
 * two dialogs.
 */
export function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [failed, setFailed] = useState('');
  const [sent, setSent] = useState(false);

  /**
   * Niches are loaded when the dialog first opens, not with every page.
   *
   * This lives in the header, so fetching it up front would put a request on every
   * page for a button most visitors never press.
   */
  useEffect(() => {
    if (!open || categories) return;

    let cancelled = false;
    void (async () => {
      try {
        const body = await apiRequest<{ data: Category[] }>('/api/public/categories');
        if (!cancelled) setCategories(body.data);
      } catch (err) {
        if (!cancelled) setFailed(errorMessage(err, 'Could not load the form. Please try again.'));
      }
    })();

    return () => { cancelled = true; };
  }, [open, categories]);

  function close() {
    onClose();
    // Reset once it is shut, so nothing visibly wipes while the dialog animates.
    setSent(false);
  }

  return (
    <Dialog
      open={open}
      title={sent ? 'Thanks — we have it' : 'Get in touch'}
      onClose={close}
      // Wider than the default: this holds a whole sign-up form, and at 560px its
      // paired fields had no room to sit side by side.
      width={sent ? 480 : 660}
    >
      {sent ? (
        <div className="grid gap-4 text-center">
          <div
            className="mx-auto grid h-12 w-12 place-items-center rounded-full"
            style={{ background: 'var(--mint-bg)', color: 'var(--mint-400)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h3 className="text-[19px]">Thank you</h3>
          <p className="prose-body mx-auto max-w-sm text-[14.5px]">
            Your message has reached our team and we will reply by email. Your creator
            account has been created too — a person reviews every profile, usually within
            a day or two.
          </p>

          {/* Said as an option, not an instruction: signing in only works once the
              profile is approved, so this is an invitation rather than a next step. */}
          <p className="prose-body mx-auto max-w-sm text-[14px]" style={{ color: 'var(--text-3)' }}>
            If you like, you can sign in once your profile is approved.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn btn-primary" onClick={close}>Go to sign in</Link>
            <button type="button" onClick={close} className="btn btn-ghost">Close</button>
          </div>
        </div>
      ) : (
        <>
          <p className="prose-body mb-5 text-[14px]">
            Ask us anything. Sending this also creates your creator account, so add your
            details below — our team reviews every profile before it goes live.
          </p>

          {failed ? (
            <FormError message={failed} />
          ) : categories ? (
            <CreatorSignupForm
              categories={categories}
              withMessage
              submitLabel="Send and create my account"
              onDone={() => setSent(true)}
            />
          ) : (
            <p className="py-6 text-center text-[14px]" style={{ color: 'var(--text-3)' }}>
              Loading…
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}
