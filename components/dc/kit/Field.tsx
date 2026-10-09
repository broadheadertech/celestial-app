import type { ReactNode } from 'react';

/**
 * Labelled form field: 13px medium black label (red asterisk when required, grey "(optional)" note),
 * the control passed as children (use className "dk-input" / "dk-ta" / select "dk-input"),
 * then a hint or an error line. Wire `id` to the control and its aria-describedby to `${id}-msg`.
 */
export default function Field({
  id,
  label,
  required = false,
  optional,
  hint,
  error,
  full = false,
  children,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  /** Existing "(optional)" copy, shown muted after the label. */
  optional?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`dk-field${full ? ' full' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="dk-req" aria-hidden="true">*</span>}
        {optional ? <> <span className="opt">{optional}</span></> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="dk-err" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="dk-hint">{hint}</p>
      ) : null}
    </div>
  );
}
