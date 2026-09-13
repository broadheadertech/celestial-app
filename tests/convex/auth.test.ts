import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { newTest } from "./setup";

const creds = { email: "keeper@example.test", password: "Arowana2026!" };

async function registered() {
  const t = newTest();
  await t.mutation(api.services.auth.register, { ...creds, firstName: "Kay", lastName: "Keeper" });
  return t;
}

describe("login", () => {
  test("correct password signs in and returns a session token", async () => {
    const t = await registered();
    const result = await t.mutation(api.services.auth.login, creds);
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeTruthy();
  });

  test("passwords are stored with PBKDF2, never in plain text", async () => {
    const t = await registered();
    const user = await t.run((ctx) =>
      ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", creds.email)).first(),
    );
    expect(user?.passwordHash).toMatch(/^pbkdf2\$/);
    expect(user?.passwordHash).not.toContain(creds.password);
  });

  test("wrong password and unknown email give the same message", async () => {
    const t = await registered();
    const wrong = await t.mutation(api.services.auth.login, { email: creds.email, password: "nope-nope-1A" });
    const unknown = await t.mutation(api.services.auth.login, { email: "ghost@example.test", password: "nope-nope-1A" });
    expect(wrong.success).toBe(false);
    expect(unknown.success).toBe(false);
    expect(wrong.message).toBe(unknown.message);
  });

  test("five failures lock the account, even for the right password", async () => {
    const t = await registered();
    for (let i = 0; i < 5; i++) {
      await t.mutation(api.services.auth.login, { email: creds.email, password: `wrong-${i}-Aa1` });
    }
    const locked = await t.mutation(api.services.auth.login, creds);
    expect(locked.success).toBe(false);
    expect(locked.message).toMatch(/too many/i);
  });
});
