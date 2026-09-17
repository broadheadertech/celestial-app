import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newTest, seedCatalog } from "./setup";

type T = ReturnType<typeof newTest>;

async function soldOut(t: T, productId: Id<"products">, movementType: "sale" | "damage" | "reservation", at: number) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.patch(productId, { stock: 0 });
    const stockRecordId = await ctx.db.insert("stockRecords", {
      productId, batchCode: "B1", category: "fish", initialQty: 1, currentQty: 0, reservedQty: 0, soldQty: 1,
      mortalityLossQty: 0, returnedQty: 0, receivedDate: now, status: "depleted", createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("stockMovements", {
      stockRecordId, productId, batchCode: "B1", movementType, quantityBefore: 1, quantityChange: -1, quantityAfter: 0, createdAt: at,
    });
  });
}

async function addFish(t: T, fishCat: Id<"categories">, name: string, extra: Record<string, unknown> = {}) {
  return t.run((ctx) =>
    ctx.db.insert("products", {
      name, price: 1000, costPrice: 500, categoryId: fishCat, stock: 1, image: "https://example.test/f.png",
      isActive: true, createdAt: Date.now(), updatedAt: Date.now(), ...extra,
    }),
  );
}

describe("recently rehomed fish", () => {
  test("lists sold and reserved fish only, newest first, without cost fields", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fishCat = ids.fishCat as Id<"categories">;

    const sold = ids.fish as Id<"products">;
    await soldOut(t, sold, "sale", 1_000);

    const died = await addFish(t, fishCat, "Lost Oscar");
    await soldOut(t, died, "damage", 5_000);

    const neverRecorded = await addFish(t, fishCat, "Old Listing", { stock: 0 });

    const reserved = await addFish(t, fishCat, "Held Discus", { stock: 0 });
    await t.run((ctx) =>
      ctx.db.insert("reservations", {
        reservationCode: "RES-000001", items: [{ productId: reserved, quantity: 1, reservedPrice: 1000 }],
        totalAmount: 1000, totalQuantity: 1, reservationDate: 3_000, expiryDate: Date.now() + 86_400_000,
        status: "confirmed", createdAt: 3_000, updatedAt: 3_000,
      }),
    );

    const hidden = await addFish(t, fishCat, "Internal Fish", { visibility: "internal" });
    await soldOut(t, hidden, "sale", 9_000);

    const gear = ids.gear as Id<"products">;
    await soldOut(t, gear, "sale", 8_000); // not a fish

    const list = await t.query(api.services.products.getRehomedSpecimens, {});
    expect(list.map((p) => [p._id, p.rehomedStatus])).toEqual([
      [reserved, "reserved"],
      [sold, "sold"],
    ]);
    expect(list.some((p) => p._id === died || p._id === neverRecorded)).toBe(false);
    for (const p of list) {
      expect("costPrice" in p).toBe(false);
      expect("movingAverageCost" in p).toBe(false);
    }
  });

  test("a fish back in stock drops off the list", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fish = ids.fish as Id<"products">;
    await soldOut(t, fish, "sale", 1_000);
    expect(await t.query(api.services.products.getRehomedSpecimens, {})).toHaveLength(1);
    await t.run((ctx) => ctx.db.patch(fish, { stock: 1 }));
    expect(await t.query(api.services.products.getRehomedSpecimens, {})).toHaveLength(0);
  });
});
