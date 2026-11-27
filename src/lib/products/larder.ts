import { compileModule } from "./code";
import {
  LabRuntime,
  CLEAN_WINDOW_S,
  cleanCheck,
  hex,
  lognormal,
  type Rng,
} from "./runtime";
import { quantile, type Span } from "./telemetry";
import type { ChartSpec, CheckState, IncidentDef, ProductDef } from "./types";
import {
  CHARGE_TESTS,
  CHARGE_V157,
  CHARGE_V158,
  PRICING_TESTS,
  PRICING_V141,
  PRICING_V142,
  RESERVE_TESTS,
  RESERVE_V150,
  RESERVE_V151,
  larderFiles,
} from "./larder-code";

export type LarderItem = {
  sku: string;
  name: string;
  size: string;
  origin: string;
  priceCents: number;
  shelf: "Pantry" | "Coffee and tea" | "Tinned";
  note: string;
};

export const LARDER_ITEMS: LarderItem[] = [
  { sku: "olive-oil", name: "Arbequina olive oil", size: "500 ml", origin: "Jaén, Spain", priceCents: 1895, shelf: "Pantry", note: "November harvest, cold extracted. Green apple and almond." },
  { sku: "sea-salt", name: "Flaky sea salt", size: "250 g", origin: "Brittany, France", priceCents: 435, shelf: "Pantry", note: "Hand-raked pyramids for finishing." },
  { sku: "honey", name: "Wildflower honey", size: "340 g", origin: "Door County, Wisconsin", priceCents: 1250, shelf: "Pantry", note: "Raw and unfiltered from a late-summer pull." },
  { sku: "rigatoni", name: "Bronze-cut rigatoni", size: "500 g", origin: "Gragnano, Italy", priceCents: 575, shelf: "Pantry", note: "Slow-dried, rough enough to hold a sauce." },
  { sku: "chili-crisp", name: "Chili crisp", size: "200 g", origin: "Queens, New York", priceCents: 995, shelf: "Pantry", note: "Fried shallot, Sichuan pepper, and garlic." },
  { sku: "coffee", name: "Huila coffee, whole bean", size: "340 g", origin: "Huila, Colombia", priceCents: 1680, shelf: "Coffee and tea", note: "Roasted on Mondays. Panela and red fruit." },
  { sku: "sardines", name: "Sardines in olive oil", size: "120 g tin", origin: "Matosinhos, Portugal", priceCents: 645, shelf: "Tinned", note: "Packed by hand the day they land." },
  { sku: "sencha", name: "First-flush sencha", size: "80 g tin", origin: "Shizuoka, Japan", priceCents: 1420, shelf: "Coffee and tea", note: "Steamed lightly. Brew at 70 °C." },
];

export const itemBySku = Object.fromEntries(LARDER_ITEMS.map((item) => [item.sku, item]));

export type CartLine = { sku: string; quantity: number };
export type PricedLine = CartLine & { name: string; price: number; priceCents: number };

export function priced(lines: CartLine[]): PricedLine[] {
  return lines.map((line) => {
    const item = itemBySku[line.sku];
    return { ...line, name: item.name, priceCents: item.priceCents, price: item.priceCents / 100 };
  });
}

export function expectedCents(lines: CartLine[], promo: string) {
  const subtotal = priced(lines).reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const discount = promo === "PANTRY10" ? Math.round(subtotal / 10) : 0;
  const discounted = subtotal - discount;
  return { subtotal, discount, shipping: discounted >= 5000 ? 0 : 595, total: discounted + (discounted >= 5000 ? 0 : 595) };
}

export function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const RUNS =
  "Larder runs in this page. The storefront code in the editor prices every order, yours and the simulated customers’. Payments, inventory, and orders are simulated services with measured latencies, and every log line, trace, and chart point comes from a request this page processed.";

const RUNS_CHARGE =
  "Larder runs in this page. The storefront code in the editor charges every order, yours and the simulated customers’. The card processor is simulated: it keeps one charge per idempotency key, finishes a charge after the storefront has stopped waiting, and has been slow since 10:30. Every log line, trace, refund, and chart point comes from a request this page processed.";

export const RUTH_CART: CartLine[] = [
  { sku: "olive-oil", quantity: 1 },
  { sku: "coffee", quantity: 1 },
];

export type Card = { id: string; brand: string; last4: string; label: string; test?: boolean };
export const CARDS: Card[] = [
  { id: "card_visa_4242", brand: "VISA", last4: "4242", label: "Visa ending 4242, expires 08/28" },
  { id: "card_test_0341", brand: "TEST", last4: "0341", label: "Processor test card ending 0341", test: true },
];
export const TEST_CARD = "card_test_0341";
const TEST_CARD_MS = 2600;

