import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authErrorCode, newTest, seedCatalog, signedInAs } from "./setup";

type T = ReturnType<typeof newTest>;

const ASK = {
  name: "Juan dela Cruz",
  email: "juan@example.test",
  phone: "09181234567",
  message: "Is this one still available? I have a 4ft tank ready.",
};

async function askAboutFish(t: T, productId: Id<"products">, over: Partial<typeof ASK> = {}) {
  return t.mutation(api.services.inquiries.createProductInquiry, { productId, ...ASK, ...over });
}

describe("asking about a fish", () => {
  test("records the lead with the fish, its price and its tank snapshotted", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fish = ids.fish as Id<"products">;
    await t.run((ctx) => ctx.db.patch(fish, { tankNumber: "T-14" }));

    const res = await askAboutFish(t, fish);
    expect(res.success).toBe(true);
    expect(res.code).toMatch(/^INQ-[A-Z0-9]{6}$/);

    const row = await t.run((ctx) => ctx.db.get(res.inquiryId));
    expect(row).toMatchObject({
      source: "product",
      status: "new",
      name: "Juan dela Cruz",
      productName: "Super Red Arowana",
      productPrice: 200000,
      productRef: "T-14",
      code: res.code,
    });

    // Renaming or repricing the fish afterwards must not rewrite the lead.
    await t.run((ctx) => ctx.db.patch(fish, { price: 999, displayName: "Something else" }));
    expect(await t.run((ctx) => ctx.db.get(res.inquiryId))).toMatchObject({
      productName: "Super Red Arowana",
      productPrice: 200000,
    });

    // Staff get a high-priority notification, since this is a live sales lead.
    const notifications = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notifications.some((n) => n.relatedType === "inquiry" && n.audience === "staff" && n.priority === "high")).toBe(true);
  });

  test("rejects a bad email, an empty question and an internal-only product", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fish = ids.fish as Id<"products">;
    await expect(askAboutFish(t, fish, { email: "nope" })).rejects.toThrow(/email/i);
    await expect(askAboutFish(t, fish, { message: "hi" })).rejects.toThrow(/little more/i);
    await expect(askAboutFish(t, fish, { name: "  " })).rejects.toThrow(/Name is required/);

    const internal = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("products", {
        name: "Back-room tank",
        price: 100,
        categoryId: ids.gearCat as Id<"categories">,
        image: "https://example.test/x.png",
        stock: 1,
        isActive: true,
        visibility: "internal",
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(askAboutFish(t, internal)).rejects.toThrow(/isn't available/i);
  });

  test("one address can't flood the inbox", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fish = ids.fish as Id<"products">;
    for (let i = 0; i < 6; i++) await askAboutFish(t, fish);
    await expect(askAboutFish(t, fish)).rejects.toThrow(/already sent/i);
    // A different customer is unaffected.
    await expect(askAboutFish(t, fish, { email: "maria@example.test" })).resolves.toMatchObject({ success: true });
  });
});

