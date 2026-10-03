/**
 * Storefront helpers for incoming (pre-orderable) fish. Pure, so they're unit-testable and safe
 * to use in the prerendered listings — the authoritative slot count comes from
 * `preorders.getPreorderOffer` on the specimen page.
 */

import { expectedLabel } from '../../convex/lib/preorder';

export type MaybeIncoming = {
  stock: number;
  preorder?: {
    enabled: boolean;
    incomingQty: number;
    expectedFrom?: string;
    expectedTo?: string;
  } | null;
};

/**
 * A fish that isn't here yet but is open for pre-order. Once it's in stock it's bought the
 * normal way, so it stops counting as incoming.
 */
export function isIncoming(product: MaybeIncoming): boolean {
  const settings = product.preorder;
  return !!settings?.enabled && settings.incomingQty > 0 && product.stock <= 0;
}

/**
 * Whether a fish belongs in a public listing: in stock, or incoming. Listings used to show
 * `stock > 0` only, which would have hidden every pre-order.
 */
export function isListable(product: MaybeIncoming): boolean {
  return product.stock > 0 || isIncoming(product);
}

/** "Arriving March 2027", or just "Pre-order" when no date was given. */
export function incomingLabel(product: MaybeIncoming): string {
  const label = expectedLabel(product.preorder?.expectedFrom, product.preorder?.expectedTo);
  return label ? `Arriving ${label}` : 'Pre-order';
}
