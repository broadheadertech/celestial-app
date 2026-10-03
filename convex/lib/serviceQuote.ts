/**
 * Pricing for the two service channels — delivering goods, and sending a technician to a
 * customer's home. Pure functions with no Convex imports, so the checkout and the booking page
 * can show exactly the number the server will charge (the server always recomputes; the client's
 * figure is never trusted). Unit tested in tests/site/serviceQuote.test.ts.
 */

export type ServiceArea = {
  name: string;
  deliveryFee: number;
  travelFee: number;
  note?: string;
  deliveryEnabled: boolean;
  homeServiceEnabled: boolean;
};

export type ServiceSettings = {
  deliveryEnabled: boolean;
  freeDeliveryThreshold?: number;
  minimumDeliveryOrder?: number;
  deliveryNote?: string;
  homeServiceEnabled: boolean;
  homeServiceNote?: string;
};

export const DEFAULT_SERVICE_SETTINGS: ServiceSettings = {
  deliveryEnabled: false,
  homeServiceEnabled: false,
};

export type DeliveryQuote =
  | { ok: true; fee: number; free: boolean; areaName: string; total: number }
  | { ok: false; reason: string };

/** Money the store actually bills: whole pesos, never negative. */
export function toPeso(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount);
}

/**
 * What delivery costs for a basket of `subtotal` going to `area`.
 * Returns `ok: false` with a customer-facing reason when we can't deliver it.
 */
export function quoteDelivery(args: {
  subtotal: number;
  area: ServiceArea | null | undefined;
  settings: ServiceSettings;
}): DeliveryQuote {
  const { settings } = args;
  const subtotal = toPeso(args.subtotal);

  if (!settings.deliveryEnabled) {
    return { ok: false, reason: "Delivery isn't available at the moment — please choose pickup." };
  }
  if (!args.area) {
    return { ok: false, reason: "Please choose your delivery area." };
  }
  if (!args.area.deliveryEnabled) {
    return { ok: false, reason: `We don't deliver to ${args.area.name} yet — please choose pickup or message us.` };
  }

  const minimum = toPeso(settings.minimumDeliveryOrder ?? 0);
  if (minimum > 0 && subtotal < minimum) {
    return { ok: false, reason: `Delivery orders start at ${formatPeso(minimum)}. Add a little more, or choose pickup.` };
  }

  const threshold = toPeso(settings.freeDeliveryThreshold ?? 0);
  const free = threshold > 0 && subtotal >= threshold;
  const fee = free ? 0 : toPeso(args.area.deliveryFee);
  return { ok: true, fee, free, areaName: args.area.name, total: subtotal + fee };
}

export type HomeServiceQuote = {
  /** Unset when the service is priced on inspection. */
  servicePrice?: number;
  travelFee: number;
  /** Only set when the service has a fixed price, so the customer sees a real total. */
  estimatedTotal?: number;
  /** True when we can't show a number yet and staff will quote. */
  quoted: boolean;
};

/** What a home visit costs: the service price (if fixed) plus the area's travel fee. */
export function quoteHomeService(args: {
  servicePrice: number | null | undefined;
  area: ServiceArea | null | undefined;
}): HomeServiceQuote {
  const travelFee = args.area?.homeServiceEnabled ? toPeso(args.area.travelFee) : 0;
  const hasPrice = typeof args.servicePrice === "number" && Number.isFinite(args.servicePrice) && args.servicePrice > 0;
  const servicePrice = hasPrice ? toPeso(args.servicePrice as number) : undefined;
  return {
    servicePrice,
    travelFee,
    estimatedTotal: servicePrice === undefined ? undefined : servicePrice + travelFee,
    quoted: servicePrice === undefined,
  };
}

/** ₱1,500 — the format used across the storefront and emails. */
export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/** "1 hr 30 min" from a duration in minutes; empty when unset. */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return [hours > 0 ? `${hours} hr` : "", mins > 0 ? `${mins} min` : ""].filter(Boolean).join(" ");
}
