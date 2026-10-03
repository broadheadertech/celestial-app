import { describe, expect, test } from "vitest";
import {
  DEFAULT_SERVICE_SETTINGS,
  formatDuration,
  formatPeso,
  quoteDelivery,
  quoteHomeService,
  toPeso,
  type ServiceArea,
  type ServiceSettings,
} from "../../convex/lib/serviceQuote";

const area = (over: Partial<ServiceArea> = {}): ServiceArea => ({
  name: "Metro Manila",
  deliveryFee: 400,
  travelFee: 600,
  deliveryEnabled: true,
  homeServiceEnabled: true,
  ...over,
});

const settings = (over: Partial<ServiceSettings> = {}): ServiceSettings => ({
  deliveryEnabled: true,
  homeServiceEnabled: true,
  ...over,
});

describe("quoteDelivery", () => {
  test("charges the area's fee and adds it to the total", () => {
    const quote = quoteDelivery({ subtotal: 1500, area: area(), settings: settings() });
    expect(quote).toEqual({ ok: true, fee: 400, free: false, areaName: "Metro Manila", total: 1900 });
  });

  test("is free at or above the free-delivery threshold", () => {
    const rules = settings({ freeDeliveryThreshold: 5000 });
    expect(quoteDelivery({ subtotal: 4999, area: area(), settings: rules })).toMatchObject({ ok: true, fee: 400, free: false });
    expect(quoteDelivery({ subtotal: 5000, area: area(), settings: rules })).toMatchObject({ ok: true, fee: 0, free: true, total: 5000 });
  });

  test("refuses orders under the minimum, without an area, or to an area we don't serve", () => {
    expect(quoteDelivery({ subtotal: 300, area: area(), settings: settings({ minimumDeliveryOrder: 1000 }) })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("₱1,000"),
    });
    expect(quoteDelivery({ subtotal: 2000, area: null, settings: settings() })).toMatchObject({ ok: false });
    expect(quoteDelivery({ subtotal: 2000, area: area({ deliveryEnabled: false }), settings: settings() })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Metro Manila"),
    });
  });

  test("refuses everything while delivery is switched off (the default)", () => {
    expect(quoteDelivery({ subtotal: 2000, area: area(), settings: DEFAULT_SERVICE_SETTINGS })).toMatchObject({ ok: false });
  });

  test("a zero fee is a real price, not a missing one", () => {
    expect(quoteDelivery({ subtotal: 500, area: area({ deliveryFee: 0 }), settings: settings() })).toMatchObject({ ok: true, fee: 0, free: false, total: 500 });
  });
});

describe("quoteHomeService", () => {
  test("adds the area's travel fee to a fixed service price", () => {
    expect(quoteHomeService({ servicePrice: 1500, area: area() })).toEqual({
      servicePrice: 1500,
      travelFee: 600,
      estimatedTotal: 2100,
      quoted: false,
    });
  });

  test("shows no total for a service priced on inspection", () => {
    expect(quoteHomeService({ servicePrice: undefined, area: area() })).toEqual({
      servicePrice: undefined,
      travelFee: 600,
      estimatedTotal: undefined,
      quoted: true,
    });
  });

  test("charges no travel without an area, or where we don't travel", () => {
    expect(quoteHomeService({ servicePrice: 800, area: null })).toMatchObject({ travelFee: 0, estimatedTotal: 800 });
    expect(quoteHomeService({ servicePrice: 800, area: area({ homeServiceEnabled: false }) })).toMatchObject({ travelFee: 0, estimatedTotal: 800 });
  });
});

describe("formatting", () => {
  test("pesos are whole and grouped", () => {
    expect(formatPeso(1500)).toBe("₱1,500");
    expect(formatPeso(1234567)).toBe("₱1,234,567");
  });

  test("money is rounded and never negative", () => {
    expect(toPeso(1499.6)).toBe(1500);
    expect(toPeso(-50)).toBe(0);
    expect(toPeso(Number.NaN)).toBe(0);
  });

  test("durations read naturally, and nothing is shown when unset", () => {
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(120)).toBe("2 hr");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(undefined)).toBe("");
  });
});
