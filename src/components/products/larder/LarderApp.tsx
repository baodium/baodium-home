"use client";

import { useState } from "react";
import { Check, Copy, Minus, Plus, ShoppingBag, X } from "lucide-react";
import {
  CARDS,
  LARDER_ITEMS,
  RUTH_CART,
  TEST_CARD,
  dollars,
  expectedCents,
  itemBySku,
  type CartLine,
  type ChargeRecord,
  type CheckoutResult,
  type LarderRuntime,
} from "@/lib/products/larder";
import { clock } from "@/lib/products/telemetry";
import { BrowserFrame } from "../BrowserFrame";
import { ProductArt } from "./ProductArt";
import "./larder.css";

type Route =
  | { name: "shop"; shelf?: string }
  | { name: "product"; sku: string }
  | { name: "cart" }
  | { name: "checkout" }
  | { name: "order"; result: CheckoutResult; viewing?: boolean }
  | { name: "orders" }
  | { name: "payments" };

const SHELVES = ["Pantry", "Coffee and tea", "Tinned"] as const;

function pathOf(route: Route) {
  if (route.name === "product") return `/products/${route.sku}`;
  if (route.name === "cart") return "/cart";
  if (route.name === "checkout") return "/checkout";
  if (route.name === "order") return `/orders/${route.result.orderId}`;
  if (route.name === "orders") return "/orders";
  if (route.name === "payments") return "/support/card-activity";
  return route.shelf ? `/shop/${route.shelf.toLowerCase().replace(/ /g, "-")}` : "/";
}

const CUSTOMERS = {
  "checkout-errors": { name: "Maya Okafor", email: "maya.okafor@fastmail.com", street: "2231 W Roscoe St", city: "Chicago, IL 60618" },
  "double-charge": { name: "Ruth Abernathy", email: "ruth.abernathy@icloud.com", street: "5240 N Wayne Ave", city: "Chicago, IL 60640" },
  default: { name: "Test Customer", email: "test.customer@larder.shop", street: "1 Support Way", city: "Chicago, IL 60607" },
};