export const LARDER_INCIDENTS: IncidentDef[] = [
  {
    id: "checkout-errors",
    product: "larder",
    title: "Checkout fails for some carts",
    kind: "Programming",
    skills: ["JavaScript", "Money in integer cents", "Logs"],
    summary:
      "About one checkout in eight ends with a payment error since this morning’s storefront release.",
    lead:
      "Larder sells pantry goods online. Storefront release 142 went out at 10:34, and since then about one checkout in eight ends with “We couldn’t take payment.” Those customers are not charged, and most of them do not try again.",
    ticket: {
      from: "Maya Okafor",
      role: "Customer, via chat",
      at: "10:41",
      body: "I’ve tried three times to buy the olive oil and a tub of the sea salt. Every time it says you couldn’t take payment, but my bank shows nothing pending. The same card worked here last week.",
    },
    objective:
      "Find out why payments declines these checkouts, fix the storefront code that causes it, and ship the fix. The incident closes when production checkouts stop failing and Maya’s order goes through in the shop.",
    steps: [
      "Maya’s cart is still saved in the support view. Open the cart, check out, and copy the reference from the error.",
      "Search the logs for that reference. The payments service records why it declined the charge.",
      "Compare the amount the storefront sent with the amount payments expected. Then read pricing.js and docs/pricing.md in Code.",
      "Fix the function, run the tests, and deploy. Then place Maya’s order again and watch the success rate.",
    ],
    checks: [
      { id: "mismatch", label: `No checkout fails with amount_mismatch for ${CLEAN_WINDOW_S} seconds of production traffic` },
      { id: "maya", label: "Maya’s order (one olive oil, one sea salt, no code) is confirmed in the shop" },
    ],
    review: {
      cause:
        "Release 142 switched the storefront to the catalog API’s dollar prices and did the arithmetic in floating point. A total such as $29.25 is held as 29.249999…, and Math.floor turned it into 2924 cents. Payments computes the same order in integer cents, gets 2925, and declines the charge as a mismatch.",
      fix:
        "Price the order in integer cents from start to finish: multiply priceCents by quantity, round the discount once to the nearest cent, and add shipping in cents. Release 141 could not be restored because its price endpoint was switched off at 10:40.",
      practice:
        "Keep money in integer minor units and round once, at the step the business defines. When two services compute the same amount, share one implementation or a contract test so they cannot drift apart. A rollback is the fastest mitigation only while the old version still has what it depends on.",
    },
    runs: RUNS,
    files: larderFiles("checkout-errors"),
    editable: { path: "storefront/src/pricing.js", exports: ["orderTotalCents"], testPath: "storefront/src/pricing.test.js" },
  },
  {
    id: "slow-checkout",
    product: "larder",
    title: "Checkout became slow",
    kind: "Observability",
    skills: ["Traces", "Latency percentiles", "N+1 calls"],
    summary:
      "The Pay button spins for two seconds or more on larger orders, and nothing has alerted.",
    lead:
      "Larder’s checkout objective is a p95 under 800 ms. Since 10:31 the p95 has been above 1.5 seconds, and the slow orders are the large ones. Nothing is failing, so no error alert fired.",
    ticket: {
      from: "Daniel Reyes",
      role: "Support lead, #support",
      at: "10:44",
      body: "Chat is getting “is the site down?” from people with bigger baskets. The Pay button spins for a few seconds. Two customers gave up and left. Small orders seem fine.",
    },
    objective:
      "Find where checkout time goes on large orders and bring the p95 back under 800 ms. A rollback and a code fix are both open to you. The incident closes when the p95 holds under 800 ms and your own five-product order confirms in under a second.",
    steps: [
      "Fill the cart with five or more different products and check out. Count how long the Pay button spins.",
      "Open Traces, show slow requests, and open one. Note which span repeats and how long each one takes.",
      "Compare the inventory calls per checkout chart with the release marker. Then read reserve.js and docs/inventory-api.md in Code.",
      "Roll back in Releases, or fix reserve.js and deploy. Then check out a large basket again.",
    ],
    checks: [
      { id: "p95", label: `Checkout p95 stays under 800 ms for ${CLEAN_WINDOW_S} seconds` },
      { id: "mine", label: "Your order with five or more different products confirms in under a second" },
    ],
    review: {
      cause:
        "Release 151 reserved stock with one inventory call per cart line. Each call is a round trip of about 250 ms, so a six-line basket waited 1.5 seconds on inventory before payment started. Small baskets stayed fast, which kept the average looking healthy while the p95 climbed.",
      fix:
        "Reserve the basket with reserveMany in chunks of 50 lines. That keeps release 151’s per-line results in one round trip. Rolling back to 150 also restores the latency, and it gives up the per-line results.",
      practice:
        "Set the objective on a percentile customers feel, because an average hides the slow tail. A trace where the same span repeats once per item is the signature of an N+1 call. Recording calls per request as a metric puts the next one on a chart before support hears about it.",
    },
    runs: RUNS,
    files: larderFiles("slow-checkout"),
    editable: { path: "storefront/src/reserve.js", exports: ["reserveStock"], testPath: "storefront/src/reserve.test.js" },
  },
  {
    id: "double-charge",
    product: "larder",
    title: "Some customers were charged twice",
    kind: "Programming",
    skills: ["Idempotency keys", "Safe retries", "Refunds"],
    summary:
      "Since the card processor slowed down at 10:30, some customers see two charges for one order, and a few see a charge with no order.",
    lead:
      "Larder’s card processor has been answering slowly since 10:30. Since then customers have written in about two charges for one order, and the nightly reconciliation job has started finding charges with no order behind them. Nothing in the storefront was deployed at 10:30.",
    ticket: {
      from: "Ruth Abernathy",
      role: "Customer, by email",
      at: "10:44",
      body: "My card shows two charges of $41.70 from Larder this morning, a few seconds apart. I placed one order and got one confirmation email. Please refund the second one. I order from you every month, so I’d like to know it won’t happen again.",
    },
    objective:
      "Stop the storefront from charging a card more than once, refund the customers who were already overcharged, and confirm in the shop that an order on the slow test card is charged once. The processor team is working on its latency, and it stays slow for the whole incident.",
    steps: [
      "In the support view you are signed in as Ruth. Open Orders, then her order from 10:39, and read the processor charges under it.",
      "Copy her checkout id and search the logs for it. Compare the idempotency key on each charge attempt, then read docs/payments-api.md in Code.",
      "Check out on the processor test card to see it happen. Read charge.js and the storefront releases; the change that matters went out before 10:30.",
      "Fix chargeCheckout, run the tests, and deploy. Refund the extra charges in Releases and config, then pay with the test card again.",
    ],
    checks: [
      { id: "extra", label: `No card is charged twice, or charged without an order, for ${CLEAN_WINDOW_S} seconds of production traffic` },
      { id: "refunds", label: "Every extra charge taken so far is refunded" },
      { id: "mine", label: "An order on the processor test card confirms with exactly one charge" },
    ],
    review: {
      cause:
        "Release 158 went out at 10:12 and retried a charge when the processor took longer than 2 seconds, with a new idempotency key on each attempt. While the processor was fast, nothing timed out and nothing changed. At 10:30 the processor slowed, and about one charge in nine ran past the timeout. The processor finished the first charge anyway, then treated the retry as a second payment.",
      fix:
        "Name the key after the payment: build it once from the checkout id, before the loop, and send it on every attempt. The processor then answers the retry with the first charge, waiting for it if it is still running. Rolling back to 157 stops the duplicates and leaves customers charged with no order, because a timed-out charge is never retried. The refunds return the money already taken.",
      practice:
        "A retry is safe only when the operation is idempotent, so give every side effect a key tied to the business operation rather than the attempt. A timeout means the outcome is unknown, so the shop should never tell a customer they were not charged after one. Reconcile charges against orders on a schedule, because that job finds this failure before customers do.",
    },
    runs: RUNS_CHARGE,
    files: larderFiles("double-charge"),
    editable: { path: "storefront/src/charge.js", exports: ["chargeCheckout"], testPath: "storefront/src/charge.test.js" },
  },
];

