/**
 * Chapter 3 discrete-event ledger.
 * One checkout, one client timeout, one retry. React renders the snapshot.
 * A repeated operation id returns the stored charge. A new id starts another provider call.
 * The notification is chosen when the charge is created.
 */

export const IDEMPOTENCY_FIRST_MS = 200;
export const IDEMPOTENCY_INTERVAL_MS = 1500;
export const IDEMPOTENCY_RETRY_GAP_MS = 200;
export const IDEMPOTENCY_LOOKUP_MS = 80;
export const IDEMPOTENCY_WINDOW = 8;
export const IDEMPOTENCY_LIMIT_MS = 50_000;
export const IDEMPOTENCY_MAX_CHECKOUTS = 36;
export const FAST_PROVIDER_MS = 400;
export const SLOW_PROVIDER_MS = 1600;
export const CLIENT_TIMEOUT_MS = 1000;

export type IdempotencyMode = "guided" | "practice" | "challenge";

export type IdempotencyControls = {
  providerMs: number;
  timeoutMs: number;
  reuseOperationId: boolean;
  outbox: boolean;
};

export type IdempotencyNote =
  | "waiting"
  | "submitted"
  | "timed_out"
  | "retry_new"
  | "retry_same"
  | "settled_seen"
  | "settled_duplicate"
  | "settled_stored"
  | "settled_lost"
  | "settled_outbox";

export type LedgerRow = {
  id: number;
  operationIds: string[];
  charges: number;
  client: "waiting" | "saw success" | "timed out" | "matched on retry";
  notification: "pending" | "sent" | "outbox" | "lost";
  open: boolean;
};

export type SimEvent = {
  seq: number;
  at: number;
  kind: "submit" | "timeout" | "settle" | "retry";
  checkoutId: number;
  attempt: number;
  operationId: string;
};

export type IdempotencySnapshot = {
  seed: number;
  mode: IdempotencyMode;
  clock: number;
  frozen: boolean;
  controls: IdempotencyControls;
  lockTiming: boolean;
  checkoutsSent: number;
  closedCount: number;
  uniqueCharges: number;
  duplicateCharges: number;
  unresolved: number;
  lostNotifications: number;
  cleanStreak: number;
  challengePassed: boolean;
  challengeFailed: boolean;
  timeoutCount: number;
  cleanFits: number;
  reusedClosures: number;
  dupsFromReused: number;
  outboxCharges: number;
  lostAtOutbox: number | null;
  providerBusy: boolean;
  note: IdempotencyNote;
  noteCheckoutId: number | null;
  tracedId: number | null;
  ledger: LedgerRow[];
  pending: SimEvent[];
  events: SimEvent[];
};

type Attempt = {
  attempt: number;
  operationId: string;
  submittedAt: number;
  deadline: number;
  timedOut: boolean;
  clientSaw: boolean;
  received: boolean;
  reusedIdentity: boolean;
};

type Checkout = {
  id: number;
  attempts: Attempt[];
  retryQueued: boolean;
  closed: boolean;
};

type Operation = {
  id: string;
  chargeId: string | null;
  settleQueued: boolean;
};

type Charge = {
  id: string;
  operationId: string;
  checkoutId: number;
  notification: "client" | "outbox" | "lost";
};

type Ev = SimEvent;

export type IdempotencyEngine = {
  seed: number;
  mode: IdempotencyMode;
  lockTiming: boolean;
  frozen: boolean;
  clock: number;
  controls: IdempotencyControls;
  checkouts: Checkout[];
  operations: Map<string, Operation>;
  charges: Charge[];
  queue: Ev[];
  events: SimEvent[];
  seq: number;
  checkoutsSent: number;
  closedCount: number;
  cleanStreak: number;
  challengePassed: boolean;
  challengeFailed: boolean;
  timeoutCount: number;
  cleanFits: number;
  reusedClosures: number;
  dupsFromReused: number;
  lostAtOutbox: number | null;
  note: IdempotencyNote;
  noteCheckoutId: number | null;
  tracedId: number | null;
  providerBusy: boolean;
  cached: IdempotencySnapshot;
};