export function LarderApp({ runtime }: { runtime: LarderRuntime }) {
  const maya = runtime.incident.id === "checkout-errors";
  const charging = runtime.incident.id === "double-charge";
  const [route, setRoute] = useState<Route>({ name: "shop" });
  const [cart, setCart] = useState<CartLine[]>(
    maya
      ? [
          { sku: "olive-oil", quantity: 1 },
          { sku: "sea-salt", quantity: 1 },
        ]
      : charging
        ? RUTH_CART
        : [
            { sku: "honey", quantity: 1 },
            { sku: "coffee", quantity: 1 },
          ],
  );
  const [card, setCard] = useState(CARDS[0].id);
  const [promo, setPromo] = useState("");
  const [promoDraft, setPromoDraft] = useState("");
  const [promoError, setPromoError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [failure, setFailure] = useState<CheckoutResult | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const customer = maya ? CUSTOMERS["checkout-errors"] : charging ? CUSTOMERS["double-charge"] : CUSTOMERS.default;

  const go = (next: Route) => {
    setRoute(next);
    setFailure(null);
    setCopied(false);
  };

  const add = (sku: string, quantity = 1) => {
    setCart((lines) => {
      const found = lines.find((line) => line.sku === sku);
      return found ? lines.map((line) => (line.sku === sku ? { ...line, quantity: line.quantity + quantity } : line)) : [...lines, { sku, quantity }];
    });
    setAdded(sku);
    setTimeout(() => setAdded((value) => (value === sku ? null : value)), 1400);
  };

  const setQuantity = (sku: string, quantity: number) => {
    setCart((lines) => (quantity <= 0 ? lines.filter((line) => line.sku !== sku) : lines.map((line) => (line.sku === sku ? { ...line, quantity } : line))));
  };

  const summary = expectedCents(cart, promo);
  const shownTotal = runtime.previewTotal(cart, promo);

  async function pay() {
    if (!cart.length || placing) return;
    setPlacing(true);
    setFailure(null);
    setCopied(false);
    const result = runtime.placeOrder(cart, promo, card);
    await new Promise((resolve) => setTimeout(resolve, result.ms));
    setPlacing(false);
    if (result.ok) {
      setCart([]);
      setPromo("");
      setPromoDraft("");
      setRoute({ name: "order", result });
    } else {
      setFailure(result);
    }
  }

  const header = (
    <header className="ld-header">
      <button type="button" className="ld-wordmark" onClick={() => go({ name: "shop" })}>
        Larder
      </button>
      <nav aria-label="Larder">
        {SHELVES.map((shelf) => (
          <button key={shelf} type="button" aria-current={route.name === "shop" && route.shelf === shelf ? "page" : undefined} onClick={() => go({ name: "shop", shelf })}>
            {shelf}
          </button>
        ))}
        <button type="button" aria-current={route.name === "orders" ? "page" : undefined} onClick={() => go({ name: "orders" })}>
          Orders
        </button>
      </nav>
      <button type="button" className="ld-cart-button" onClick={() => go({ name: "cart" })} aria-label={`Cart, ${count} items`}>
        <ShoppingBag size={17} aria-hidden="true" />
        <span>{count}</span>
      </button>
    </header>
  );

  let page;
  if (route.name === "shop") {
    const items = route.shelf ? LARDER_ITEMS.filter((item) => item.shelf === route.shelf) : LARDER_ITEMS;
    page = (
      <div className="ld-shop">
        <div className="ld-intro">
          <h2>{route.shelf ?? "Winter pantry"}</h2>
          <p>{route.shelf ? `${items.length} things on this shelf.` : "New-harvest olive oil, tinned fish from Matosinhos, and coffee roasted on Monday. Free shipping from $50."}</p>
        </div>
        <ul className="ld-grid">
          {items.map((item) => (
            <li key={item.sku} className="ld-card">
              <button type="button" className="ld-card-art" onClick={() => go({ name: "product", sku: item.sku })} aria-label={`${item.name}, details`}>
                <ProductArt sku={item.sku} />
              </button>
              <div className="ld-card-body">
                <h3>{item.name}</h3>
                <p>
                  {item.size} · {item.origin}
                </p>
                <div className="ld-card-foot">
                  <strong>{dollars(item.priceCents)}</strong>
                  <button type="button" className={added === item.sku ? "is-added" : undefined} onClick={() => add(item.sku)}>
                    {added === item.sku ? (
                      <>
                        <Check size={14} aria-hidden="true" /> Added
                      </>
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (route.name === "product") {
    const item = itemBySku[route.sku];
    page = (
      <div className="ld-product">
        <ProductArt sku={item.sku} className="ld-product-art" />
        <div>
          <p className="ld-eyebrow">{item.shelf}</p>
          <h2>{item.name}</h2>
          <p className="ld-muted">
            {item.size}, {item.origin}
          </p>
          <p>{item.note}</p>
          <p className="ld-price">{dollars(item.priceCents)}</p>
          <button type="button" className="ld-primary" onClick={() => add(item.sku)}>
            {added === item.sku ? "Added to cart" : "Add to cart"}
          </button>
          <button type="button" className="ld-link" onClick={() => go({ name: "shop" })}>
            Back to the shop
          </button>
        </div>
      </div>
    );
  } else if (route.name === "cart") {
    page = (
      <div className="ld-cart">
        <h2>Your cart</h2>
        {cart.length ? (
          <div className="ld-cart-grid">
            <ul className="ld-lines">
              {cart.map((line) => {
                const item = itemBySku[line.sku];
                return (
                  <li key={line.sku}>
                    <ProductArt sku={line.sku} className="ld-thumb" />
                    <div>
                      <strong>{item.name}</strong>
                      <span className="ld-muted">
                        {item.size} · {dollars(item.priceCents)} each
                      </span>
                    </div>
                    <div className="ld-qty" role="group" aria-label={`${item.name} quantity`}>
                      <button type="button" onClick={() => setQuantity(line.sku, line.quantity - 1)} aria-label="One fewer">
                        <Minus size={13} aria-hidden="true" />
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => setQuantity(line.sku, line.quantity + 1)} aria-label="One more">
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <span className="ld-line-total">{dollars(item.priceCents * line.quantity)}</span>
                    <button type="button" className="ld-remove" onClick={() => setQuantity(line.sku, 0)} aria-label={`Remove ${item.name}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <aside className="ld-summary">
              <form
                className="ld-promo"
                onSubmit={(event) => {
                  event.preventDefault();
                  const code = promoDraft.trim().toUpperCase();
                  if (!code) {
                    setPromo("");
                    setPromoError("");
                  } else if (code === "PANTRY10") {
                    setPromo(code);
                    setPromoError("");
                  } else setPromoError("That code isn’t valid.");
                }}
              >
                <label htmlFor="ld-promo">Promo code</label>
                <div>
                  <input id="ld-promo" value={promoDraft} onChange={(event) => setPromoDraft(event.target.value)} placeholder="PANTRY10" />
                  <button type="submit">Apply</button>
                </div>
                {promoError ? <p className="ld-field-error">{promoError}</p> : null}
              </form>
              <Summary summary={summary} promo={promo} total={shownTotal} />
              <button type="button" className="ld-primary ld-wide" onClick={() => go({ name: "checkout" })}>
                Check out
              </button>
            </aside>
          </div>
        ) : (
          <div className="ld-empty">
            <p>Your cart is empty.</p>
            <button type="button" className="ld-primary" onClick={() => go({ name: "shop" })}>
              Browse the pantry
            </button>
          </div>
        )}
      </div>
    );
  } else if (route.name === "checkout") {
    page = (
      <div className="ld-checkout">
        <div className="ld-checkout-forms">
          <h2>Checkout</h2>
          <section>
            <h3>Contact</h3>
            <p>{customer.email}</p>
          </section>
          <section>
            <h3>Ship to</h3>
            <p>
              {customer.name}
              <br />
              {customer.street}
              <br />
              {customer.city}
            </p>
            <p className="ld-muted">Standard shipping, arrives in two business days.</p>
          </section>
          <section>
            <h3>Payment</h3>
            {charging ? (
              <fieldset className="ld-cards">
                <legend className="sr-only">Card</legend>
                {CARDS.map((item) => (
                  <label key={item.id} data-checked={card === item.id || undefined}>
                    <input type="radio" name="ld-card" value={item.id} checked={card === item.id} onChange={() => setCard(item.id)} />
                    <span className={item.test ? "ld-visa ld-test-card" : "ld-visa"}>{item.brand}</span>
                    <span>
                      {item.label}
                      {item.test ? <small>Support reproductions only. Never settled. The processor answers after 2.6 seconds.</small> : null}
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="ld-card-on-file">
                <span className="ld-visa">VISA</span> ending 4242, expires 08/28
              </p>
            )}
            {failure ? (
              <div className="ld-alert" role="alert">
                <strong>We couldn’t take payment.</strong>
                <p>
                  Your card hasn’t been charged. Try again, or contact us and quote reference{" "}
                  <code>{failure.checkoutId}</code>.
                </p>
                <button
                  type="button"
                  className="ld-link"
                  onClick={() => {
                    void navigator.clipboard?.writeText(failure.checkoutId).catch(() => undefined);
                    setCopied(true);
                  }}
                >
                  <Copy size={13} aria-hidden="true" /> {copied ? "Reference copied" : "Copy reference"}
                </button>
              </div>
            ) : null}
            <button type="button" className="ld-primary ld-wide ld-pay" onClick={pay} disabled={placing || !cart.length} aria-busy={placing}>
              {placing ? (
                <>
                  <span className="ld-spinner" aria-hidden="true" /> Placing your order…
                </>
              ) : (
                `Pay ${shownTotal === null ? "" : dollars(shownTotal)}`
              )}
            </button>
          </section>
        </div>
        <aside className="ld-summary">
          <ul className="ld-mini-lines">
            {cart.map((line) => (
              <li key={line.sku}>
                <ProductArt sku={line.sku} className="ld-thumb" />
                <span>
                  {itemBySku[line.sku].name}
                  <small>Qty {line.quantity}</small>
                </span>
                <span>{dollars(itemBySku[line.sku].priceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <Summary summary={summary} promo={promo} total={shownTotal} />
          <button type="button" className="ld-link" onClick={() => go({ name: "cart" })}>
            Edit cart
          </button>
        </aside>
      </div>
    );
  } else if (route.name === "order") {
    const result = route.result;
    page = (
      <div className="ld-confirm">
        {route.viewing ? (
          <>
            <p className="ld-eyebrow">Order {result.orderId}</p>
            <h2>Placed today at {clock(result.t).slice(0, 5)}</h2>
            <p className="ld-muted">
              Shipping to {customer.street}. It arrives Tuesday.
            </p>
          </>
        ) : (
          <>
            <span className="ld-confirm-mark" aria-hidden="true">
              <Check size={22} />
            </span>
            <h2>Thank you, {customer.name.split(" ")[0]}. Your order is confirmed.</h2>
            <p className="ld-muted">
              Order {result.orderId}. We’ve emailed a receipt to {customer.email}. It arrives Tuesday.
            </p>
          </>
        )}
        <ul className="ld-mini-lines">
          {result.lines.map((line) => (
            <li key={line.sku}>
              <ProductArt sku={line.sku} className="ld-thumb" />
              <span>
                {itemBySku[line.sku].name}
                <small>Qty {line.quantity}</small>
              </span>
              <span>{dollars(itemBySku[line.sku].priceCents * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="ld-charged">
          Charged to {(CARDS.find((item) => item.id === result.card) ?? CARDS[0]).label.split(",")[0]}: <strong>{dollars(result.amount ?? 0)}</strong>
        </p>
        {charging ? <OrderCharges runtime={runtime} result={result} /> : null}
        <button type="button" className="ld-primary" onClick={() => go(route.viewing ? { name: "orders" } : { name: "shop" })}>
          {route.viewing ? "Back to orders" : "Keep shopping"}
        </button>
      </div>
    );
  } else if (route.name === "payments") {
    page = <CardActivity runtime={runtime} />;
  } else {
    const orders = [...runtime.mine.filter((order) => order.ok), ...(runtime.ruthOrder?.ok ? [runtime.ruthOrder] : [])];
    page = (
      <div className="ld-orders">
        <h2>Orders</h2>
        {orders.length ? (
          <ul>
            {orders.map((order) => {
              const problem = charging ? runtime.extraFor(order.checkoutId) : undefined;
              const open = problem?.extra.some((charge) => charge.status === "succeeded");
              return (
                <li key={order.checkoutId}>
                  <button type="button" className="ld-order-row" onClick={() => go({ name: "order", result: order, viewing: true })}>
                    <strong>{order.orderId}</strong>
                    <span>
                      {order.lines.map((line) => `${itemBySku[line.sku].name} × ${line.quantity}`).join(", ")}
                      <small>Today {clock(order.t).slice(0, 5)}</small>
                    </span>
                    <span className="ld-order-amount">
                      {dollars(order.amount ?? 0)}
                      {problem ? <em data-open={open || undefined}>{open ? "Charged twice" : "Extra charge refunded"}</em> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ld-muted">No orders on this account yet.</p>
        )}
      </div>
    );
  }

  return (
    <BrowserFrame
      domain="larder.shop"
      path={pathOf(route)}
      onReload={() => {
        setFailure(null);
        setPlacing(false);
      }}
    >
      <div className="ld-app">
        <p className="ld-support">
          <span>Support view · signed in as {customer.name}</span>
          {charging ? (
            <button type="button" aria-current={route.name === "payments" ? "page" : undefined} onClick={() => go({ name: "payments" })}>
              Card activity
            </button>
          ) : null}
        </p>
        {header}
        <div className="ld-page">{page}</div>
        <footer className="ld-footer">
          <span>Larder, Chicago</span>
          <span>Pantry goods from small producers</span>
        </footer>
      </div>
    </BrowserFrame>
  );
}

function ChargeStatus({ charge, runtime }: { charge: ChargeRecord; runtime: LarderRuntime }) {
  if (charge.t > runtime.now) return <span className="ld-pill">Processing</span>;
  return <span className="ld-pill" data-tone={charge.status === "refunded" ? "refunded" : undefined}>{charge.status === "refunded" ? "Refunded" : "Succeeded"}</span>;
}

function OrderCharges({ runtime, result }: { runtime: LarderRuntime; result: CheckoutResult }) {
  const charges = runtime.chargesFor(result.checkoutId);
  const [copied, setCopied] = useState(false);
  return (
    <section className="ld-charges" aria-label="Processor charges for this order">
      <header>
        <h3>Processor charges</h3>
        <button
          type="button"
          className="ld-link"
          onClick={() => {
            void navigator.clipboard?.writeText(result.checkoutId).catch(() => undefined);
            setCopied(true);
          }}
        >
          <Copy size={12} aria-hidden="true" /> {copied ? "Copied" : result.checkoutId}
        </button>
      </header>
      <ul>
        {charges.map((charge) => (
          <li key={charge.id}>
            <code>{charge.id}</code>
            <span>
              {dollars(charge.amount)}
              <small>
                {clock(charge.t)} · {charge.orderId ? `paid for ${charge.orderId}` : "no order"}
              </small>
            </span>
            <ChargeStatus charge={charge} runtime={runtime} />
          </li>
        ))}
      </ul>
      {charges.filter((charge) => charge.status === "succeeded").length > 1 ? (
        <p className="ld-charges-note">The processor holds {charges.length} successful charges for this one order.</p>
      ) : null}
    </section>
  );
}

function CardActivity({ runtime }: { runtime: LarderRuntime }) {
  const charges = [...runtime.customerCharges()].sort((a, b) => b.t - a.t);
  return (
    <div className="ld-orders ld-activity">
      <p className="ld-eyebrow">Support</p>
      <h2>Card activity</h2>
      <p className="ld-muted">Every charge the processor holds for this customer today, newest first, with the order it paid for.</p>
      {charges.length ? (
        <table className="ld-activity-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Charge</th>
              <th scope="col">Card</th>
              <th scope="col">Order</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((charge) => (
              <tr key={charge.id} data-problem={runtime.extraFor(charge.checkoutId)?.extra.includes(charge) || undefined}>
                <td>{clock(charge.t)}</td>
                <td>
                  <code>{charge.id}</code>
                  <small>{charge.checkoutId}</small>
                </td>
                <td>{charge.card === TEST_CARD ? "Test 0341" : `Visa ${charge.card.slice(-4)}`}</td>
                <td>{charge.orderId ?? <span className="ld-muted">None</span>}</td>
                <td className="ld-num">{dollars(charge.amount)}</td>
                <td>
                  <ChargeStatus charge={charge} runtime={runtime} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="ld-muted">No charges today.</p>
      )}
    </div>
  );
}

export function PaymentsConfig({ runtime }: { runtime: LarderRuntime }) {
  const open = runtime.outstanding();
  const refundable = open.count - open.processing;
  const checkouts = (rows: typeof open.duplicates) => new Set(rows.map((row) => row.problem.checkoutId)).size;
  const sum = (rows: typeof open.duplicates) => dollars(rows.reduce((total, row) => total + row.charge.amount, 0));
  return (
    <section className="pl-config" aria-labelledby="payments-title">
      <h3 id="payments-title">Card processor</h3>
      <p>
        <strong>Degraded since 10:30.</strong> The processor’s status page reads: “Elevated latency on charge requests in us-east. Charges complete, more slowly than usual.”
      </p>
      <table className="pl-config-table">
        <thead>
          <tr>
            <th scope="col">Extra charges not yet refunded</th>
            <th scope="col">Checkouts</th>
            <th scope="col">Charges</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Charged twice for one order</td>
            <td className="pl-num">{checkouts(open.duplicates)}</td>
            <td className="pl-num">{open.duplicates.length}</td>
            <td>{sum(open.duplicates)}</td>
          </tr>
          <tr>
            <td>Charged with no order</td>
            <td className="pl-num">{checkouts(open.orphans)}</td>
            <td className="pl-num">{open.orphans.length}</td>
            <td>{sum(open.orphans)}</td>
          </tr>
          <tr>
            <td>
              Refunded by you
              <small>Customers see a refund on their statement in 5 to 10 business days.</small>
            </td>
            <td />
            <td className="pl-num">{runtime.refunds.count}</td>
            <td>{dollars(runtime.refunds.cents)}</td>
          </tr>
        </tbody>
      </table>
      <div className="pl-config-actions">
        <button type="button" className="pl-primary" disabled={!refundable} onClick={() => runtime.refundExtras()}>
          {refundable ? `Refund ${refundable} extra ${refundable === 1 ? "charge" : "charges"}` : "Nothing to refund"}
        </button>
        {open.processing ? (
          <p>
            {open.processing} more {open.processing === 1 ? "charge is" : "charges are"} still processing. The processor can refund a charge once it has completed.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Summary({ summary, promo, total }: { summary: ReturnType<typeof expectedCents>; promo: string; total: number | null }) {
  return (
    <dl className="ld-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{dollars(summary.subtotal)}</dd>
      </div>
      {promo ? (
        <div>
          <dt>{promo}</dt>
          <dd>−{dollars(summary.discount)}</dd>
        </div>
      ) : null}
      <div>
        <dt>Shipping</dt>
        <dd>{summary.shipping ? dollars(summary.shipping) : "Free"}</dd>
      </div>
      <div className="ld-total">
        <dt>Total</dt>
        <dd>{total === null ? "Unavailable" : dollars(total)}</dd>
      </div>
    </dl>
  );
}
