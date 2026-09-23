import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function Wrapper({ label, error, hint, required, children }: BaseProps & { children: ReactNode }) {
  return (
    <label className="field">
      <span className="label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="dim" style={{ fontSize: 12 }}>{hint}</span>
      ) : null}
    </label>
  );
}

export function TextField({ label, error, hint, required, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = props.type === 'password';

  return (
    <Wrapper label={label} error={error} hint={hint} required={required}>
      <span style={{ position: 'relative', display: 'block' }}>
        <input
          className={`input ${error ? 'input-invalid' : ''}`}
          aria-invalid={!!error}
          {...props}
          // A revealed password must stop being type="password", or the browser keeps masking it.
          type={isPassword && revealed ? 'text' : props.type}
          style={{ ...props.style, ...(isPassword ? { paddingRight: 42 } : {}) }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            // Keeps a click from submitting the form or stealing focus from the input.
            onMouseDown={(e) => e.preventDefault()}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            title={revealed ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'grid',
              placeItems: 'center',
              width: 30,
              height: 30,
              borderRadius: 'var(--r-sm)',
              color: revealed ? 'var(--violet-400)' : 'var(--text-3)',
            }}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={16} />
          </button>
        )}
      </span>
    </Wrapper>
  );
}

export function TextAreaField({ label, error, hint, required, ...props }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper label={label} error={error} hint={hint} required={required}>
      <textarea className={`textarea ${error ? 'input-invalid' : ''}`} aria-invalid={!!error} {...props} />
    </Wrapper>
  );
}

export function SelectField({ label, error, hint, required, children, ...props }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper label={label} error={error} hint={hint} required={required}>
      <select className={`select ${error ? 'input-invalid' : ''}`} aria-invalid={!!error} {...props}>
        {children}
      </select>
    </Wrapper>
  );
}

/** Two equal columns that collapse to one on narrow screens. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
      {children}
    </div>
  );
}
