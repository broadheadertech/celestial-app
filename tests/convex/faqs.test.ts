import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { authErrorCode, newTest, signedInAs } from "./setup";

describe("FAQs", () => {
  test("only staff can manage; the public sees published questions in order", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const client = await signedInAs(t, "client");

    expect(await authErrorCode(t.mutation(api.services.faqs.create, { question: "Q?", answer: "A", isPublished: true }))).toBe("UNAUTHENTICATED");
    expect(await authErrorCode(client.as.mutation(api.services.faqs.create, { question: "Q?", answer: "A", isPublished: true }))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.query(api.services.faqs.listAll, {}))).toBe("FORBIDDEN");

    const first = await admin.as.mutation(api.services.faqs.create, { question: "  Do you ship?  ", answer: "Pickup only.", isPublished: true });
    await admin.as.mutation(api.services.faqs.create, { question: "Draft question?", answer: "Not ready.", isPublished: false });
    const third = await admin.as.mutation(api.services.faqs.create, { question: "Deposit?", answer: "20%.", isPublished: true });

    let visible = await t.query(api.services.faqs.listPublished, {});
    expect(visible.map((f) => f.question)).toEqual(["Do you ship?", "Deposit?"]);
    expect(Object.keys(visible[0]).sort()).toEqual(["_id", "answer", "question"]);

    await admin.as.mutation(api.services.faqs.move, { id: third, direction: "up" });
    await admin.as.mutation(api.services.faqs.move, { id: third, direction: "up" });
    visible = await t.query(api.services.faqs.listPublished, {});
    expect(visible.map((f) => f._id)).toEqual([third, first]);

    await admin.as.mutation(api.services.faqs.remove, { id: first });
    expect((await t.query(api.services.faqs.listPublished, {})).map((f) => f._id)).toEqual([third]);
  });

  test("rejects empty or oversized text", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await expect(admin.as.mutation(api.services.faqs.create, { question: " ", answer: "A", isPublished: true })).rejects.toThrow(/Question is required/);
    await expect(admin.as.mutation(api.services.faqs.create, { question: "Q?", answer: "x".repeat(2001), isPublished: true })).rejects.toThrow(/too long/);
  });

  test("seedDefaults imports the old Contact page questions once", async () => {
    const t = newTest();
    expect(await t.mutation(internal.services.faqs.seedDefaults, {})).toEqual({ inserted: 5 });
    expect(await t.mutation(internal.services.faqs.seedDefaults, {})).toEqual({ inserted: 0 });
    const visible = await t.query(api.services.faqs.listPublished, {});
    expect(visible[0].question).toBe("Do you ship arowanas?");
    expect(visible).toHaveLength(5);
  });
});
