import { isArowana, isFish, kindName } from './fish';
import { isListable } from './preorder';

/**
 * Which products belong on each storefront listing page.
 *
 * These live here rather than inline in the pages because the lists are now built twice: once in
 * the client page a visitor sees, and once at build time for the CollectionPage/ItemList
 * structured data. If the two drifted apart we would be telling search and answer engines about
 * stock that isn't on the page (or hiding stock that is).
 *
 * Classification uses kindName (the internal name) per the storefront rules — never the display
 * name — and listability allows incoming pre-orders, not just stock on hand.
 */

type Classifiable = { name: string; internalName?: string; categoryName?: string; isActive?: boolean };
type Stocked = Parameters<typeof isListable>[0];

/** Catalog: arowana, the headline livestock. */
export function catalogList<T extends Classifiable & Stocked>(products: readonly T[]): T[] {
  return products.filter((p) => !!p.isActive && isFish(p) && isListable(p) && isArowana(kindName(p)));
}

/** Cave: every other live fish. */
export function caveList<T extends Classifiable & Stocked>(products: readonly T[]): T[] {
  return products.filter((p) => !!p.isActive && isFish(p) && isListable(p) && !isArowana(kindName(p)));
}

/** Gear only: non-livestock that can actually be bought through the cart, in stock now. */
export function shopList<T extends { isActive?: boolean; stock: number; purchaseMode?: string }>(
  products: readonly T[],
): T[] {
  return products.filter((p) => !!p.isActive && p.stock > 0 && p.purchaseMode === 'cart');
}

/**
 * Everything the Shop page can show. The Shop is now the one place every product lives — live
 * fish and hard goods together — with filters to separate them, so this is just "publicly
 * listed and active"; the public catalog query has already excluded internal products.
 */
export function allProductsList<T extends { isActive?: boolean }>(products: readonly T[]): T[] {
  return products.filter((p) => !!p.isActive);
}

/**
 * Narrowed to what a customer can actually act on: in stock, or an incoming pre-order. Over half
 * the public catalog sits at zero stock, so the Shop defaults to this and offers the full list
 * behind a filter rather than opening on a page of sold-out specimens.
 */
export function availableOnly<T extends Stocked>(products: readonly T[]): T[] {
  return products.filter((p) => isListable(p));
}
