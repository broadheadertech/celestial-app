import type { Doc } from "../_generated/dataModel";

/**
 * Products have an internal `name` (inventory/POS, often technical, e.g. "SR COMPETITION GRADE W/
 * TROPHY") and an optional customer-facing `displayName`. Everything customers see must use
 * `publicName`; staff screens keep the internal name.
 */
export function publicName(product: { name: string; displayName?: string }): string {
  return product.displayName?.trim() || product.name;
}

/**
 * Customer-safe product object for payloads that embed a product (cart, wishlist, order history,
 * reservations): display name in `name`, internal name kept in `internalName` (used only for
 * storefront classification), and internal cost fields removed.
 */
export function customerProduct(product: Doc<"products">) {
  const { costPrice, movingAverageCost, ...rest } = product;
  void costPrice;
  void movingAverageCost;
  return { ...rest, name: publicName(product), displayName: publicName(product), internalName: product.name };
}