export const LARDER: ProductDef = {
  id: "larder",
  name: "Larder",
  domain: "larder.shop",
  kind: "Online pantry shop",
  description: "Olive oil, tinned fish, coffee, and tea from small producers, shipped in two days.",
  incidents: LARDER_INCIDENTS,
};

type Pricing = { orderTotalCents: (lines: PricedLine[], promo: string) => number };
type Hold = { sku: string; ok: boolean; available: number };
type Inventory = {
  reserve: (sku: string, quantity: number) => Hold;
  reserveMany: (items: CartLine[]) => Hold[];
};
type Reserve = { reserveStock: (inventory: Inventory, lines: PricedLine[]) => Hold[] };

export type CheckoutResult = {
  ok: boolean;
  checkoutId: string;
  orderId?: string;
  code?: string;
  amount?: number;
  expected: number;
  ms: number;
  lines: CartLine[];
  promo: string;
  t: number;
  card: string;
  customer: string;
  chargeIds: string[];
};

type ChargeRequest = { amountCents?: unknown; card?: unknown; idempotencyKey?: unknown; timeoutMs?: unknown };
type ChargeReply = { status: "succeeded"; chargeId: string } | { status: "declined"; reason: string } | { status: "timeout" };
type Processor = { newIdempotencyKey: () => string; charge: (request: ChargeRequest) => ChargeReply };
type Charger = { chargeCheckout: (processor: Processor, checkout: { id: string; amountCents: number; card: string }) => unknown };

export type ChargeRecord = {
  id: string;
  key: string;
  checkoutId: string;
  customer: string;
  card: string;
  amount: number;
  t: number;
  status: "succeeded" | "refunded";
  orderId?: string;
};

export type ChargeProblem = {
  checkoutId: string;
  customer: string;
  kind: "duplicate" | "orphan";
  t: number;
  extra: ChargeRecord[];
};

type LedgerEntry = { doneAt: number; declined: boolean; charge?: ChargeRecord };

const RATE_PER_S = 2;

function clockAt(base: number, h: number, m: number, s = 0) {
  const date = new Date(base);
  date.setHours(h, m, s, 0);
  return date.getTime();
}

export class LarderRuntime extends LabRuntime {
  private pricing: Pricing;
  private reserve: Reserve;
  private charger: Charger;
  private previous?: Pricing | Reserve;
  private cutover: number;
  private nextArrival?: number;
  private lastMismatchAt?: number;
  private lastExtraAt?: number;
  private recent: { t: number; ms: number }[] = [];
  private fixAt?: number;
  private ledger = new Map<string, LedgerEntry>();
  private nextRecon?: number;
  private ruthAt?: number;
  readonly mine: CheckoutResult[] = [];
  readonly charges: ChargeRecord[] = [];
  readonly problems: ChargeProblem[] = [];
  readonly inventoryRoundTrip: number;
  readonly slowFrom: number;
  readonly customer: string;
  ruthOrder?: CheckoutResult;
  refunds = { count: 0, cents: 0 };

