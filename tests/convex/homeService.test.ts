import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authErrorCode, newTest, signedInAs } from "./setup";

type T = ReturnType<typeof newTest>;

/** Turns both channels on and seeds one area plus one priced and one quoted service. */
async function setUpServices(t: T, over: { homeServiceEnabled?: boolean } = {}) {
  const staff = await signedInAs(t, "admin");
  await staff.as.mutation(api.services.serviceAreas.updateSettings, {
    deliveryEnabled: true,
    homeServiceEnabled: over.homeServiceEnabled ?? true,
    homeServiceNote: "Visits run Monday to Saturday.",
  });
  const { areaId } = await staff.as.mutation(api.services.serviceAreas.saveArea, {
    name: "Metro Manila",
    deliveryFee: 400,
    travelFee: 600,
    deliveryEnabled: true,
    homeServiceEnabled: true,
  });
  const faraway = await staff.as.mutation(api.services.serviceAreas.saveArea, {
    name: "Mindanao",
    deliveryFee: 2000,
    travelFee: 5000,
    deliveryEnabled: true,
    homeServiceEnabled: false,
  });
  const { serviceId } = await staff.as.mutation(api.services.homeService.saveService, {
    name: "Tank cleaning",
    price: 1500,
    durationMinutes: 90,
  });
  const quoted = await staff.as.mutation(api.services.homeService.saveService, { name: "New tank setup" });
  return { staff, areaId, farawayId: faraway.areaId, serviceId, quotedServiceId: quoted.serviceId };
}

const booking = (serviceId: Id<"homeServices">, areaId: Id<"serviceAreas">) => ({
  serviceId,
  areaId,
  name: "Juan dela Cruz",
  email: "juan@example.test",
  phone: "09181234567",
  address: "12 Mabini Street, Barangay San Roque, Quezon City",
  date: "2027-01-20",
  time: "09:00",
});

describe("the public home service catalog", () => {
  test("lists active services and only the areas we travel to", async () => {
    const t = newTest();
    const { staff, serviceId } = await setUpServices(t);
    await staff.as.mutation(api.services.homeService.saveService, { serviceId, name: "Tank cleaning", price: 1500, isActive: false });

    const catalog = await t.query(api.services.homeService.getHomeServiceCatalog, {});
    expect(catalog.enabled).toBe(true);
    expect(catalog.note).toBe("Visits run Monday to Saturday.");
    // The deactivated service is gone; Mindanao is delivery-only, so it isn't offered for visits.
    expect(catalog.services.map((s) => s.name)).toEqual(["New tank setup"]);
    expect(catalog.areas.map((a) => a.name)).toEqual(["Metro Manila"]);
  });

  test("says it's closed when home service is switched off", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t, { homeServiceEnabled: false });
    expect((await t.query(api.services.homeService.getHomeServiceCatalog, {})).enabled).toBe(false);
    await expect(t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId))).rejects.toThrow(/closed/i);
  });
});

describe("booking a home service visit", () => {
  test("a guest can book, and the price is snapshotted from the service and area", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t);

    const res = await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));
    expect(res).toMatchObject({ success: true, travelFee: 600, estimatedTotal: 2100 });
    expect(res.code).toMatch(/^HSV-[A-Z0-9]{6}$/);

    const row = await t.run((ctx) => ctx.db.get(res.bookingId));
    expect(row).toMatchObject({
      status: "requested",
      serviceName: "Tank cleaning",
      areaName: "Metro Manila",
      servicePrice: 1500,
      travelFee: 600,
      estimatedTotal: 2100,
      code: res.code,
    });

    // Repricing the service afterwards must not change what this customer was quoted.
    const staff = await signedInAs(t, "admin");
    await staff.as.mutation(api.services.homeService.saveService, { serviceId, name: "Tank cleaning", price: 9000 });
    expect((await t.run((ctx) => ctx.db.get(res.bookingId)))?.estimatedTotal).toBe(2100);

    // Staff get a notification they can act on.
    const notifications = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notifications.some((n) => n.relatedType === "homeServiceBooking" && n.audience === "staff")).toBe(true);
  });

  test("a service priced on inspection books with travel only and no total", async () => {
    const t = newTest();
    const { quotedServiceId, areaId } = await setUpServices(t);
    const res = await t.mutation(api.services.homeService.createHomeServiceBooking, booking(quotedServiceId, areaId));
    expect(res.estimatedTotal).toBeUndefined();
    expect(res.travelFee).toBe(600);
    expect((await t.run((ctx) => ctx.db.get(res.bookingId)))?.servicePrice).toBeUndefined();
  });

  test("rejects an area we don't travel to, a bad address and a bad email", async () => {
    const t = newTest();
    const { serviceId, areaId, farawayId } = await setUpServices(t);
    await expect(
      t.mutation(api.services.homeService.createHomeServiceBooking, { ...booking(serviceId, farawayId) }),
    ).rejects.toThrow(/don't travel/i);
    await expect(
      t.mutation(api.services.homeService.createHomeServiceBooking, { ...booking(serviceId, areaId), address: "Manila" }),
    ).rejects.toThrow(/full address/i);
    await expect(
      t.mutation(api.services.homeService.createHomeServiceBooking, { ...booking(serviceId, areaId), email: "not-an-email" }),
    ).rejects.toThrow(/email/i);
    await expect(
      t.mutation(api.services.homeService.createHomeServiceBooking, { ...booking(serviceId, areaId), date: "20-01-2027" }),
    ).rejects.toThrow(/date/i);
  });

  test("the same address can't flood the queue", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t);
    for (let i = 0; i < 5; i++) {
      await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));
    }
    await expect(t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId))).rejects.toThrow(/already sent/i);
  });
});

