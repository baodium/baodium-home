import type { CodeFile } from "./types";

export const PRICING_V141 = `// Prices the cart the customer is about to pay for.
// Payments recomputes this amount and declines the charge when the
// two amounts differ (see docs/pricing.md).

export function orderTotalCents(lines, promoCode) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.priceCents * line.quantity,
    0,
  );
  const discount = promoCode === "PANTRY10" ? Math.round(subtotal / 10) : 0;
  const discounted = subtotal - discount;
  const shipping = discounted >= 5000 ? 0 : 595;
  return discounted + shipping;
}
`;

export const PRICING_V142 = `// Prices the cart the customer is about to pay for.
// Payments recomputes this amount and declines the charge when the
// two amounts differ (see docs/pricing.md).

const FREE_SHIPPING_FROM = 50.0;
const SHIPPING = 5.95;
const PROMO_RATE = { PANTRY10: 0.1 };

// Release 142: prices now come from the catalog API in dollars.
export function orderTotalCents(lines, promoCode) {
  let subtotal = 0;
  for (const line of lines) {
    subtotal += line.price * line.quantity;
  }
  const discount = subtotal * (PROMO_RATE[promoCode] ?? 0);
  const discounted = subtotal - discount;
  const shipping = discounted >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  return Math.floor((discounted + shipping) * 100);
}
`;

export const PRICING_TESTS = `import { orderTotalCents } from "./pricing.js";

const oil = { sku: "olive-oil", price: 18.95, priceCents: 1895 };
const salt = { sku: "sea-salt", price: 4.35, priceCents: 435 };
const crisp = { sku: "chili-crisp", price: 9.95, priceCents: 995 };
const coffee = { sku: "coffee", price: 16.8, priceCents: 1680 };
const sardines = { sku: "sardines", price: 6.45, priceCents: 645 };
const line = (item, quantity) => ({ ...item, quantity });

test("Maya's cart: one olive oil and one sea salt", () => {
  assert.equal(orderTotalCents([line(oil, 1), line(salt, 1)], ""), 2925);
});

test("two tubs of sea salt", () => {
  assert.equal(orderTotalCents([line(salt, 2)], ""), 1465);
});

test("one jar of chili crisp", () => {
  assert.equal(orderTotalCents([line(crisp, 1)], ""), 1590);
});

test("PANTRY10 on two tins of sardines", () => {
  assert.equal(orderTotalCents([line(sardines, 2)], "PANTRY10"), 1756);
});

test("PANTRY10 rounds a half-cent discount up", () => {
  // 10 percent of $18.95 is $1.895, which rounds to $1.90.
  assert.equal(orderTotalCents([line(oil, 1)], "PANTRY10"), 2300);
});

test("free shipping from $50.00 after the discount", () => {
  assert.equal(orderTotalCents([line(coffee, 3)], ""), 5040);
  assert.equal(orderTotalCents([line(coffee, 3)], "PANTRY10"), 5131);
});

test("always returns a whole number of cents", () => {
  const total = orderTotalCents([line(crisp, 2), line(salt, 1)], "PANTRY10");
  assert.ok(Number.isInteger(total), "total is " + total);
  assert.equal(total, 2777);
});
`;

export const PRICING_DOC = `# How Larder prices an order

Every amount is in US cents. Before it charges a card, payments
recomputes the total from the catalog and declines the charge with
amount_mismatch when the storefront's amount is different.

1. Subtotal: each line's unit price times its quantity, summed.
2. Discount: PANTRY10 takes 10 percent off the subtotal, rounded to
   the nearest cent (half a cent rounds up).
3. Shipping: $5.95, free when the discounted subtotal is $50.00 or more.
4. Total: discounted subtotal plus shipping.

Each cart line carries:
  sku         "sea-salt"
  quantity    2
  price       4.35   dollars, a JavaScript number (catalog API)
  priceCents  435    integer cents (catalog API)
`;

export const RESERVE_V150 = `// Holds stock for every line before payment.
// See docs/inventory-api.md for the inventory client.

export function reserveStock(inventory, lines) {
  if (lines.length === 0) return [];
  return inventory.reserveMany(
    lines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
  );
}
`;

export const RESERVE_V151 = `// Holds stock for every line before payment.
// See docs/inventory-api.md for the inventory client.

// Release 151: reserve line by line so a short item is reported on
// its own instead of failing the whole basket.
export function reserveStock(inventory, lines) {
  const results = [];
  for (const line of lines) {
    results.push(inventory.reserve(line.sku, line.quantity));
  }
  return results;
}
`;

