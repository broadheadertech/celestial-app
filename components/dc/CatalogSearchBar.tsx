'use client';

import { SORT_OPTIONS, type CatalogSort } from './catalogFilters';

const mono = "'Geist Mono', monospace";

/** Search box + sort menu shown above the chip filters on the Catalog and Cave pages. */
export default function CatalogSearchBar({
  query,
  onQuery,
  sort,
  onSort,
  placeholder,
}: {
  query: string;
  onQuery: (q: string) => void;
  sort: CatalogSort;
  onSort: (s: CatalogSort) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="oklch(0.50 0.02 40)" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
          className="dc-search"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '10px 38px 10px 38px', borderRadius: 999, border: '1px solid oklch(0.82 0.02 50)', background: 'oklch(0.985 0.006 80)', color: 'oklch(0.22 0.012 32)', outline: 'none' }}
        />
        {query && (
          <button type="button" onClick={() => onQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 99, border: 'none', background: 'transparent', color: 'oklch(0.45 0.02 40)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>
            &times;
          </button>
        )}
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.50 0.02 40)' }}>Sort</span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as CatalogSort)}
          className="dc-search"
          style={{ fontSize: 14, padding: '10px 14px', borderRadius: 999, border: '1px solid oklch(0.82 0.02 50)', background: 'oklch(0.985 0.006 80)', color: 'oklch(0.22 0.012 32)', cursor: 'pointer' }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
