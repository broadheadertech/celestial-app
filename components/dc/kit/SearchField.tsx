'use client';

import { useId } from 'react';
import { SearchIcon } from './icons';

/** Pill search input with the leading magnifier and a clear button once there is text. */
export default function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
  iconSize = 16,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Screen-reader label, e.g. "Search the cave". */
  label: string;
  className?: string;
  iconSize?: number;
}) {
  const id = useId();
  return (
    <div className={`dk-search ${className}`.trim()} role="search">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <SearchIcon size={iconSize} />
      <input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="dk-search-clear" onClick={() => onChange('')} aria-label="Clear search">
          &times;
        </button>
      )}
    </div>
  );
}
