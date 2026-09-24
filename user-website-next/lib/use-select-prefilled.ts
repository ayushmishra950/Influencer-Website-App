'use client';

import { useRef, type FocusEvent } from 'react';

/**
 * Makes a value the browser filled in behave like a suggestion rather than a prefix.
 *
 * When Chrome or a password manager fills a field, the caret lands at the end of the
 * text and nothing is selected — so the next keystroke appends and you get
 * `oldemailnewemail`. Selecting the contents on focus means the first keystroke
 * replaces it, while tabbing past or pressing Enter still accepts what was filled.
 *
 * It fires at most once per field. That matters: a visitor who clicks back in to fix a
 * typo must not have their half-finished correction wiped. Tracking "has the user typed
 * yet" was the obvious alternative and it is unreliable — autofill and some input
 * methods change a field's value without ever producing a keydown — so this counts the
 * select itself instead, which cannot be fooled.
 */
export function useSelectPrefilled() {
  const selectedOnce = useRef(false);

  return {
    onFocus: (event: FocusEvent<HTMLInputElement>) => {
      if (selectedOnce.current) return;

      const input = event.currentTarget;
      // Empty on focus: the browser may still fill it later, so don't spend the
      // one-shot here.
      if (!input.value) return;

      // Deferred: Chrome fills some fields in the same tick as focus, so selecting
      // synchronously can act on a value that is about to be replaced.
      requestAnimationFrame(() => {
        if (document.activeElement !== input || !input.value) return;
        selectedOnce.current = true;
        input.select();
      });
    },
  };
}