  constructor(incident: IncidentDef) {
    super(incident, incident.id === "checkout-errors" ? 142 : incident.id === "slow-checkout" ? 151 : 158);
    const day = 24 * 3600_000;
    const at = (h: number, m: number) => clockAt(this.now, h, m);
    this.inventoryRoundTrip = incident.id === "slow-checkout" ? 250 : 45;
    this.slowFrom = incident.id === "double-charge" ? at(10, 30) : Infinity;
    this.customer = incident.id === "checkout-errors" ? "maya.okafor" : incident.id === "double-charge" ? "ruth.abernathy" : "support.test";
    this.charger = compileModule<Charger>(CHARGE_V157, ["chargeCheckout"]);
    if (incident.id === "checkout-errors") {
      this.pricing = compileModule<Pricing>(PRICING_V142, ["orderTotalCents"]);
      this.reserve = compileModule<Reserve>(RESERVE_V150, ["reserveStock"]);
      this.previous = compileModule<Pricing>(PRICING_V141, ["orderTotalCents"]);
      this.addRelease({ service: "storefront", version: "140", t: at(15, 5) - day, author: "lena.k", note: "Gift note field on checkout", state: "previous", source: PRICING_V141, rollback: { allowed: false, reason: "Reads prices from /v1/prices, switched off at 10:40 today." } });
      this.addRelease({ service: "storefront", version: "141", t: at(16, 20) - day, author: "sam.o", note: "Free shipping banner on the cart", state: "live", source: PRICING_V141, rollback: { allowed: false, reason: "Reads prices from /v1/prices, switched off at 10:40 today." } });
      this.addRelease({ service: "storefront", version: "142", t: at(10, 34), author: "lena.k", note: "Read prices from the catalog API", state: "live", source: PRICING_V142 });
      this.cutover = at(10, 34);
      this.code = {
        files: larderFiles("checkout-errors"),
        path: "storefront/src/pricing.js",
        exportNames: ["orderTotalCents"],
        testSource: PRICING_TESTS,
        replay: {
          fn: "orderTotalCents",
          inputs: () => this.replayCarts().map((cart) => [priced(cart.lines), cart.promo]),
          judge: (outputs) => {
            const carts = this.replayCarts();
            const matched = outputs.filter((value, index) => value === expectedCents(carts[index].lines, carts[index].promo).total).length;
            return {
              ok: matched === carts.length,
              summary: `${matched} of ${carts.length} recent carts priced to the cent payments expects`,
            };
          },
        },
      };
    } else if (incident.id === "slow-checkout") {
      this.pricing = compileModule<Pricing>(PRICING_V141, ["orderTotalCents"]);
      this.reserve = compileModule<Reserve>(RESERVE_V151, ["reserveStock"]);
      this.previous = compileModule<Reserve>(RESERVE_V150, ["reserveStock"]);
      this.addRelease({ service: "storefront", version: "149", t: at(17, 40) - day, author: "sam.o", note: "Holiday gift wrap option", state: "previous", source: RESERVE_V150, rollback: { allowed: false, reason: "Older than the inventory schema change on Tuesday." } });
      this.addRelease({ service: "storefront", version: "150", t: at(9, 12), author: "lena.k", note: "Batch stock holds behind a single call", state: "live", source: RESERVE_V150 });
      this.addRelease({ service: "storefront", version: "151", t: at(10, 31), author: "priya.n", note: "Report short items per line", state: "live", source: RESERVE_V151 });
      this.cutover = at(10, 31);
      this.code = {
        files: larderFiles("slow-checkout"),
        path: "storefront/src/reserve.js",
        exportNames: ["reserveStock"],
        testSource: RESERVE_TESTS,
      };
    } else {
      this.pricing = compileModule<Pricing>(PRICING_V141, ["orderTotalCents"]);
      this.reserve = compileModule<Reserve>(RESERVE_V150, ["reserveStock"]);
      this.addRelease({ service: "storefront", version: "156", t: at(11, 20) - 2 * day, author: "lena.k", note: "Gift wrap for orders over $40", state: "previous", source: CHARGE_V157, rollback: { allowed: false, reason: "Older than the orders table migration on Wednesday." } });
      this.addRelease({ service: "storefront", version: "157", t: at(16, 5) - day, author: "sam.o", note: "Show tin sizes on product cards", state: "live", source: CHARGE_V157 });
      this.addRelease({ service: "storefront", version: "158", t: at(10, 12), author: "priya.n", note: "Retry a charge once when the processor times out", state: "live", source: CHARGE_V158 });
      this.charger = compileModule<Charger>(CHARGE_V158, ["chargeCheckout"]);
      this.cutover = 0;
      this.ruthAt = clockAt(this.now, 10, 39, 12);
      this.nextRecon = Math.ceil((this.now - 20 * 60_000) / 30_000) * 30_000;
      this.telemetry.mark(this.slowFrom, "Processor status: degraded");
      this.code = {
        files: larderFiles("double-charge"),
        path: "storefront/src/charge.js",
        exportNames: ["chargeCheckout"],
        testSource: CHARGE_TESTS,
      };
    }
  }

  protected codeService() {
    return "storefront";
  }

  private replayCarts() {
    const rng = this.rngFor(7);
    return Array.from({ length: 60 }, () => this.randomCart(rng));
  }

  private rngFor(seed: number): Rng {
    let state = seed;
    return () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  }

  protected install(mod: unknown) {
    if (this.incident.id === "checkout-errors") this.pricing = mod as Pricing;
    else if (this.incident.id === "slow-checkout") this.reserve = mod as Reserve;
    else this.charger = mod as Charger;
    this.fixAt = this.now;
  }

  protected onReleaseChange() {
    const source = this.live("storefront")?.source;
    if (!source) return;
    const exportName = this.incident.id === "checkout-errors" ? "orderTotalCents" : this.incident.id === "slow-checkout" ? "reserveStock" : "chargeCheckout";
    this.install(compileModule(source, [exportName]));
  }

