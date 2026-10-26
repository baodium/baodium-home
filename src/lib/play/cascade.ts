/** Pure engine — Cascade: dependency fan-out, circuits, bulkheads. */

export type CascadeControls = {
  /** Trip open when error rate exceeds this (0–1). */
  tripAt: number;
  /** Isolate auth behind its own concurrency budget. */
  bulkheadAuth: boolean;
  /** Isolate payments / inventory. */
  bulkheadPay: boolean;
  /** Fail-fast timeout (ms) before waiting forever. */
  timeoutMs: number;
};

export type NodeId = "edge" | "auth" | "pay" | "db";

export type CascadeSnap = {
  t: number;
  health: Record<NodeId, number>;
  circuitOpen: Record<"auth" | "pay" | "db", boolean>;
  checkoutOk: number;
  cascadeRisk: number;
  message: string;
};

export type CascadeResult = {
  outcome: "won" | "lost";
  score: number;
  reason: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
};

export const CASCADE_TICK_MS = 220;
export const CASCADE_DURATION_S = 40;

export type CascadeState = {
  t: number;
  health: Record<NodeId, number>;
  errAuth: number;
  errPay: number;
  errDb: number;
  callsAuth: number;
  callsPay: number;
  callsDb: number;
  circuit: Record<"auth" | "pay" | "db", boolean>;
  checkoutOk: number;
  checkoutFail: number;
  lastMessage: string;
};

export function createCascade(): CascadeState {
  return {
    t: 0,
    health: { edge: 1, auth: 1, pay: 1, db: 1 },
    errAuth: 0,
    errPay: 0,
    errDb: 0,
    callsAuth: 0,
    callsPay: 0,
    callsDb: 0,
    circuit: { auth: false, pay: false, db: false },
    checkoutOk: 0,
    checkoutFail: 0,
    lastMessage: "All green. Auth starts wobbling around 8s.",
  };
}

