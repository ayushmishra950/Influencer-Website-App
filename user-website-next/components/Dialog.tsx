'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A modal built on <dialog>, so the browser handles the focus trap, the backdrop and
 * Escape rather than three hand-rolled approximations of them.
 */
export function Dialog({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop is the <dialog> element itself; clicking the panel is not.
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
      className="w-[min(560px,calc(100vw-32px))] rounded-2xl border p-0 backdrop:bg-black/60"
      style={{
        background: 'var(--ink-950)',
        borderColor: 'var(--line)',
        color: 'var(--text)',
        // A modal <dialog> centres itself with `margin: auto`, which Tailwind's preflight
        // resets to 0 — leaving it pinned to the top-left corner.
        margin: 'auto',
      }}
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <h2 className="text-[17px]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: 'var(--ink-800)', color: 'var(--text-2)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