  private randomCart(rng: Rng = this.rng) {
    const count = rng() < 0.45 ? 1 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 4);
    const pool = [...LARDER_ITEMS];
    const lines: CartLine[] = [];
    for (let i = 0; i < count && pool.length; i++) {
      const [item] = pool.splice(Math.floor(rng() * pool.length), 1);
      lines.push({ sku: item.sku, quantity: 1 + Math.floor(rng() * rng() * 3) });
    }
    return { lines, promo: rng() < 0.3 ? "PANTRY10" : "" };
  }

  simulate(from: number, to: number) {
    if (this.nextArrival === undefined) this.nextArrival = from;
    while (this.nextArrival < to) {
      if (this.ruthAt !== undefined && this.ruthAt <= this.nextArrival) {
        const t = this.ruthAt;
        this.ruthAt = undefined;
        this.ruthOrder = this.checkout(t, RUTH_CART, "", { customer: "ruth.abernathy", card: "card_visa_4242", latencies: [2700, 320] });
      }
      const cart = this.randomCart();
      this.checkout(this.nextArrival, cart.lines, cart.promo, { card: `card_${hex(this.rng, 6)}` });
      this.nextArrival += (-Math.log(1 - this.rng()) / RATE_PER_S) * 1000;
    }
    while (this.nextRecon !== undefined && this.nextRecon < to) {
      this.reconcile(this.nextRecon);
      this.nextRecon += 30_000;
    }
    this.recent = this.recent.filter((row) => row.t > to - 60_000);
  }

  placeOrder(lines: CartLine[], promo: string, card = CARDS[0].id) {
    const result = this.checkout(this.now, lines, promo, { mine: true, card, customer: this.customer });
    this.mine.unshift(result);
    this.touch();
    return result;
  }

  previewTotal(lines: CartLine[], promo: string) {
    try {
      const value = this.pricing.orderTotalCents(priced(lines), promo);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  chargesFor(checkoutId: string) {
    return this.charges.filter((charge) => charge.checkoutId === checkoutId);
  }

  customerCharges(customer = this.customer) {
    return this.charges.filter((charge) => charge.customer === customer);
  }

  extraFor(checkoutId: string) {
    return this.problems.find((problem) => problem.checkoutId === checkoutId);
  }

  outstanding() {
    const open = this.problems.flatMap((problem) => problem.extra.filter((charge) => charge.status === "succeeded").map((charge) => ({ charge, problem })));
    return {
      duplicates: open.filter((row) => row.problem.kind === "duplicate"),
      orphans: open.filter((row) => row.problem.kind === "orphan"),
      cents: open.reduce((sum, row) => sum + row.charge.amount, 0),
      count: open.length,
      processing: open.filter((row) => row.charge.t > this.now).length,
    };
  }

  refundExtras() {
    let count = 0;
    let cents = 0;
    for (const problem of this.problems) {
      for (const charge of problem.extra) {
        if (charge.status !== "succeeded" || charge.t > this.now) continue;
        charge.status = "refunded";
        count += 1;
        cents += charge.amount;
        this.telemetry.log(this.now, "info", "processor", "refund issued", { charge_id: charge.id, checkout_id: problem.checkoutId, amount_cents: charge.amount, reason: problem.kind === "duplicate" ? "duplicate" : "no_order", by: "you" }, { mine: true });
      }
    }
    if (!count) return;
    this.refunds = { count: this.refunds.count + count, cents: this.refunds.cents + cents };
    this.telemetry.mark(this.now, `Refunded ${count} charges`);
    this.touch();
  }

  private processorMs(t: number, rng: Rng) {
    if (t < this.slowFrom) return lognormal(rng, 240, 0.25);
    return Math.min(3800, lognormal(rng, 1200, 0.42));
  }

  private reconcile(t: number) {
    const open = this.problems.filter((problem) => problem.t <= t && problem.extra.some((charge) => charge.status === "succeeded" && charge.t <= t));
    const duplicates = open.filter((problem) => problem.kind === "duplicate").length;
    const orphans = open.filter((problem) => problem.kind === "orphan").length;
    if (!duplicates && !orphans) {
      this.telemetry.log(t, "info", "payments-recon", "charges match orders", { window: "today" });
      return;
    }
    if (duplicates) this.telemetry.log(t, "warn", "payments-recon", "checkouts charged more than once", { checkouts: duplicates, unrefunded: true });
    if (orphans) this.telemetry.log(t, "warn", "payments-recon", "charges without an order", { checkouts: orphans, unrefunded: true });
  }

  private checkout(
    t: number,
    lines: CartLine[],
    promo: string,
    options: { mine?: boolean; card: string; customer?: string; latencies?: number[] },
  ): CheckoutResult {
    const mine = Boolean(options.mine);
    const card = options.card;
    const customer = options.customer ?? `c_${card.slice(-6)}`;
    const rng = this.rng;
    const historic = t < this.cutover;
    const pricing = historic && this.incident.id === "checkout-errors" ? (this.previous as Pricing) : this.pricing;
    const reserve = historic && this.incident.id === "slow-checkout" ? (this.previous as Reserve) : this.reserve;
    const traceId = hex(rng, 16);
    const checkoutId = `chk_${hex(rng, 6)}`;
    const spans: Span[] = [];
    const root = hex(rng, 8);
    const items = priced(lines);
    const expected = expectedCents(lines, promo).total;
    let at = 8 + rng() * 10;
    const tel = this.telemetry;
    const flags = { mine, traceId };
    const made: ChargeRecord[] = [];
    tel.log(t, "info", "storefront", "checkout started", { checkout_id: checkoutId, customer, lines: lines.length, promo: promo || "none" }, flags);

    const finish = (ok: boolean, code?: string, amount?: number, orderId?: string, chargeId?: string) => {
      const ms = Math.round(at + 6 + rng() * 6);
      spans.unshift({ id: root, service: "storefront", name: "POST /checkout", start: 0, duration: ms, error: ok ? undefined : code, attrs: { checkout_id: checkoutId, lines: lines.length } });
      tel.trace({ id: traceId, t, name: "POST /checkout", duration: ms, error: ok ? undefined : code, spans, attrs: { checkout_id: checkoutId, lines: lines.length, ...(orderId ? { order_id: orderId } : {}), ...(made.length > 1 ? { charges: made.length } : {}) }, mine });
      tel.count(t, "checkout.total");
      if (code !== "card_declined") tel.count(t, "checkout.eligible");
      if (ok) tel.count(t, "checkout.ok");
      else tel.count(t, `checkout.error.${code}`);
      tel.observe(t, "checkout.ms", ms);
      if (code === "amount_mismatch") this.lastMismatchAt = t;
      if (!historic) this.recent.push({ t, ms });
      if (!ok) {
        tel.log(t + ms, "warn", "storefront", "checkout failed", { checkout_id: checkoutId, code: code ?? "error", status: code === "payment_timeout" ? 504 : code === "amount_mismatch" || code === "card_declined" ? 402 : 500 }, flags);
      }
      if (orderId) for (const charge of made) if (charge.id === chargeId) charge.orderId = orderId;
      const extra = orderId ? made.filter((charge) => charge.id !== chargeId) : made;
      if (extra.length) {
        const kind = orderId ? "duplicate" : "orphan";
        this.problems.push({ checkoutId, customer, kind, t, extra });
        this.lastExtraAt = t;
        tel.count(t, `charge.${kind}`);
      }
      return { ok, checkoutId, orderId, code, amount, expected, ms, lines, promo, t, card, customer, chargeIds: made.map((charge) => charge.id) };
    };

    let amount: number;
    try {
      amount = pricing.orderTotalCents(items, promo);
      if (typeof amount !== "number" || !Number.isFinite(amount)) throw new Error(`orderTotalCents returned ${String(amount)}`);
    } catch (error) {
      spans.push({ id: hex(rng, 8), parentId: root, service: "storefront", name: "pricing.orderTotalCents", start: at, duration: 0.4, error: "exception" });
      tel.log(t, "error", "storefront", "pricing threw", { checkout_id: checkoutId, error: error instanceof Error ? error.message : String(error) }, flags);
      return finish(false, "pricing_error");
    }
    spans.push({ id: hex(rng, 8), parentId: root, service: "storefront", name: "pricing.orderTotalCents", start: at, duration: 0.4, attrs: { amount_cents: amount } });
    at += 0.6;

    const calls: number[] = [];
    const roundTrip = (name: string, n: number) => {
      const ms = Math.round(lognormal(rng, this.inventoryRoundTrip, 0.22) + n * 0.4);
      spans.push({ id: hex(rng, 8), parentId: root, service: "inventory", name, start: at, duration: ms, attrs: { items: n } });
      at += ms;
      calls.push(n);
    };
    const hold = (sku: string) => ({ sku, ok: true, available: 40 + Math.floor(rng() * 200) });
    const inventory: Inventory = {
      reserve: (sku) => {
        roundTrip("inventory.reserve", 1);
        return hold(sku);
      },
      reserveMany: (list) => {
        if (list.length > 50) throw new Error("reserveMany takes at most 50 items");
        roundTrip("inventory.reserveMany", list.length);
        return list.map((line) => hold(line.sku));
      },
    };
    try {
      const holds = reserve.reserveStock(inventory, items);
      if (!Array.isArray(holds) || holds.length !== items.length) throw new Error("reserveStock returned the wrong number of results");
    } catch (error) {
      tel.log(t, "error", "storefront", "stock hold failed", { checkout_id: checkoutId, error: error instanceof Error ? error.message : String(error) }, flags);
      return finish(false, "reserve_error");
    }
    tel.observe(t, "inventory.calls", calls.length);

    if (this.incident.id === "double-charge") {
      return this.chargeStep({ t, at, rng, root, spans, made, checkoutId, customer, card, amount, mine, flags, latencies: options.latencies }, (elapsed, ...rest) => {
        at = elapsed;
        return finish(...rest);
      });
    }

    const pay = Math.round(lognormal(rng, 175, 0.18));
    const declined = !mine && rng() < 0.006;
    const mismatch = amount !== expected;
    spans.push({ id: hex(rng, 8), parentId: root, service: "payments", name: "payments.charge", start: at, duration: pay, error: mismatch ? "amount_mismatch" : declined ? "card_declined" : undefined, attrs: { amount_cents: amount } });
    at += pay;
    if (mismatch) {
      tel.log(t + at, "error", "payments", "charge declined", { checkout_id: checkoutId, reason: "amount_mismatch", expected_cents: expected, received_cents: amount }, flags);
      return finish(false, "amount_mismatch", amount);
    }
    if (declined) {
      tel.log(t + at, "info", "payments", "charge declined", { checkout_id: checkoutId, reason: "card_declined", issuer: "do_not_honor" }, flags);
      return finish(false, "card_declined", amount);
    }
    const orderId = `LD-${48000 + Math.floor(rng() * 9000)}`;
    const create = Math.round(18 + rng() * 14);
    spans.push({ id: hex(rng, 8), parentId: root, service: "orders", name: "orders.create", start: at, duration: create, attrs: { order_id: orderId } });
    at += create;
    tel.log(t + at, "info", "orders", "order created", { order_id: orderId, checkout_id: checkoutId, amount_cents: amount }, flags);
    return finish(true, undefined, amount, orderId);
  }

  private chargeStep(
    ctx: {
      t: number;
      at: number;
      rng: Rng;
      root: string;
      spans: Span[];
      made: ChargeRecord[];
      checkoutId: string;
      customer: string;
      card: string;
      amount: number;
      mine: boolean;
      flags: { mine: boolean; traceId: string };
      latencies?: number[];
    },
    finish: (at: number, ok: boolean, code?: string, amount?: number, orderId?: string, chargeId?: string) => CheckoutResult,
  ): CheckoutResult {
    const { t, rng, root, spans, made, checkoutId, customer, card, amount, mine, flags } = ctx;
    const tel = this.telemetry;
    const forced = [...(ctx.latencies ?? [])];
    const scripted = ctx.latencies !== undefined;
    let at = ctx.at;
    let attempts = 0;
    const processor: Processor = {
      newIdempotencyKey: () => `key_${hex(rng, 10)}`,
      charge: (request) => {
        attempts += 1;
        if (attempts > 6) throw new Error("chargeCheckout sent more than six requests for one checkout");
        const key = String(request?.idempotencyKey ?? "");
        const timeoutMs = Math.max(1, Number(request?.timeoutMs) || 2000);
        const requested = Number(request?.amountCents);
        const start = at;
        let entry = key ? this.ledger.get(key) : undefined;
        const replay = Boolean(entry);
        tel.log(t + start, "info", "storefront", "charge attempt", { checkout_id: checkoutId, attempt: attempts, idempotency_key: key || "none" }, flags);
        if (!entry) {
          const latency = Math.round(forced.shift() ?? (card === TEST_CARD ? TEST_CARD_MS : this.processorMs(t + start, rng)));
          const declined = !mine && !scripted && card !== TEST_CARD && rng() < 0.006;
          entry = { doneAt: start + latency, declined };
          tel.observe(t + start, "processor.ms", latency);
          if (!declined) {
            const charge: ChargeRecord = { id: `ch_${hex(rng, 8)}`, key, checkoutId, customer, card, amount: Number.isFinite(requested) ? requested : amount, t: t + start + latency, status: "succeeded" };
            entry.charge = charge;
            made.push(charge);
            this.charges.push(charge);
            tel.log(t + start + latency, "info", "processor", "charge succeeded", { charge_id: charge.id, checkout_id: checkoutId, idempotency_key: key || "none", amount_cents: charge.amount, card: card.slice(-4) }, flags);
          } else {
            tel.log(t + start + latency, "info", "processor", "charge declined", { checkout_id: checkoutId, idempotency_key: key || "none", reason: "do_not_honor" }, flags);
          }
          if (key) this.ledger.set(key, entry);
        }
        const wait = Math.max(0, entry.doneAt - start);
        if (wait > timeoutMs) {
          at = start + timeoutMs;
          spans.push({ id: hex(rng, 8), parentId: root, service: "processor", name: "processor.charge", start, duration: timeoutMs, error: "timeout", attrs: { attempt: attempts, idempotency_key: key || "none", ...(replay ? { replay: true } : {}) } });
          tel.log(t + at, "warn", "storefront", "charge timed out", { checkout_id: checkoutId, attempt: attempts, idempotency_key: key || "none", after_ms: timeoutMs }, flags);
          return { status: "timeout" };
        }
        const ms = Math.round(wait + 12 + rng() * 10);
        at = start + ms;
        spans.push({ id: hex(rng, 8), parentId: root, service: "processor", name: "processor.charge", start, duration: ms, error: entry.declined ? "declined" : undefined, attrs: { attempt: attempts, idempotency_key: key || "none", ...(entry.charge ? { charge_id: entry.charge.id } : {}), ...(replay ? { replay: true } : {}) } });
        if (replay) tel.log(t + at, "info", "processor", "idempotent replay", { checkout_id: checkoutId, idempotency_key: key, charge_id: entry.charge?.id ?? "none" }, flags);
        if (entry.declined) return { status: "declined", reason: "do_not_honor" };
        return { status: "succeeded", chargeId: entry.charge!.id };
      },
    };

    let reply: unknown;
    try {
      reply = this.charger.chargeCheckout(processor, { id: checkoutId, amountCents: amount, card });
    } catch (error) {
      tel.log(t + at, "error", "storefront", "charge threw", { checkout_id: checkoutId, error: error instanceof Error ? error.message : String(error) }, flags);
      return finish(at, false, "charge_error", amount);
    }
    const status = reply && typeof reply === "object" ? (reply as { status?: unknown }).status : undefined;
    if (status === "timeout") return finish(at, false, "payment_timeout", amount);
    if (status === "declined") return finish(at, false, "card_declined", amount);
    const chargeId = status === "succeeded" ? String((reply as { chargeId?: unknown }).chargeId ?? "") : "";
    if (!chargeId || !this.charges.some((charge) => charge.id === chargeId)) {
      tel.log(t + at, "error", "storefront", "charge returned no charge id", { checkout_id: checkoutId, returned: JSON.stringify(reply ?? null).slice(0, 80) }, flags);
      return finish(at, false, "charge_error", amount);
    }
    const orderId = `LD-${48000 + Math.floor(rng() * 9000)}`;
    const create = Math.round(18 + rng() * 14);
    spans.push({ id: hex(rng, 8), parentId: root, service: "orders", name: "orders.create", start: at, duration: create, attrs: { order_id: orderId, charge_id: chargeId } });
    at += create;
    tel.log(t + at, "info", "orders", "order created", { order_id: orderId, checkout_id: checkoutId, charge_id: chargeId, amount_cents: amount }, flags);
    return finish(at, true, undefined, amount, orderId, chargeId);
  }

  charts(): ChartSpec[] {
    const tel = this.telemetry;
    const from = this.now - 20 * 60_000;
    const to = this.now;
    const perMin = 60_000 / tel.bucketMs;
    const rate = (key: string) => tel.series(key, from, to, "sum").map((p) => ({ t: p.t, v: (p.v ?? 0) * perMin }));
    const success: ChartSpec = {
      id: "success",
      title: "Checkout success",
      unit: "%",
      help: "Completed orders as a share of checkouts. A customer’s own card decline is left out, because the storefront did nothing wrong.",
      series: [{ label: "Success", points: tel.ratio("checkout.ok", "checkout.eligible", from, to), tone: "primary" }],
      threshold: { value: 99.5, label: "Objective 99.5%" },
      domain: [80, 100],
    };
    const latency: ChartSpec = {
      id: "latency",
      title: "Checkout latency",
      unit: "ms",
      help: "Time from pressing Pay to the order page. The p95 is the time 95 percent of checkouts beat; the slowest 5 percent take longer.",
      series: [
        { label: "p95", points: tel.series("checkout.ms", from, to, "p95"), tone: "primary" },
        { label: "p50", points: tel.series("checkout.ms", from, to, "p50"), tone: "muted" },
      ],
      threshold: this.incident.id === "slow-checkout" ? { value: 800, label: "Objective p95 800 ms" } : undefined,
    };
    if (this.incident.id === "double-charge") {
      return [
        {
          id: "processor",
          title: "Card processor latency",
          unit: "ms",
          help: "Time the processor takes to finish a new charge. The storefront stops waiting at 2 seconds; the processor does not.",
          series: [
            { label: "p95", points: tel.series("processor.ms", from, to, "p95"), tone: "primary" },
            { label: "p50", points: tel.series("processor.ms", from, to, "p50"), tone: "muted" },
          ],
          threshold: { value: 2000, label: "Storefront timeout 2 s" },
        },
        {
          id: "extra",
          title: "Checkouts with an extra charge",
          unit: "/min",
          help: "Checkouts where the processor charged the card for more than the one order, or charged it while the shop showed an error.",
          series: [
            { label: "Charged twice", points: rate("charge.duplicate"), tone: "bad" },
            { label: "Charged, no order", points: rate("charge.orphan"), tone: "accent" },
          ],
        },
        success,
      ];
    }
    if (this.incident.id === "checkout-errors") {
      return [
        success,
        {
          id: "declines",
          title: "Payment declines by reason",
          unit: "/min",
          help: "Charges payments refused, per minute. card_declined is the customer’s bank saying no. amount_mismatch is payments refusing an amount it did not expect.",
          series: [
            { label: "amount_mismatch", points: rate("checkout.error.amount_mismatch"), tone: "bad" },
            { label: "card_declined", points: rate("checkout.error.card_declined"), tone: "muted" },
          ],
        },
        latency,
      ];
    }
    return [
      latency,
      {
        id: "calls",
        title: "Inventory calls per checkout",
        unit: "×",
        help: "Average number of round trips to inventory for one checkout.",
        series: [{ label: "Calls", points: tel.series("inventory.calls", from, to, "mean"), tone: "accent" }],
        domain: [0, 5],
      },
      success,
    ];
  }

  p95Recent() {
    const window = this.recent.filter((row) => row.t > this.now - CLEAN_WINDOW_S * 1000).map((row) => row.ms);
    return quantile(window, 0.95);
  }

  checks(): CheckState[] {
    if (this.incident.id === "checkout-errors") {
      const maya = this.mine.find(
        (order) =>
          order.ok &&
          !order.promo &&
          order.lines.length === 2 &&
          order.lines.some((line) => line.sku === "olive-oil" && line.quantity === 1) &&
          order.lines.some((line) => line.sku === "sea-salt" && line.quantity === 1),
      );
      return [
        cleanCheck("mismatch", this.incident.checks[0].label, this.now, this.lastMismatchAt),
        {
          id: "maya",
          label: this.incident.checks[1].label,
          done: Boolean(maya),
          detail: maya ? `Order ${maya.orderId} confirmed` : "Not placed yet",
        },
      ];
    }
    if (this.incident.id === "double-charge") {
      const open = this.outstanding();
      const tested = this.mine.filter((order) => order.card === TEST_CARD);
      const good = tested.find((order) => order.ok && order.chargeIds.length === 1);
      const last = tested[0];
      return [
        cleanCheck("extra", this.incident.checks[0].label, this.now, this.lastExtraAt),
        {
          id: "refunds",
          label: this.incident.checks[1].label,
          done: open.count === 0,
          detail: open.count
            ? `${open.count} ${open.count === 1 ? "charge" : "charges"} to refund, ${dollars(open.cents)}${open.processing ? `, ${open.processing} still processing` : ""}`
            : `${this.refunds.count} refunded, ${dollars(this.refunds.cents)}`,
        },
        {
          id: "mine",
          label: this.incident.checks[2].label,
          done: Boolean(good),
          detail: good
            ? `Order ${good.orderId}, one charge`
            : last
              ? last.ok
                ? `Order ${last.orderId} has ${last.chargeIds.length} charges`
                : `Payment failed with ${last.chargeIds.length} ${last.chargeIds.length === 1 ? "charge" : "charges"} taken`
              : "Not placed yet",
        },
      ];
    }
    const p95 = this.p95Recent();
    const settled = this.fixAt !== undefined && this.now - this.fixAt >= CLEAN_WINDOW_S * 1000;
    const mine = this.mine.find((order) => order.ok && order.lines.length >= 5 && order.ms < 1000);
    return [
      {
        id: "p95",
        label: this.incident.checks[0].label,
        done: settled && p95 !== null && p95 < 800,
        detail:
          p95 === null
            ? "Waiting for traffic"
            : `p95 ${Math.round(p95).toLocaleString()} ms over the last ${CLEAN_WINDOW_S} seconds${this.fixAt !== undefined && !settled ? `, ${Math.ceil(CLEAN_WINDOW_S - (this.now - this.fixAt) / 1000)} s to go` : ""}`,
      },
      {
        id: "mine",
        label: this.incident.checks[1].label,
        done: Boolean(mine),
        detail: mine ? `Order ${mine.orderId} in ${mine.ms} ms` : this.mine.some((order) => order.lines.length >= 5) ? `Last large order took ${this.mine.find((order) => order.lines.length >= 5)!.ms.toLocaleString()} ms` : "Not placed yet",
      },
    ];
  }
}
