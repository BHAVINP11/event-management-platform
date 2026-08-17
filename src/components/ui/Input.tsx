import { InputHTMLAttributes, ReactNode, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** An inline control placed inside the field, e.g. a show/hide password toggle. */
  endAdornment?: ReactNode;
}

/** Labeled text input with consistent focus/error/disabled states. */
export function Input({ label, hint, error, id, className, endAdornment, ...rest }: InputProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const inputClasses = ['field-control', error && 'field-control--invalid', className].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      {endAdornment ? (
        <div className="field-control-group">
          <input
            id={inputId}
            className={inputClasses}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            {...rest}
          />
          <div className="field-control-adornment">{endAdornment}</div>
        </div>
      ) : (
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          {...rest}
        />
      )}
      {hint && !error && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
