import type { ReactNode } from 'react';

/** Row of toggle chips (one pressed at a time). Scrolls sideways on phones. */
export default function Chips<T extends string>({
  label,
  visibleLabel,
  options,
  value,
  onChange,
  renderLabel,
  className = '',
}: {
  /** Accessible group name, e.g. "Filter by family". */
  label: string;
  /** Optional caption shown before the chips (the reference's "Family"). */
  visibleLabel?: ReactNode;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => ReactNode;
  className?: string;
}) {
  return (
    <div className={`dk-filters ${className}`.trim()} role="group" aria-label={label}>
      {visibleLabel ? (
        <span className="dk-tb-label" style={{ alignSelf: 'center', marginRight: 14 }} aria-hidden="true">
          {visibleLabel}
        </span>
      ) : null}
      {options.map((o) => (
        <button key={o} className="dk-chip" type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
          {renderLabel ? renderLabel(o) : o}
        </button>
      ))}
    </div>
  );
}
