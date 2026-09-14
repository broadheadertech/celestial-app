/**
 * How a product is sold on the storefront.
 *  - "enquire": shown as a showcase with WhatsApp / viewing CTAs, never added to the cart
 *    (live fish).
 *  - "cart": can be added to the cart and checked out (gear, food, lights, …).
 *
 * Products created before this setting existed have no `purchaseMode`; they default by
 * category: anything in a fish/livestock category is enquire-only, everything else is cart.
 */
export type PurchaseMode = "enquire" | "cart";

export function defaultPurchaseMode(categoryName: string | undefined): PurchaseMode {
  const n = (categoryName || "").toLowerCase();
  return n.includes("fish") || n.includes("aquatic") || n.includes("live") ? "enquire" : "cart";
}

export type ProductVisibility = "public" | "internal";

/**
 * Whether customers may see or buy a product anywhere (storefront, client app, cart,
 * wishlist, reservations, sitemap). Internal products stay usable by staff (POS, inventory).
 */
export function isListedPublicly(product: { isActive: boolean; visibility?: ProductVisibility }): boolean {
  return product.isActive && product.visibility !== "internal";
}

export function resolvePurchaseMode(
  product: { purchaseMode?: PurchaseMode },
  categoryName: string | undefined,
): PurchaseMode {
  return product.purchaseMode ?? defaultPurchaseMode(categoryName);
}
