'use client';

import { useId } from 'react';
import { SORT_OPTIONS, type CatalogSort } from './catalogFilters';
import SearchField from './kit/SearchField';

/** Search box + sort menu shown above the chip filters on the Catalog and Cave pages. */
export default function CatalogSearchBar({
  query,
  onQuery,
  sort,
  onSort,
  placeholder,
  searchLabel = 'Search',
}: {
  query: string;
  onQuery: (q: string) => void;
  sort: CatalogSort;
  onSort: (s: CatalogSort) => void;
  placeholder: string;
  /** Screen-reader label for the search box, e.g. "Search the cave". */
  searchLabel?: string;
}) {
  const sortId = useId();
  return (
    <div className="dk-tb-row">
      <SearchField value={query} onChange={onQuery} placeholder={placeholder} label={searchLabel} />
      <label className="dk-tb-label" htmlFor={sortId}>Sort</label>
      <select id={sortId} className="dk-select" value={sort} onChange={(e) => onSort(e.target.value as CatalogSort)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
