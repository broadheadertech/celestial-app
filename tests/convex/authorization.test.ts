import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { authErrorCode, newTest, signedInAs } from "./setup";

describe("staff-only functions", () => {
  test("guests are rejected as UNAUTHENTICATED", async () => {
    const t = newTest();
    expect(await authErrorCode(t.query(api.services.orders.getAllOrdersAdmin, {}))).toBe("UNAUTHENTICATED");
    expect(await authErrorCode(t.query(api.services.finance.getFinancialSummary, {}))).toBe("UNAUTHENTICATED");
  });

  test("customers are rejected as FORBIDDEN", async () => {
    const t = newTest();
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.orders.getAllOrdersAdmin, {}))).toBe("FORBIDDEN");
  });

  test("admins are allowed", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await expect(admin.as.query(api.services.orders.getAllOrdersAdmin, {})).resolves.toEqual([]);
  });

  test("a revoked session is treated as signed out", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await t.run((ctx) => ctx.db.patch(admin.sessionId, { revokedAt: Date.now() }));
    expect(await authErrorCode(admin.as.query(api.services.orders.getAllOrdersAdmin, {}))).toBe("UNAUTHENTICATED");
  });

  test("a deactivated account is treated as signed out", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    await t.run((ctx) => ctx.db.patch(admin.userId, { isActive: false }));
    expect(await authErrorCode(admin.as.query(api.services.orders.getAllOrdersAdmin, {}))).toBe("UNAUTHENTICATED");
  });
});

describe("role changes", () => {
  test("only super admins can change roles", async () => {
    const t = newTest();
    const admin = await signedInAs(t, "admin");
    const superAdmin = await signedInAs(t, "super_admin");
    const customer = await signedInAs(t, "client");

    expect(
      await authErrorCode(admin.as.mutation(api.services.admin.updateUserRole, { userId: customer.userId, role: "admin" })),
    ).toBe("FORBIDDEN");

    await superAdmin.as.mutation(api.services.admin.updateUserRole, { userId: customer.userId, role: "admin" });
    const updated = await t.run((ctx) => ctx.db.get(customer.userId));
    expect(updated?.role).toBe("admin");
  });

  test("public sign-up can't create staff accounts", async () => {
    const t = newTest();
    const result = await t.mutation(api.services.auth.register, {
      email: "new-user@example.test",
      password: "Sup3rSecret!",
      firstName: "New",
      lastName: "User",
      role: "super_admin",
    });
    expect(result.user?.role).toBe("client");
    expect(result.sessionToken).toBeTruthy();
  });
});

describe("customer data", () => {
  test("a customer can't read another customer's orders", async () => {
    const t = newTest();
    const alice = await signedInAs(t, "client");
    const bob = await signedInAs(t, "client");
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("orders", {
        userId: bob.userId,
        status: "pending",
        items: [],
        totalAmount: 100,
        shippingAddress: { street: "x", city: "x", state: "x", zipCode: "x", country: "PH" },
        paymentMethod: "cash",
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(alice.as.query(api.services.orders.getUserOrders, { userId: bob.userId })).resolves.toEqual([]);
    await expect(bob.as.query(api.services.orders.getUserOrders, { userId: bob.userId })).resolves.toHaveLength(1);
  });
});
