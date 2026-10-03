/**
 * Pre-order rules: whether a fish can be committed to before it arrives, what deposit we ask
 * for, and how many slots are left. Pure, with no Convex imports, so the storefront shows exactly
 * what the server will charge — the server always recomputes it. Tested in tests/site/preorder.test.ts.
 */

export type PreorderSettings = {
  enabled: boolean;
  incomingQty: number;
  expectedFrom?: string;
  expectedTo?: string;
  depositAmount?: number;
  depositPercent?: number;
  note?: string;
};

export type PreorderProduct = {
  price: number;
  stock: number;
  preorder?: PreorderSettings;
};

/** Whole pesos, never negative — the figure we actually ask for. */
export function toPeso(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount);
}

export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/**
 * The deposit for one unit. A percentage wins over a flat amount when both are set, and the
 * deposit is capped at the price — we never ask for more than the fish costs.
 */
export function depositPerUnit(product: PreorderProduct): number {
  const settings = product.preorder;
  if (!settings) return 0;
  const price = toPeso(product.price);
  if (settings.depositPercent && settings.depositPercent > 0) {
    return Math.min(price, toPeso((price * settings.depositPercent) / 100));
  }
  if (settings.depositAmount && settings.depositAmount > 0) {
    return Math.min(price, toPeso(settings.depositAmount));
  }
  return 0;
}

export type PreorderState = {
  /** Pre-orders are being accepted right now. */
  open: boolean;
  /** Slots still unclaimed; 0 when fully committed. */
  remaining: number;
  incomingQty: number;
  committed: number;
  depositPerUnit: number;
  expectedLabel: string;
  note?: string;
  /** Why it's closed, for the storefront to show instead of a button. */
  closedReason?: string;
};

/**
 * What to show for a product, given how many units are already committed by live pre-orders.
 * A fish that's actually in stock is bought the normal way, so pre-orders close.
 */
export function preorderState(product: PreorderProduct, committed: number): PreorderState {
  const settings = product.preorder;
  const incomingQty = Math.max(0, Math.floor(settings?.incomingQty ?? 0));
  const taken = Math.max(0, Math.floor(committed));
  const remaining = Math.max(0, incomingQty - taken);
  const base = {
    remaining,
    incomingQty,
    committed: taken,
    depositPerUnit: depositPerUnit(product),
    expectedLabel: expectedLabel(settings?.expectedFrom, settings?.expectedTo),
    note: settings?.note,
  };

  if (!settings?.enabled) return { ...base, open: false, closedReason: "Not open for pre-order." };
  if (incomingQty <= 0) return { ...base, open: false, closedReason: "No incoming stock listed yet." };
  if (product.stock > 0) return { ...base, open: false, closedReason: "In stock now — no need to pre-order." };
  if (remaining <= 0) return { ...base, open: false, closedReason: "Fully pre-ordered — ask us about the next shipment." };
  return { ...base, open: true };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseYmd(value: string | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/**
 * A window a customer can read: "early March 2027", "March 2027", "12–20 March 2027",
 * or "March – April 2027". Empty when no date was given.
 */
export function expectedLabel(from: string | undefined, to: string | undefined): string {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (!a && !b) return "";
  if (a && !b) return `${MONTHS[a.m - 1]} ${a.y}`;
  if (!a && b) return `by ${MONTHS[b!.m - 1]} ${b!.y}`;
  if (a!.y === b!.y && a!.m === b!.m) {
    if (a!.d === b!.d) return `${a!.d} ${MONTHS[a!.m - 1]} ${a!.y}`;
    // A window spanning the whole month reads better as just the month.
    if (a!.d === 1 && b!.d >= daysInMonth(a!.y, a!.m)) return `${MONTHS[a!.m - 1]} ${a!.y}`;
    return `${a!.d}–${b!.d} ${MONTHS[a!.m - 1]} ${a!.y}`;
  }
  if (a!.y === b!.y) return `${MONTHS[a!.m - 1]} – ${MONTHS[b!.m - 1]} ${a!.y}`;
  return `${MONTHS[a!.m - 1]} ${a!.y} – ${MONTHS[b!.m - 1]} ${b!.y}`;
}

/**
 * Whether a reservation currently holds real stock. A pre-order doesn't until it's allocated, so
 * cancelling or expiring one must NOT add stock back. Guards every restore path.
 */
export function reservationHoldsStock(reservation: { isPreorder?: boolean; allocatedAt?: number }): boolean {
  if (!reservation.isPreorder) return true;
  return reservation.allocatedAt !== undefined;
}

/**
 * Allocation order when a shipment lands: paid deposits first (most paid first), then whoever
 * asked earliest. Returns a new array; the input is untouched.
 */
export function allocationOrder<T extends { amountPaid?: number; createdAt: number }>(preorders: T[]): T[] {
  return [...preorders].sort((a, b) => {
    const paidA = a.amountPaid ?? 0;
    const paidB = b.amountPaid ?? 0;
    const hasA = paidA > 0 ? 0 : 1;
    const hasB = paidB > 0 ? 0 : 1;
    if (hasA !== hasB) return hasA - hasB; // anyone who paid comes before anyone who hasn't
    if (paidA !== paidB) return paidB - paidA; // then the larger deposit
    return a.createdAt - b.createdAt; // then first come, first served
  });
}
