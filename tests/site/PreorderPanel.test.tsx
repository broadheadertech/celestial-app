import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Renders the storefront pre-order panel for each state. The panel only appears for a fish that
 * is genuinely open for pre-order, so this is the cheapest way to see what a customer sees
 * without marking a real fish as incoming.
 */

type Offer = {
  productName: string;
  price: number;
  open: boolean;
  remaining: number;
  incomingQty: number;
  depositPerUnit: number;
  expectedLabel: string;
  note?: string;
  closedReason?: string;
} | null;

let offer: Offer = null;

vi.mock("@/components/dc/useQuery", () => ({ useQuery: () => offer }));
vi.mock("convex/react", () => ({ useMutation: () => async () => ({}) }));
vi.mock("@/convex/_generated/api", () => ({ api: { services: { preorders: { getPreorderOffer: "q", createPreorder: "m" } } } }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const { default: PreorderPanel } = await import("@/components/dc/PreorderPanel");

const render = () => renderToStaticMarkup(<PreorderPanel productId="p1" />);

const openOffer: Offer = {
  productName: "Super Red Arowana",
  price: 200000,
  open: true,
  remaining: 2,
  incomingQty: 5,
  depositPerUnit: 20000,
  expectedLabel: "March 2027",
};

beforeEach(() => {
  offer = null;
});

describe("the pre-order panel", () => {
  test("renders nothing at all while the query is loading", () => {
    offer = null;
    expect(render()).toBe("");
  });

  test("renders nothing for a fish that isn't open for pre-order", () => {
    offer = { ...openOffer, open: false, closedReason: "In stock now — no need to pre-order." };
    expect(render()).toBe("");
  });

  test("shows the window, the deposit, the balance and the slots left", () => {
    offer = openOffer;
    const html = render();
    expect(html).toContain("Arriving March 2027");
    expect(html).toContain("2 of 5 left");
    expect(html).toContain("Pre-order this fish");
    // Deposit, and the balance the customer still owes on collection.
    expect(html).toContain("₱20,000");
    expect(html).toContain("₱180,000");
    expect(html).toContain("refunded if the shipment falls through");
    // The call to action carries the deposit, so the commitment is clear before they tap.
    expect(html).toContain("Pre-order · ₱20,000 deposit");
  });

  test("uses the shop's own note when one is set", () => {
    offer = { ...openOffer, note: "From our March Pekan shipment." };
    const html = render();
    expect(html).toContain("From our March Pekan shipment.");
    expect(html).not.toContain("This one isn&#x27;t with us yet");
  });

  test("falls back to 'soon' and drops deposit wording when there's no date or deposit", () => {
    offer = { ...openOffer, expectedLabel: "", depositPerUnit: 0 };
    const html = render();
    expect(html).toContain("Arriving soon");
    expect(html).toContain("Pre-order this fish");
    expect(html).not.toContain("deposit");
    expect(html).not.toContain("balance");
  });

  test("never shows the form before the customer opens it", () => {
    offer = openOffer;
    const html = render();
    expect(html).not.toContain('id="po-email"');
    expect(html).not.toContain("Confirm pre-order");
  });
});
