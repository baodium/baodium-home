import { ABR_V380, PROGRESS_V740 } from "../../src/lib/products/northlight-code";

export const PRICING_FIX = `export function orderTotalCents(lines, promoCode) {
  let subtotal = 0;
  for (const line of lines) subtotal += line.priceCents * line.quantity;
  const discount = promoCode === "PANTRY10" ? Math.round(subtotal * 0.1) : 0;
  const discounted = subtotal - discount;
  return discounted + (discounted >= 5000 ? 0 : 595);
}
`;

export const RESERVE_FIX = `export function reserveStock(inventory, lines) {
  const results = [];
  for (let i = 0; i < lines.length; i += 50) {
    const chunk = lines.slice(i, i + 50).map((line) => ({ sku: line.sku, quantity: line.quantity }));
    results.push(...inventory.reserveMany(chunk));
  }
  return results;
}
`;

export const CHARGE_FIX = `const TIMEOUT_MS = 2000;
const ATTEMPTS = 2;

export function chargeCheckout(processor, checkout) {
  const idempotencyKey = "checkout-" + checkout.id;
  let result;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    result = processor.charge({
      amountCents: checkout.amountCents,
      card: checkout.card,
      idempotencyKey,
      timeoutMs: TIMEOUT_MS,
    });
    if (result.status !== "timeout") return result;
  }
  return result;
}
`;

export const ABR_FIX = ABR_V380.replace("rendition.kbps <= throughputBps * SAFETY", "rendition.kbps * 1000 <= throughputBps * SAFETY");

export const PAGINATE_FIX = `export function feedPage(posts, cursor, limit) {
  const remaining = cursor
    ? posts.filter((post) => post.createdAt < cursor.createdAt || (post.createdAt === cursor.createdAt && post.id < cursor.id))
    : posts;
  const items = remaining.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: remaining.length > items.length ? { createdAt: last.createdAt, id: last.id } : null,
  };
}
`;

export const PROGRESS_FIX = PROGRESS_V740.replace(
  `  return db.replica(viewer.id).read("progress", viewer.id, titleId);`,
  `  const replica = db.replica(viewer.id);
  if (viewer.lastProgressLsn !== null && replica.replayedLsn() < viewer.lastProgressLsn) {
    return db.primary().read("progress", viewer.id, titleId);
  }
  return replica.read("progress", viewer.id, titleId);`,
);

export const PROGRESS_HALF_FIXES = {
  primary: PROGRESS_V740.replace(`db.replica(viewer.id).read`, `db.primary().read`),
  fallback: PROGRESS_V740.replace(
    `  return db.replica(viewer.id).read("progress", viewer.id, titleId);`,
    `  return db.replica(viewer.id).read("progress", viewer.id, titleId) ?? db.primary().read("progress", viewer.id, titleId);`,
  ),
};
