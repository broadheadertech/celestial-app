import { describe, expect, test } from "vitest";
import {
  allocationOrder,
  depositPerUnit,
  expectedLabel,
  preorderState,
  reservationHoldsStock,
  type PreorderProduct,
} from "../../convex/lib/preorder";
import { incomingLabel, isIncoming, isListable } from "../../components/dc/preorder";

const product = (over: Partial<PreorderProduct> = {}): PreorderProduct => ({
  price: 100000,
  stock: 0,
  preorder: { enabled: true, incomingQty: 5, depositAmount: 10000 },
  ...over,
});

describe("deposits", () => {
  test("a flat amount is used as-is", () => {
    expect(depositPerUnit(product())).toBe(10000);
  });

  test("a percentage wins over a flat amount", () => {
    expect(depositPerUnit(product({ preorder: { enabled: true, incomingQty: 2, depositAmount: 10000, depositPercent: 20 } }))).toBe(20000);
  });

  test("never more than the price of the fish", () => {
    expect(depositPerUnit(product({ price: 5000, preorder: { enabled: true, incomingQty: 1, depositAmount: 99999 } }))).toBe(5000);
    expect(depositPerUnit(product({ price: 5000, preorder: { enabled: true, incomingQty: 1, depositPercent: 150 } }))).toBe(5000);
  });

  test("no deposit configured means no deposit asked for", () => {
    expect(depositPerUnit(product({ preorder: { enabled: true, incomingQty: 1 } }))).toBe(0);
    expect(depositPerUnit({ price: 100, stock: 0 })).toBe(0);
  });
});

describe("whether pre-orders are open", () => {
  test("open with slots left, and counts them down", () => {
    expect(preorderState(product(), 0)).toMatchObject({ open: true, remaining: 5, committed: 0 });
    expect(preorderState(product(), 3)).toMatchObject({ open: true, remaining: 2, committed: 3 });
  });

  test("closed once the shipment is fully claimed", () => {
    const state = preorderState(product(), 5);
    expect(state.open).toBe(false);
    expect(state.remaining).toBe(0);
    expect(state.closedReason).toMatch(/Fully pre-ordered/);
  });

  test("over-commitment never produces negative slots", () => {
    expect(preorderState(product(), 99)).toMatchObject({ open: false, remaining: 0 });
  });

  test("closed when the fish is actually in stock — it's bought the normal way", () => {
    expect(preorderState(product({ stock: 2 }), 0)).toMatchObject({ open: false, closedReason: expect.stringContaining("In stock") });
  });

  test("closed when switched off, or when nothing is incoming", () => {
    expect(preorderState(product({ preorder: { enabled: false, incomingQty: 5 } }), 0).open).toBe(false);
    expect(preorderState(product({ preorder: { enabled: true, incomingQty: 0 } }), 0)).toMatchObject({
      open: false,
      closedReason: expect.stringContaining("No incoming stock"),
    });
    expect(preorderState({ price: 100, stock: 0 }, 0).open).toBe(false);
  });
});

describe("the arrival window a customer reads", () => {
  test("reads naturally for every shape of window", () => {
    expect(expectedLabel("2027-03-01", undefined)).toBe("March 2027");
    expect(expectedLabel(undefined, "2027-03-31")).toBe("by March 2027");
    expect(expectedLabel("2027-03-12", "2027-03-20")).toBe("12–20 March 2027");
    expect(expectedLabel("2027-03-12", "2027-03-12")).toBe("12 March 2027");
    expect(expectedLabel("2027-03-01", "2027-04-30")).toBe("March – April 2027");
    expect(expectedLabel("2027-12-01", "2028-01-31")).toBe("December 2027 – January 2028");
  });

  test("empty when no date was given, or the date is nonsense", () => {
    expect(expectedLabel(undefined, undefined)).toBe("");
    expect(expectedLabel("soon", undefined)).toBe("");
    expect(expectedLabel("2027-13-01", undefined)).toBe("");
  });
});

describe("the stock invariant", () => {
  test("an ordinary reservation always holds stock", () => {
    expect(reservationHoldsStock({})).toBe(true);
    expect(reservationHoldsStock({ isPreorder: false })).toBe(true);
  });

  test("a pre-order holds none until it's allocated", () => {
    expect(reservationHoldsStock({ isPreorder: true })).toBe(false);
    expect(reservationHoldsStock({ isPreorder: true, allocatedAt: 1 })).toBe(true);
  });
});

describe("who gets the shipment first", () => {
  test("paid deposits first, then the largest deposit, then whoever asked earliest", () => {
    const queue = [
      { id: "late-unpaid", amountPaid: 0, createdAt: 400 },
      { id: "early-unpaid", amountPaid: 0, createdAt: 100 },
      { id: "small-deposit", amountPaid: 500, createdAt: 300 },
      { id: "big-deposit", amountPaid: 5000, createdAt: 350 },
    ];
    expect(allocationOrder(queue).map((q) => q.id)).toEqual(["big-deposit", "small-deposit", "early-unpaid", "late-unpaid"]);
  });

  test("equal deposits fall back to first come, first served", () => {
    const queue = [
      { id: "second", amountPaid: 1000, createdAt: 200 },
      { id: "first", amountPaid: 1000, createdAt: 100 },
    ];
    expect(allocationOrder(queue).map((q) => q.id)).toEqual(["first", "second"]);
  });

  test("the caller's array is left untouched", () => {
    const queue = [{ amountPaid: 0, createdAt: 2 }, { amountPaid: 9, createdAt: 1 }];
    const copy = [...queue];
    allocationOrder(queue);
    expect(queue).toEqual(copy);
  });
});

describe("what the storefront listings show", () => {
  const incoming = { stock: 0, preorder: { enabled: true, incomingQty: 4, expectedFrom: "2027-03-01", expectedTo: "2027-03-31" } };

  test("an incoming fish is listed and tagged", () => {
    expect(isIncoming(incoming)).toBe(true);
    expect(isListable(incoming)).toBe(true);
    expect(incomingLabel(incoming)).toBe("Arriving March 2027");
  });

  test("a fish in stock is listed but not tagged as incoming", () => {
    const inStock = { stock: 3, preorder: { enabled: true, incomingQty: 4 } };
    expect(isIncoming(inStock)).toBe(false);
    expect(isListable(inStock)).toBe(true);
  });

  test("a sold-out fish with no pre-order stays hidden, exactly as before", () => {
    expect(isListable({ stock: 0 })).toBe(false);
    expect(isListable({ stock: 0, preorder: null })).toBe(false);
    expect(isListable({ stock: 0, preorder: { enabled: false, incomingQty: 4 } })).toBe(false);
    expect(isListable({ stock: 0, preorder: { enabled: true, incomingQty: 0 } })).toBe(false);
  });

  test("the tag falls back to 'Pre-order' with no date", () => {
    expect(incomingLabel({ stock: 0, preorder: { enabled: true, incomingQty: 1 } })).toBe("Pre-order");
  });
});