export const RESERVE_TESTS = `import { reserveStock } from "./reserve.js";

function fakeInventory(stock) {
  const calls = [];
  const hold = ({ sku, quantity }) => ({
    sku,
    ok: (stock[sku] ?? 0) >= quantity,
    available: stock[sku] ?? 0,
  });
  return {
    calls,
    reserve(sku, quantity) {
      calls.push(1);
      return hold({ sku, quantity });
    },
    reserveMany(items) {
      if (items.length > 50) throw new Error("reserveMany takes at most 50 items");
      calls.push(items.length);
      return items.map(hold);
    },
  };
}

const cart = (n) =>
  Array.from({ length: n }, (_, i) => ({ sku: "sku-" + i, quantity: 1 }));
const plenty = (n) =>
  Object.fromEntries(cart(n).map((line) => [line.sku, 10]));

test("returns one result per line, in cart order", () => {
  const inventory = fakeInventory(plenty(3));
  const results = reserveStock(inventory, cart(3));
  assert.deepEqual(results.map((r) => r.sku), ["sku-0", "sku-1", "sku-2"]);
});

test("reports a short item without failing the others", () => {
  const inventory = fakeInventory({ "sku-0": 5, "sku-1": 0 });
  const results = reserveStock(inventory, cart(2));
  assert.deepEqual(results.map((r) => r.ok), [true, false]);
});

test("a six-line basket takes one round trip", () => {
  const inventory = fakeInventory(plenty(6));
  reserveStock(inventory, cart(6));
  assert.equal(inventory.calls.length, 1, "inventory calls");
});

test("an empty basket makes no calls", () => {
  const inventory = fakeInventory({});
  assert.deepEqual(reserveStock(inventory, []), []);
  assert.equal(inventory.calls.length, 0, "inventory calls");
});

test("a 120-line wholesale order takes three round trips", () => {
  const inventory = fakeInventory(plenty(120));
  const results = reserveStock(inventory, cart(120));
  assert.equal(results.length, 120, "results");
  assert.equal(inventory.calls.length, 3, "inventory calls");
});
`;

export const INVENTORY_DOC = `# Inventory client

reserve(sku, quantity)
  Holds stock for one item. Returns { sku, ok, available }.

reserveMany(items)
  Holds stock for up to 50 items in one request.
  items: [{ sku, quantity }, ...]
  Returns one result per item, in the same order, each shaped like
  reserve's result. A short item comes back with ok: false and does
  not fail the others.

Both calls are one network round trip. During the winter sale a
round trip from the storefront takes about 250 ms.
`;

export const CHECKOUT_JS = `// Read-only here: the checkout handler that calls your code.
import { orderTotalCents } from "./pricing.js";
import { reserveStock } from "./reserve.js";

export function handleCheckout(cart, deps) {
  const amount = orderTotalCents(cart.lines, cart.promoCode);
  const holds = reserveStock(deps.inventory, cart.lines);
  const short = holds.filter((hold) => !hold.ok);
  if (short.length) return { status: 409, code: "out_of_stock", short };
  const charge = deps.payments.charge({ checkoutId: cart.id, amount, lines: cart.lines });
  if (!charge.ok) return { status: 402, code: charge.reason };
  return { status: 201, order: deps.orders.create(cart, charge) };
}
`;

export function larderFiles(incident: "checkout-errors" | "slow-checkout"): CodeFile[] {
  if (incident === "checkout-errors") {
    return [
      { path: "storefront/src/pricing.js", source: PRICING_V142, language: "javascript", editable: true },
      { path: "storefront/src/pricing.test.js", source: PRICING_TESTS, language: "javascript" },
      { path: "storefront/src/checkout.js", source: CHECKOUT_JS, language: "javascript" },
      { path: "docs/pricing.md", source: PRICING_DOC, language: "markdown" },
    ];
  }
  return [
    { path: "storefront/src/reserve.js", source: RESERVE_V151, language: "javascript", editable: true },
    { path: "storefront/src/reserve.test.js", source: RESERVE_TESTS, language: "javascript" },
    { path: "storefront/src/checkout.js", source: CHECKOUT_JS, language: "javascript" },
    { path: "docs/inventory-api.md", source: INVENTORY_DOC, language: "markdown" },
  ];
}
