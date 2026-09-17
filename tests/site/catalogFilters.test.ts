import { describe, expect, test } from "vitest";
import { matchesSearch, sortProducts } from "../../components/dc/catalogFilters";
import type { DcProduct } from "../../components/dc/fish";

const fish = (over: Partial<DcProduct>): DcProduct => ({ _id: over.name ?? "x", name: "Fish", price: 1000, stock: 1, ...over });

describe("matchesSearch", () => {
  const superRed = fish({ name: "Super Red Arowana 24cm", internalName: "RANJET-AR-RED-24", grade: "A", sku: 1042, tankNumber: "T-12" });

  test("every word must match somewhere, case and accents ignored", () => {
    expect(matchesSearch(superRed, "")).toBe(true);
    expect(matchesSearch(superRed, "super red")).toBe(true);
    expect(matchesSearch(superRed, "RED 24")).toBe(true);
    expect(matchesSearch(superRed, "arowána")).toBe(true);
    expect(matchesSearch(superRed, "super gold")).toBe(false);
  });

  test("matches label, grade, SKU and tank number", () => {
    expect(matchesSearch(superRed, "blood red", "Blood Red")).toBe(true);
    expect(matchesSearch(superRed, "grade a")).toBe(true);
    expect(matchesSearch(superRed, "#1042")).toBe(true);
    expect(matchesSearch(superRed, "1042")).toBe(true);
    expect(matchesSearch(superRed, "t 12")).toBe(true);
  });
});

describe("sortProducts", () => {
  const items = [
    fish({ name: "b", price: 5000, grade: "B", createdAt: 3 }),
    fish({ name: "a", price: 9000, grade: "A", createdAt: 1 }),
    fish({ name: "c", price: 2000, grade: "A", createdAt: 2 }),
  ];
  const names = (list: DcProduct[]) => list.map((p) => p.name);

  test("sorts without mutating the input", () => {
    expect(names(sortProducts(items, "price-asc"))).toEqual(["c", "b", "a"]);
    expect(names(sortProducts(items, "price-desc"))).toEqual(["a", "b", "c"]);
    expect(names(sortProducts(items, "newest"))).toEqual(["b", "c", "a"]);
    expect(names(sortProducts(items, "featured"))).toEqual(["a", "c", "b"]);
    expect(names(items)).toEqual(["b", "a", "c"]);
  });
});