describe("the contact form feeds the same inbox", () => {
  test("a contact message becomes a 'contact' inquiry, and still returns the old shape", async () => {
    const t = newTest();
    const res = await t.mutation(api.services.contact.createContactMessage, {
      name: "Ana",
      email: "ana@example.test",
      subject: "Do you ship to Cebu?",
      message: "Wondering if you can ship a tank to Cebu.",
    });
    expect(res.success).toBe(true);

    const staff = await signedInAs(t, "admin");
    const rows = await staff.as.query(api.services.inquiries.getInquiries, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "contact", subject: "Do you ship to Cebu?", status: "new" });
    // Nothing is written to the old table any more.
    expect(await t.run((ctx) => ctx.db.query("contactMessages").collect())).toEqual([]);
  });

  test("old contact messages are copied in once, keeping their status, and never duplicated", async () => {
    const t = newTest();
    const legacyIds = await t.run(async (ctx) => {
      const now = Date.now();
      const base = { name: "Old", email: "old@example.test", subject: "Hi", message: "An older message", createdAt: now, updatedAt: now };
      return [
        await ctx.db.insert("contactMessages", { ...base, status: "new" }),
        await ctx.db.insert("contactMessages", { ...base, status: "responded" }),
        await ctx.db.insert("contactMessages", { ...base, status: "archived" }),
      ];
    });
    const staff = await signedInAs(t, "admin");

    expect(await staff.as.query(api.services.inquiries.getBackfillStatus, {})).toEqual({ pending: 3, total: 3 });
    expect(await staff.as.mutation(api.services.inquiries.backfillContactMessages, {})).toEqual({ copied: 3, total: 3 });
    // Re-running is a no-op.
    expect(await staff.as.mutation(api.services.inquiries.backfillContactMessages, {})).toEqual({ copied: 0, total: 3 });
    expect(await staff.as.query(api.services.inquiries.getBackfillStatus, {})).toEqual({ pending: 0, total: 3 });

    const rows = await staff.as.query(api.services.inquiries.getInquiries, {});
    expect(rows.map((r) => r.status).sort()).toEqual(["closed", "new", "replied"]);
    expect(rows.every((r) => r.source === "contact" && !!r.code)).toBe(true);
    // The originals are untouched.
    expect((await t.run((ctx) => ctx.db.query("contactMessages").collect())).map((r) => r._id).sort()).toEqual([...legacyIds].sort());
  });
});

describe("working the inbox", () => {
  test("is staff-only", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const res = await askAboutFish(t, ids.fish as Id<"products">);
    expect(await authErrorCode(t.query(api.services.inquiries.getInquiries, {}))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.inquiries.getInquiries, {}))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.mutation(api.services.inquiries.replyToInquiry, { inquiryId: res.inquiryId, body: "hello" }))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.mutation(api.services.inquiries.updateInquiryStatus, { inquiryId: res.inquiryId, status: "won" }))).toBe("FORBIDDEN");
  });

  test("replying records what was sent and moves a new lead to replied", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const res = await askAboutFish(t, ids.fish as Id<"products">);
    const staff = await signedInAs(t, "admin");

    const reply = await staff.as.mutation(api.services.inquiries.replyToInquiry, {
      inquiryId: res.inquiryId,
      body: "Yes, still with us. It's feeding well on pellets.",
    });
    expect(reply).toEqual({ success: true, emailed: true });

    const row = await t.run((ctx) => ctx.db.get(res.inquiryId));
    expect(row?.status).toBe("replied");
    expect(row?.replies).toHaveLength(1);
    expect(row?.replies?.[0]).toMatchObject({ sentByName: "Test admin", emailed: true });
    expect(row?.lastRepliedAt).toBeGreaterThan(0);

    // A second reply is appended, and a later status isn't dragged back to "replied".
    await staff.as.mutation(api.services.inquiries.updateInquiryStatus, { inquiryId: res.inquiryId, status: "negotiating" });
    await staff.as.mutation(api.services.inquiries.replyToInquiry, { inquiryId: res.inquiryId, body: "We can hold it until Friday." });
    const after = await t.run((ctx) => ctx.db.get(res.inquiryId));
    expect(after?.replies).toHaveLength(2);
    expect(after?.status).toBe("negotiating");

    const actions = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(actions).toContain("inquiry.reply");
    expect(actions).toContain("inquiry.status");
  });

  test("a reply answered on Messenger is recorded without emailing", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const res = await askAboutFish(t, ids.fish as Id<"products">);
    const staff = await signedInAs(t, "admin");
    const reply = await staff.as.mutation(api.services.inquiries.replyToInquiry, {
      inquiryId: res.inquiryId,
      body: "Answered on Messenger — he's coming Saturday.",
      sendEmail: false,
    });
    expect(reply.emailed).toBe(false);
    expect((await t.run((ctx) => ctx.db.get(res.inquiryId)))?.replies?.[0]).toMatchObject({ emailed: false });
    await expect(staff.as.mutation(api.services.inquiries.replyToInquiry, { inquiryId: res.inquiryId, body: " " })).rejects.toThrow(/Write a reply/);
  });

  test("filters and counts split product leads from contact messages", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    await askAboutFish(t, ids.fish as Id<"products">);
    await t.mutation(api.services.contact.createContactMessage, {
      name: "Ana", email: "ana@example.test", subject: "Shipping", message: "Do you ship to Cebu?",
    });
    const staff = await signedInAs(t, "admin");

    expect(await staff.as.query(api.services.inquiries.getInquiryCounts, {})).toMatchObject({ all: 2, new: 2, product: 1, contact: 1 });
    expect((await staff.as.query(api.services.inquiries.getInquiries, { source: "product" })).length).toBe(1);
    expect((await staff.as.query(api.services.inquiries.getInquiries, { source: "contact" })).length).toBe(1);
    expect((await staff.as.query(api.services.inquiries.getInquiries, { search: "Super Red" })).length).toBe(1);
    expect((await staff.as.query(api.services.inquiries.getInquiries, { search: "Cebu" })).length).toBe(1);
    expect((await staff.as.query(api.services.inquiries.getInquiries, { status: "won" })).length).toBe(0);
  });

  test("leads can be listed per product, with notes and an owner", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const fish = ids.fish as Id<"products">;
    const res = await askAboutFish(t, fish);
    const staff = await signedInAs(t, "admin");

    await staff.as.mutation(api.services.inquiries.updateInquiryDetails, {
      inquiryId: res.inquiryId,
      assignedToId: staff.userId,
      staffNotes: "Serious buyer, viewing Saturday.",
    });
    const forProduct = await staff.as.query(api.services.inquiries.getInquiriesForProduct, { productId: fish });
    expect(forProduct).toHaveLength(1);
    expect(forProduct[0]).toMatchObject({ assignedToName: "Test admin", staffNotes: "Serious buyer, viewing Saturday." });
  });
});

