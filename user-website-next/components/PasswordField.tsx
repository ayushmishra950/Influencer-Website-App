'use client';

import { useId, useState } from 'react';
import { useSelectPrefilled } from '@/lib/use-select-prefilled';

/**
 * A password input with a reveal toggle — the same affordance the app and the admin
 * panel have, so someone who mistypes can check before submitting.
 */
export function PasswordField({
  label, value, onChange, autoComplete = 'current-password', hint, required = true,
  name = 'password', placeholder = 'Enter your password',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  /** Password managers key off `name`; without one they fall back to guesswork. */
  name?: string;
  /**
   * An instruction, never a row of bullets. `••••••••` is pixel-for-pixel what a filled
   * password field looks like, so people try to clear it, nothing happens, and they end
   * up fighting an empty box.
   */
  placeholder?: string;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const selectPrefilled = useSelectPrefilled();

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label} {required && <span style={{ color: 'var(--rose-400)' }}>*</span>}
      </label>

      <span className="relative block">
        <input
          id={id}
          name={name}
          // Revealing has to switch the type, not just the icon.
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          {...selectPrefilled}
          className="input pr-12"
        />
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          // Keeps the click from submitting the form or stealing focus from the input.
          onMouseDown={(event) => event.preventDefault()}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg"
          style={{ color: revealed ? 'var(--violet-400)' : 'var(--text-3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {revealed ? (
              <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-2.6 3.2M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a9.7 9.7 0 0 0 4.4-1M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            ) : (
              <>
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </span>

      {!!hint && <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  );
}