describe("the staff booking queue", () => {
  test("is staff-only, and customers never see the staff notes", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t);
    const res = await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));
    const staff = await signedInAs(t, "admin");
    await staff.as.mutation(api.services.homeService.updateBookingDetails, {
      bookingId: res.bookingId,
      staffNotes: "Gate code 1234",
      quotedTotal: 2400,
    });

    expect(await authErrorCode(t.query(api.services.homeService.getBookings, {}))).toBe("UNAUTHENTICATED");
    const client = await signedInAs(t, "client");
    expect(await authErrorCode(client.as.query(api.services.homeService.getBookings, {}))).toBe("FORBIDDEN");
    expect(await authErrorCode(client.as.mutation(api.services.homeService.saveService, { name: "Cheap visit", price: 1 }))).toBe("FORBIDDEN");

    // The customer's own tracking view carries the agreed price but not the internal note.
    const tracked = await t.query(api.services.tracking.trackByCode, { code: res.code, email: "juan@example.test" });
    if (tracked?.kind !== "homeService") throw new Error("expected a booking");
    expect(tracked.total).toBe(2400);
    expect(tracked.quoted).toBe(true);
    expect(JSON.stringify(tracked)).not.toContain("Gate code");

    // And only with the right email.
    await expect(t.query(api.services.tracking.trackByCode, { code: res.code, email: "someone@example.test" })).resolves.toBeNull();
  });

  test("scheduling confirms the visit, assigns someone and is audited", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t);
    const res = await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));
    const staff = await signedInAs(t, "admin");

    await staff.as.mutation(api.services.homeService.updateBookingDetails, {
      bookingId: res.bookingId,
      date: "2027-01-22",
      time: "14:00",
      assignedToId: staff.userId,
    });
    await staff.as.mutation(api.services.homeService.updateBookingStatus, { bookingId: res.bookingId, status: "confirmed" });

    const row = await t.run((ctx) => ctx.db.get(res.bookingId));
    expect(row).toMatchObject({ status: "confirmed", date: "2027-01-22", time: "14:00", assignedToName: "Test admin" });

    const counts = await staff.as.query(api.services.homeService.getBookingCounts, {});
    expect(counts).toMatchObject({ all: 1, confirmed: 1, requested: 0 });

    const actions = await t.run(async (ctx) => (await ctx.db.query("auditLogs").collect()).map((a) => a.action));
    expect(actions).toContain("homeService.update");
    expect(actions).toContain("homeService.status");
  });

  test("search finds a booking by code, phone or address", async () => {
    const t = newTest();
    const { serviceId, areaId } = await setUpServices(t);
    const res = await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));
    const staff = await signedInAs(t, "admin");
    expect((await staff.as.query(api.services.homeService.getBookings, { search: res.code })).length).toBe(1);
    expect((await staff.as.query(api.services.homeService.getBookings, { search: "san roque" })).length).toBe(1);
    expect((await staff.as.query(api.services.homeService.getBookings, { search: "nobody" })).length).toBe(0);
  });
});

describe("the service menu and areas", () => {
  test("a service with bookings is deactivated rather than deleted", async () => {
    const t = newTest();
    const { staff, serviceId, areaId } = await setUpServices(t);
    await t.mutation(api.services.homeService.createHomeServiceBooking, booking(serviceId, areaId));

    expect(await staff.as.mutation(api.services.homeService.removeService, { serviceId })).toEqual({ deleted: false });
    expect((await t.run((ctx) => ctx.db.get(serviceId)))?.isActive).toBe(false);
    // An area used by that booking is kept too.
    expect(await staff.as.mutation(api.services.serviceAreas.removeArea, { areaId })).toEqual({ deleted: false });
    expect((await t.run((ctx) => ctx.db.get(areaId)))?.isActive).toBe(false);
  });

  test("an unused service or area is deleted outright", async () => {
    const t = newTest();
    const { staff, quotedServiceId, farawayId } = await setUpServices(t);
    expect(await staff.as.mutation(api.services.homeService.removeService, { serviceId: quotedServiceId })).toEqual({ deleted: true });
    expect(await staff.as.mutation(api.services.serviceAreas.removeArea, { areaId: farawayId })).toEqual({ deleted: true });
  });

  test("area names are unique, and fees must be sane", async () => {
    const t = newTest();
    const { staff } = await setUpServices(t);
    await expect(
      staff.as.mutation(api.services.serviceAreas.saveArea, { name: "metro manila", deliveryFee: 1, travelFee: 1, deliveryEnabled: true, homeServiceEnabled: true }),
    ).rejects.toThrow(/already exists/i);
    await expect(
      staff.as.mutation(api.services.serviceAreas.saveArea, { name: "Bicol", deliveryFee: -5, travelFee: 0, deliveryEnabled: true, homeServiceEnabled: true }),
    ).rejects.toThrow(/₱0 or more/);
  });

  test("the starter menu seeds services and areas once", async () => {
    const t = newTest();
    const staff = await signedInAs(t, "admin");
    const first = await staff.as.mutation(api.services.homeService.seedStarterServices, {});
    expect(first.services).toBeGreaterThan(0);
    expect(first.areas).toBeGreaterThan(0);
    expect(await staff.as.mutation(api.services.homeService.seedStarterServices, {})).toEqual({ services: 0, areas: 0 });
  });
});