describe("the customer's view of an inquiry", () => {
  test("shows emailed replies but never the private note or who wrote it", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const res = await askAboutFish(t, ids.fish as Id<"products">);
    const staff = await signedInAs(t, "admin");
    await staff.as.mutation(api.services.inquiries.updateInquiryDetails, { inquiryId: res.inquiryId, staffNotes: "Lowball offer, hold firm" });
    await staff.as.mutation(api.services.inquiries.replyToInquiry, { inquiryId: res.inquiryId, body: "Still available." });
    await staff.as.mutation(api.services.inquiries.replyToInquiry, { inquiryId: res.inquiryId, body: "Internal: called him instead.", sendEmail: false });

    const tracked = await t.query(api.services.tracking.trackByCode, { code: res.code, email: "juan@example.test" });
    if (tracked?.kind !== "inquiry") throw new Error("expected an inquiry");
    expect(tracked.productName).toBe("Super Red Arowana");
    // Only the emailed reply is shown, and nothing internal leaks.
    expect(tracked.replies.map((r) => r.body)).toEqual(["Still available."]);
    const serialized = JSON.stringify(tracked);
    expect(serialized).not.toContain("Lowball");
    expect(serialized).not.toContain("Test admin");
    expect(serialized).not.toContain("called him instead");
  });

  test("needs the right code and email", async () => {
    const t = newTest();
    const ids = await seedCatalog(t);
    const res = await askAboutFish(t, ids.fish as Id<"products">);
    await expect(t.query(api.services.tracking.trackByCode, { code: res.code, email: "someone@example.test" })).resolves.toBeNull();
    await expect(t.query(api.services.tracking.trackByCode, { code: "INQ-ZZZZZZ", email: "juan@example.test" })).resolves.toBeNull();
    // Case and spacing are forgiven, as with order codes.
    await expect(
      t.query(api.services.tracking.trackByCode, { code: ` ${res.code.toLowerCase()} `, email: " JUAN@example.test " }),
    ).resolves.toMatchObject({ kind: "inquiry" });
  });
});
