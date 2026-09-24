import type { ReactNode } from 'react';
import { Wordmark } from './Brand';

/** Chrome shared by sign in, register and the two password-reset steps. */
export function AuthShell({ title, subtitle, children, footer, size = 'narrow' }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Sign in and the reset steps are two or three fields; registration is ten. At the
   * narrow width that form becomes a long thin column that reads as far more work than
   * it is, so it gets the wider shell and pairs its fields up.
   */
  size?: 'narrow' | 'wide';
}) {
  return (
    <div
      className={`mx-auto flex flex-col items-center gap-6 px-5 py-14 sm:py-20 ${
        size === 'wide' ? 'max-w-2xl' : 'max-w-md'
      }`}
    >
      <Wordmark size={34} />

      <div className="text-center">
        <h1 className="text-[26px]">{title}</h1>
        <p className="prose-body mt-1.5 text-[14px]">{subtitle}</p>
      </div>

      <div className="card w-full p-6">{children}</div>

      {footer}
    </div>
  );
}
