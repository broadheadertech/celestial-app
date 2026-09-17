/** Search + sort for the Catalog and Cave grids. Pure functions (unit-tested in tests/site). */

import { gradeRank, kindName, titleOf, type DcProduct } from './fish';

export type CatalogSort = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();

/**
 * Every word of the query must appear somewhere in the product's name, bloodline/family label,
 * grade, SKU, tank number or description — so "super red 24" or "grade a" both narrow the list.
 */
export function matchesSearch(product: DcProduct, query: string, label = ''): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [
      titleOf(product),
      kindName(product),
      label,
      product.grade ? `grade ${product.grade}` : '',
      product.sku != null ? `#${product.sku} ${product.sku}` : '',
      product.tankNumber ?? '',
      product.description ?? '',
    ].join(' '),
  );
  return words.every((w) => haystack.includes(w));
}

export function sortProducts<T extends DcProduct>(products: T[], sort: CatalogSort): T[] {
  const list = [...products];
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'newest':
      return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    default:
      return list.sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || b.price - a.price);
  }
}