function controlsFor(mode: IdempotencyMode): IdempotencyControls {
  if (mode === "guided") {
    return {
      providerMs: FAST_PROVIDER_MS,
      timeoutMs: CLIENT_TIMEOUT_MS,
      reuseOperationId: false,
      outbox: false,
    };
  }
  return {
    providerMs: SLOW_PROVIDER_MS,
    timeoutMs: CLIENT_TIMEOUT_MS,
    reuseOperationId: false,
    outbox: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function enqueue(engine: IdempotencyEngine, ev: Ev) {
  let lo = 0;
  let hi = engine.queue.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const other = engine.queue[mid]!;
    if (other.at < ev.at || (other.at === ev.at && other.seq < ev.seq)) lo = mid + 1;
    else hi = mid;
  }
  engine.queue.splice(lo, 0, ev);
}

function nextEvent(engine: IdempotencyEngine, partial: Omit<Ev, "seq">): Ev {
  engine.seq += 1;
  return { ...partial, seq: engine.seq };
}

function chargesFor(engine: IdempotencyEngine, checkoutId: number) {
  return engine.charges.filter((charge) => charge.checkoutId === checkoutId);
}

function lostCount(engine: IdempotencyEngine) {
  return engine.charges.filter((charge) => charge.notification === "lost").length;
}

function isUnresolved(checkout: Checkout) {
  const first = checkout.attempts[0];
  if (!first?.timedOut) return false;
  return !checkout.attempts.some(
    (attempt) => attempt.clientSaw && attempt.operationId === first.operationId,
  );
}

function clientView(checkout: Checkout): LedgerRow["client"] {
  const first = checkout.attempts[0];
  const retry = checkout.attempts[1];
  if (first?.clientSaw) return "saw success";
  if (retry?.clientSaw && retry.reusedIdentity) return "matched on retry";
  if (first?.timedOut) return "timed out";
  return "waiting";
}

function notificationView(rows: Charge[]): LedgerRow["notification"] {
  if (rows.length === 0) return "pending";
  if (rows.some((charge) => charge.notification === "lost")) return "lost";
  if (rows.some((charge) => charge.notification === "outbox")) return "outbox";
  return "sent";
}

function tally(engine: IdempotencyEngine) {
  let duplicates = 0;
  let unresolved = 0;
  for (const checkout of engine.checkouts) {
    const count = chargesFor(engine, checkout.id).length;
    if (count > 1) duplicates += count - 1;
    if (isUnresolved(checkout)) unresolved += 1;
  }
  let providerBusy = false;
  for (const checkout of engine.checkouts) {
    if (checkout.attempts.some((attempt) => !attempt.received)) providerBusy = true;
  }
  engine.providerBusy = providerBusy;
  return {
    uniqueCharges: engine.charges.length,
    duplicateCharges: duplicates,
    unresolved,
    lostNotifications: lostCount(engine),
    outboxCharges: engine.charges.filter((charge) => charge.notification === "outbox").length,
  };
}

function publish(engine: IdempotencyEngine): IdempotencySnapshot {
  const totals = tally(engine);
  const ledger: LedgerRow[] = engine.checkouts.map((checkout) => {
    const rows = chargesFor(engine, checkout.id);
    return {
      id: checkout.id,
      operationIds: checkout.attempts.map((attempt) => attempt.operationId),
      charges: rows.length,
      client: clientView(checkout),
      notification: notificationView(rows),
      open: !checkout.closed,
    };
  });
  engine.cached = {
    seed: engine.seed,
    mode: engine.mode,
    clock: engine.clock,
    frozen: engine.frozen,
    controls: { ...engine.controls },
    lockTiming: engine.lockTiming,
    checkoutsSent: engine.checkoutsSent,
    closedCount: engine.closedCount,
    ...totals,
    cleanStreak: engine.cleanStreak,
    challengePassed: engine.challengePassed,
    challengeFailed: engine.challengeFailed,
    timeoutCount: engine.timeoutCount,
    cleanFits: engine.cleanFits,
    reusedClosures: engine.reusedClosures,
    dupsFromReused: engine.dupsFromReused,
    lostAtOutbox: engine.lostAtOutbox,
    providerBusy: engine.providerBusy,
    note: engine.note,
    noteCheckoutId: engine.noteCheckoutId,
    tracedId: engine.tracedId,
    ledger,
    pending: engine.queue.map((event) => ({ ...event })),
    events: engine.events.map((event) => ({ ...event })),
  };
  return engine.cached;
}

function readyToClose(engine: IdempotencyEngine, checkout: Checkout) {
  const first = checkout.attempts[0];
  if (!first) return false;
  if (first.clientSaw) return true;
  if (!first.timedOut) return false;
  const retry = checkout.attempts[1];
  if (!retry) return false;
  if (retry.clientSaw) return true;
  if (!retry.timedOut) return false;
  const ids = new Set(checkout.attempts.map((attempt) => attempt.operationId));
  for (const id of ids) {
    if (!engine.operations.get(id)?.chargeId) return false;
  }
  return true;
}

function closeIfReady(engine: IdempotencyEngine, checkout: Checkout) {
  if (checkout.closed || !readyToClose(engine, checkout)) return;
  checkout.closed = true;
  const count = chargesFor(engine, checkout.id).length;
  const dup = Math.max(0, count - 1);
  const unresolved = isUnresolved(checkout);
  const lost = chargesFor(engine, checkout.id).some((charge) => charge.notification === "lost");
  const clean = dup === 0 && !unresolved && !lost;
  engine.cleanStreak = clean ? engine.cleanStreak + 1 : 0;
  engine.closedCount += 1;
  const retry = checkout.attempts[1];
  if (retry?.reusedIdentity) {
    engine.reusedClosures += 1;
    if (dup > 0) engine.dupsFromReused += 1;
  }
  if (checkout.attempts[0]?.clientSaw && count === 1 && !lost) engine.cleanFits += 1;
  if (
    engine.mode === "challenge" &&
    !engine.challengePassed &&
    !engine.challengeFailed &&
    engine.cleanStreak >= IDEMPOTENCY_WINDOW &&
    engine.clock <= IDEMPOTENCY_LIMIT_MS
  ) {
    engine.challengePassed = true;
  }
}

function deliver(engine: IdempotencyEngine, checkout: Checkout, operation: Operation, created: boolean) {
  for (const attempt of checkout.attempts) {
    if (attempt.operationId !== operation.id) continue;
    if (!attempt.timedOut && engine.clock <= attempt.deadline) attempt.clientSaw = true;
    attempt.received = true;
  }
  if (!created) {
    engine.note = "settled_stored";
    engine.noteCheckoutId = checkout.id;
    return;
  }
  const origin = checkout.attempts.find((attempt) => attempt.operationId === operation.id);
  const firstSaw = Boolean(origin && origin.clientSaw && !origin.timedOut);
  const notification = firstSaw ? "client" : engine.controls.outbox ? "outbox" : "lost";
  operation.chargeId = `ch-${operation.id}`;
  engine.charges.push({
    id: operation.chargeId,
    operationId: operation.id,
    checkoutId: checkout.id,
    notification,
  });
  const count = chargesFor(engine, checkout.id).length;
  const retry = checkout.attempts[1];
  if (count > 1) engine.note = "settled_duplicate";
  else if (notification === "outbox") engine.note = "settled_outbox";
  else if (notification === "client") engine.note = "settled_seen";
  else if (retry?.clientSaw && retry.reusedIdentity) engine.note = "settled_stored";
  else engine.note = "settled_lost";
  engine.noteCheckoutId = checkout.id;
}

function apply(engine: IdempotencyEngine, ev: Ev) {
  if (ev.kind === "retry") {
    const checkout = engine.checkouts.find((item) => item.id === ev.checkoutId);
    if (!checkout || checkout.closed || checkout.attempts[0]?.clientSaw) {
      engine.events.push({ ...ev });
      return;
    }
    apply(engine, { ...ev, kind: "submit", attempt: 2 });
    return;
  }

  if (ev.kind === "submit") {
    let checkout = engine.checkouts.find((item) => item.id === ev.checkoutId);
    if (!checkout) {
      if (ev.attempt !== 1 || ev.checkoutId > IDEMPOTENCY_MAX_CHECKOUTS) {
        engine.events.push({ ...ev });
        return;
      }
      checkout = { id: ev.checkoutId, attempts: [], retryQueued: false, closed: false };
      engine.checkouts.push(checkout);
      engine.checkoutsSent += 1;
    }
    if (checkout.closed || checkout.attempts.some((attempt) => attempt.attempt === ev.attempt)) {
      engine.events.push({ ...ev });
      return;
    }
    const first = checkout.attempts[0];
    const reuse = ev.attempt > 1 && engine.controls.reuseOperationId && first;
    const operationId = reuse ? first.operationId : `s${engine.seed}-c${ev.checkoutId}-a${ev.attempt}`;
    const attempt: Attempt = {
      attempt: ev.attempt,
      operationId,
      submittedAt: engine.clock,
      deadline: engine.clock + engine.controls.timeoutMs,
      timedOut: false,
      clientSaw: false,
      received: false,
      reusedIdentity: Boolean(reuse),
    };
    checkout.attempts.push(attempt);
    let operation = engine.operations.get(operationId);
    if (!operation) {
      operation = { id: operationId, chargeId: null, settleQueued: false };
      engine.operations.set(operationId, operation);
    }
    if (!operation.settleQueued) {
      operation.settleQueued = true;
      enqueue(
        engine,
        nextEvent(engine, {
          at: engine.clock + engine.controls.providerMs,
          kind: "settle",
          checkoutId: checkout.id,
          attempt: ev.attempt,
          operationId,
        }),
      );
    } else if (operation.chargeId) {
      enqueue(
        engine,
        nextEvent(engine, {
          at: engine.clock + IDEMPOTENCY_LOOKUP_MS,
          kind: "settle",
          checkoutId: checkout.id,
          attempt: ev.attempt,
          operationId,
        }),
      );
    }
    enqueue(
      engine,
      nextEvent(engine, {
        at: attempt.deadline,
        kind: "timeout",
        checkoutId: checkout.id,
        attempt: ev.attempt,
        operationId,
      }),
    );
    if (ev.attempt === 1 && ev.checkoutId < IDEMPOTENCY_MAX_CHECKOUTS) {
      enqueue(
        engine,
        nextEvent(engine, {
          at: engine.clock + IDEMPOTENCY_INTERVAL_MS,
          kind: "submit",
          checkoutId: ev.checkoutId + 1,
          attempt: 1,
          operationId: "",
        }),
      );
    }
    engine.note = ev.attempt === 1 ? "submitted" : reuse ? "retry_same" : "retry_new";
    engine.noteCheckoutId = checkout.id;
    engine.events.push({ ...ev, operationId });
    return;
  }

  if (ev.kind === "timeout") {
    const checkout = engine.checkouts.find((item) => item.id === ev.checkoutId);
    const attempt = checkout?.attempts.find((item) => item.attempt === ev.attempt);
    engine.events.push({ ...ev });
    if (!checkout || !attempt || checkout.closed || attempt.clientSaw || attempt.timedOut) return;
    attempt.timedOut = true;
    engine.timeoutCount += 1;
    engine.note = "timed_out";
    engine.noteCheckoutId = checkout.id;
    if (attempt.attempt === 1 && !checkout.retryQueued) {
      checkout.retryQueued = true;
      enqueue(
        engine,
        nextEvent(engine, {
          at: engine.clock + IDEMPOTENCY_RETRY_GAP_MS,
          kind: "retry",
          checkoutId: checkout.id,
          attempt: 2,
          operationId: "",
        }),
      );
    }
    closeIfReady(engine, checkout);
    return;
  }

  const checkout = engine.checkouts.find((item) => item.id === ev.checkoutId);
  const operation = engine.operations.get(ev.operationId);
  engine.events.push({ ...ev });
  if (!checkout || !operation) return;
  const created = !operation.chargeId;
  deliver(engine, checkout, operation, created);
  closeIfReady(engine, checkout);
}

function evaluate(engine: IdempotencyEngine) {
  if (engine.mode !== "challenge") return;
  if (!engine.challengePassed && !engine.challengeFailed && engine.clock > IDEMPOTENCY_LIMIT_MS) {
    engine.challengeFailed = true;
  }
}

export function createIdempotencyEngine(options: {
  seed: number;
  mode: IdempotencyMode;
}): IdempotencyEngine {
  const engine: IdempotencyEngine = {
    seed: options.seed,
    mode: options.mode,
    lockTiming: options.mode === "challenge",
    frozen: false,
    clock: 0,
    controls: controlsFor(options.mode),
    checkouts: [],
    operations: new Map(),
    charges: [],
    queue: [],
    events: [],
    seq: 0,
    checkoutsSent: 0,
    closedCount: 0,
    cleanStreak: 0,
    challengePassed: false,
    challengeFailed: false,
    timeoutCount: 0,
    cleanFits: 0,
    reusedClosures: 0,
    dupsFromReused: 0,
    lostAtOutbox: null,
    note: "waiting",
    noteCheckoutId: null,
    tracedId: null,
    providerBusy: false,
    cached: undefined as unknown as IdempotencySnapshot,
  };
  enqueue(
    engine,
    nextEvent(engine, {
      at: IDEMPOTENCY_FIRST_MS,
      kind: "submit",
      checkoutId: 1,
      attempt: 1,
      operationId: "",
    }),
  );
  publish(engine);
  return engine;
}

export function idempotencySnapshot(engine: IdempotencyEngine) {
  return engine.cached;
}

export function setIdempotencyFrozen(engine: IdempotencyEngine, frozen: boolean) {
  engine.frozen = frozen;
  return publish(engine);
}

export function setIdempotencyControls(
  engine: IdempotencyEngine,
  patch: Partial<IdempotencyControls>,
) {
  const prev = engine.controls;
  const next: IdempotencyControls = { ...prev, ...patch };
  if (engine.lockTiming) {
    next.providerMs = prev.providerMs;
    next.timeoutMs = prev.timeoutMs;
  }
  next.providerMs = clamp(next.providerMs, 200, 3000);
  next.timeoutMs = clamp(next.timeoutMs, 200, 2000);
  if (!prev.outbox && next.outbox) engine.lostAtOutbox = lostCount(engine);
  if (prev.outbox && !next.outbox) engine.lostAtOutbox = null;
  engine.controls = next;
  return publish(engine);
}

export function traceIdempotency(engine: IdempotencyEngine, checkoutId: number) {
  engine.tracedId = checkoutId;
  return publish(engine);
}

export function tickIdempotency(engine: IdempotencyEngine, dtMs: number) {
  if (engine.frozen) return engine.cached;
  const target = engine.clock + Math.max(0, dtMs);
  let guard = 0;
  while (engine.queue[0] && engine.queue[0].at <= target) {
    const ev = engine.queue.shift()!;
    engine.clock = ev.at;
    apply(engine, ev);
    guard += 1;
    if (guard > 10000) break;
  }
  engine.clock = target;
  evaluate(engine);
  return publish(engine);
}

/** One queued event. Pause keeps the rest of the queue in the same order. */
export function stepIdempotency(engine: IdempotencyEngine) {
  const ev = engine.queue.shift();
  if (!ev) return engine.cached;
  engine.clock = ev.at;
  apply(engine, ev);
  evaluate(engine);
  return publish(engine);
}
