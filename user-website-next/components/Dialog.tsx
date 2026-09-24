'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A modal built on <dialog>, so the browser handles the focus trap, the backdrop and
 * Escape rather than three hand-rolled approximations of them.
 */
export function Dialog({ open, title, onClose, children, width = 560 }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Widest the panel may get. A long form needs more room than a confirmation. */
  width?: number;
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
      /*
       * `open:flex`, not plain `flex`: the browser hides a closed <dialog> with
       * `display: none`, and an author-set display would override that and leave it
       * on the page. Applying it only while open keeps that rule intact.
       */
      className="flex-col overflow-hidden rounded-2xl border p-0 text-left open:flex backdrop:bg-black/60"
      style={{
        width: `min(${width}px, calc(100vw - 32px))`,
        /*
         * The browser gives a <dialog> `overflow: auto` and its own max-height, and the
         * body below scrolls too — so a long form had two scrollbars side by side, and
         * dragging one moved the wrong thing. The panel is pinned to the viewport and
         * clipped here; only the body scrolls.
         */
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--ink-950)',
        borderColor: 'var(--line)',
        color: 'var(--text)',
        // A modal renders in the top layer but is still a DOM descendant of wherever it
        // was mounted, so it inherits text-align from there. Opened inside the centred
        // hero, every form label in it came out centred. A modal should look the same
        // whatever it hangs off, so the alignment is stated rather than inherited.
        textAlign: 'left',
        // A modal <dialog> centres itself with `margin: auto`, which Tailwind's preflight
        // resets to 0 — leaving it pinned to the top-left corner.
        margin: 'auto',
      }}
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4">
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

      {/* min-h-0 so this can actually shrink inside the flex column — without it a
          flex item refuses to go below its content height and never scrolls. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