export function tickCascade(
  state: CascadeState,
  controls: CascadeControls,
  dt = CASCADE_TICK_MS / 1000,
): { state: CascadeState; snap: CascadeSnap; done: CascadeResult | null } {
  const t = state.t + dt;
  const health = { ...state.health };
  const circuit = { ...state.circuit };

  // Injected faults
  if (t > 8 && t < 22) {
    health.auth = Math.max(0.15, health.auth - 0.035 * dt * 5);
  }
  if (t > 16 && t < 30) {
    health.db = Math.max(0.2, health.db - 0.028 * dt * 5);
  }

  const rps = 50 + Math.sin(t * 0.5) * 10;
  let errAuth = state.errAuth;
  let errPay = state.errPay;
  let errDb = state.errDb;
  let callsAuth = state.callsAuth;
  let callsPay = state.callsPay;
  let callsDb = state.callsDb;
  let checkoutOk = state.checkoutOk;
  let checkoutFail = state.checkoutFail;

  const authCalls = circuit.auth ? 0 : rps * dt;
  const authFailRate = 1 - health.auth;
  const slowAuth =
    controls.timeoutMs < 120 && health.auth < 0.7
      ? 0.15
      : Math.max(0, (180 - controls.timeoutMs) / 400);
  const authFails = authCalls * (authFailRate + slowAuth);
  errAuth += authFails;
  callsAuth += authCalls;

  // Without bulkhead, auth saturation bleeds into edge + pay
  if (!controls.bulkheadAuth && health.auth < 0.55) {
    health.edge = Math.max(0.25, health.edge - 0.04 * dt * 4);
    health.pay = Math.max(0.3, health.pay - 0.025 * dt * 4);
  }

  const payCalls = circuit.pay ? rps * dt * 0.2 : rps * dt;
  const payFailRate = 1 - health.pay;
  const payFails = payCalls * payFailRate;
  errPay += payFails;
  callsPay += payCalls;

  if (!controls.bulkheadPay && health.pay < 0.55) {
    health.db = Math.max(0.2, health.db - 0.03 * dt * 4);
    health.edge = Math.max(0.2, health.edge - 0.02 * dt * 4);
  }

  const dbCalls = circuit.db ? 0 : rps * dt * (circuit.pay ? 0.4 : 1);
  const dbFails = dbCalls * (1 - health.db);
  errDb += dbFails;
  callsDb += dbCalls;

  if (!circuit.db && health.db < 0.45) {
    health.pay = Math.max(0.2, health.pay - 0.035 * dt * 4);
    health.edge = Math.max(0.15, health.edge - 0.03 * dt * 4);
  }

  const rate = (err: number, calls: number) =>
    calls < 1 ? 0 : err / Math.max(1, calls);

  if (!circuit.auth && rate(errAuth, callsAuth) > controls.tripAt) {
    circuit.auth = true;
  }
  if (!circuit.pay && rate(errPay, callsPay) > controls.tripAt) {
    circuit.pay = true;
  }
  if (!circuit.db && rate(errDb, callsDb) > controls.tripAt) {
    circuit.db = true;
  }

  // Half-open recovery when circuit open — health slowly recovers
  if (circuit.auth) health.auth = Math.min(1, health.auth + 0.02 * dt * 3);
  if (circuit.pay) health.pay = Math.min(1, health.pay + 0.015 * dt * 3);
  if (circuit.db) health.db = Math.min(1, health.db + 0.015 * dt * 3);
  if (health.auth > 0.85 && circuit.auth) circuit.auth = false;
  if (health.pay > 0.85 && circuit.pay) circuit.pay = false;
  if (health.db > 0.85 && circuit.db) circuit.db = false;

  const degraded =
    (circuit.auth ? 0.55 : health.auth) *
    (circuit.pay ? 0.7 : health.pay) *
    (circuit.db ? 0.6 : health.db) *
    health.edge;
  const okNow = rps * dt * Math.max(0.05, Math.min(1, degraded));
  const failNow = rps * dt - okNow;
  checkoutOk += okNow;
  checkoutFail += failNow;

  const cascadeRisk = Math.min(
    1,
    (1 - health.edge) * 0.5 +
      (1 - Math.min(health.auth, health.pay, health.db)) * 0.5 +
      (controls.bulkheadAuth ? 0 : 0.15) +
      (controls.bulkheadPay ? 0 : 0.1),
  );

  let message = state.lastMessage;
  if (circuit.auth && !controls.bulkheadAuth)
    message = "Auth circuit open — without a bulkhead, threads still pile up.";
  else if (circuit.auth)
    message = "Auth circuit open. Bulkhead holds the edge.";
  else if (health.db < 0.45)
    message = "DB wobbling — trip it or watch pay fan the fire.";
  else if (t > 8 && health.auth < 0.7)
    message = "Auth errors climbing — trip threshold matters.";
  else if (t > 30) message = "Storm easing. Keep isolation on.";

  const next: CascadeState = {
    t,
    health,
    errAuth,
    errPay,
    errDb,
    callsAuth,
    callsPay,
    callsDb,
    circuit,
    checkoutOk,
    checkoutFail,
    lastMessage: message,
  };

  const snap: CascadeSnap = {
    t,
    health,
    circuitOpen: {
      auth: circuit.auth,
      pay: circuit.pay,
      db: circuit.db,
    },
    checkoutOk,
    cascadeRisk,
    message,
  };

  if (t >= CASCADE_DURATION_S) {
    const total = checkoutOk + checkoutFail;
    const okRate = total === 0 ? 0 : checkoutOk / total;
    const won = okRate >= 0.62 && health.edge > 0.45 && cascadeRisk < 0.75;
    const score = Math.round(
      okRate * 500 +
        health.edge * 200 +
        (controls.bulkheadAuth ? 80 : 0) +
        (controls.bulkheadPay ? 60 : 0) +
        (won ? 180 : 30),
    );
    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Checkout stayed up — circuits and bulkheads contained the blast."
          : health.edge < 0.45
            ? "Edge melted — failures fanned across shared pools."
            : "Too many checkout failures; the outage spread.",
        chapterHref: "/system-design/chapter-4",
        chapterLabel: "Ch.4 — Service communication and cascading failure",
        takeaway:
          "Isolate failure domains first — a circuit without a bulkhead still shares the blast radius.",
      },
    };
  }

  return { state: next, snap, done: null };
}
