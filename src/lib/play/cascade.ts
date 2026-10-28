/** Pure engine — Cascade: dependency fan-out, circuits, bulkhead budgets, fail-fast. */

export type CascadeControls = {
  /** Trip open when recent error rate exceeds this (0–1). */
  tripAt: number;
  /** Isolate auth behind its own concurrency budget. */
  bulkheadAuth: boolean;
  /** Isolate payments / inventory. */
  bulkheadPay: boolean;
  /** Fail-fast timeout (ms) before holding a thread forever on a sick dependency. */
  timeoutMs: number;
};

export type NodeId = "edge" | "auth" | "pay" | "db";

export type CascadeSnap = {
  t: number;
  health: Record<NodeId, number>;
  circuitOpen: Record<"auth" | "pay" | "db", boolean>;
  /** Occupancy of each dependency's concurrency budget (0–1+). */
  util: Record<"auth" | "pay" | "db", number>;
  checkoutOk: number;
  checkoutFail: number;
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
  debrief: string;
  before: string;
  after: string;
  changed: string;
  metrics: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "neutral" }[];
};

export const CASCADE_TICK_MS = 220;
export const CASCADE_DURATION_S = 40;

const AUTH_BUDGET = 24;
const PAY_BUDGET = 28;
const DB_BUDGET = 32;
const SHARED_BUDGET = 40; // when bulkheads off, everyone shares this

export type CascadeState = {
  t: number;
  health: Record<NodeId, number>;
  /** Sliding window: recent errors / calls (ewma). */
  errRate: Record<"auth" | "pay" | "db", number>;
  inFlight: Record<"auth" | "pay" | "db", number>;
  circuit: Record<"auth" | "pay" | "db", boolean>;
  openSince: Record<"auth" | "pay" | "db", number | null>;
  checkoutOk: number;
  checkoutFail: number;
  peakRisk: number;
  trips: number;
  lastMessage: string;
};

export function createCascade(): CascadeState {
  return {
    t: 0,
    health: { edge: 1, auth: 1, pay: 1, db: 1 },
    errRate: { auth: 0, pay: 0, db: 0 },
    inFlight: { auth: 0, pay: 0, db: 0 },
    circuit: { auth: false, pay: false, db: false },
    openSince: { auth: null, pay: null, db: null },
    checkoutOk: 0,
    checkoutFail: 0,
    peakRisk: 0,
    trips: 0,
    lastMessage: "All green. Auth starts wobbling around 8s.",
  };
}

export function emptyCascadeSnap(message?: string): CascadeSnap {
  return {
    t: 0,
    health: { edge: 1, auth: 1, pay: 1, db: 1 },
    circuitOpen: { auth: false, pay: false, db: false },
    util: { auth: 0, pay: 0, db: 0 },
    checkoutOk: 0,
    checkoutFail: 0,
    cascadeRisk: 0,
    message: message ?? "Idle — start a run to watch dependency health.",
  };
}

function ewma(prev: number, sample: number, alpha = 0.25): number {
  return prev * (1 - alpha) + sample * alpha;
}

export function tickCascade(
  state: CascadeState,
  controls: CascadeControls,
  dt = CASCADE_TICK_MS / 1000,
): { state: CascadeState; snap: CascadeSnap; done: CascadeResult | null } {
  const t = state.t + dt;
  const health = { ...state.health };
  const circuit = { ...state.circuit };
  const openSince = { ...state.openSince };
  const inFlight = { ...state.inFlight };
  const errRate = { ...state.errRate };

  // Injected faults — dependency sickness (independent of player at first).
  if (t > 8 && t < 22) {
    health.auth = Math.max(0.12, health.auth - 0.038 * dt * 5);
  }
  if (t > 16 && t < 30) {
    health.db = Math.max(0.18, health.db - 0.03 * dt * 5);
  }

  const rps = 50 + Math.sin(t * 0.5) * 10;
  const timeoutSec = Math.max(0.04, controls.timeoutMs / 1000);

  // Hold time on a sick dependency without fail-fast ≈ 1 / health seconds (capped).
  // Fail-fast caps the hold, freeing slots sooner — less amplification.
  function holdSec(nodeHealth: number): number {
    const natural = 0.08 + (1 - nodeHealth) * 1.8;
    return Math.min(natural, timeoutSec);
  }

  function budget(node: "auth" | "pay" | "db"): number {
    if (node === "auth") return controls.bulkheadAuth ? AUTH_BUDGET : SHARED_BUDGET;
    if (node === "pay") return controls.bulkheadPay ? PAY_BUDGET : SHARED_BUDGET;
    return controls.bulkheadPay ? DB_BUDGET : SHARED_BUDGET;
  }

  // Shared pool: when bulkheads are off, in-flight across nodes contend for SHARED_BUDGET.
  function sharedUsed(): number {
    if (controls.bulkheadAuth && controls.bulkheadPay) {
      return 0; // fully isolated — each uses own budget
    }
    let used = 0;
    if (!controls.bulkheadAuth) used += inFlight.auth;
    if (!controls.bulkheadPay) used += inFlight.pay + inFlight.db;
    return used;
  }

  function room(node: "auth" | "pay" | "db"): number {
    const b = budget(node);
    if (
      (node === "auth" && controls.bulkheadAuth) ||
      (node !== "auth" && controls.bulkheadPay)
    ) {
      return Math.max(0, b - inFlight[node]);
    }
    return Math.max(0, SHARED_BUDGET - sharedUsed());
  }

  // Completions / timeouts free slots.
  for (const node of ["auth", "pay", "db"] as const) {
    if (circuit[node]) {
      inFlight[node] = Math.max(0, inFlight[node] - inFlight[node] * 0.5 * dt);
      continue;
    }
    const h = holdSec(health[node]);
    const completions = inFlight[node] * (1 - Math.exp(-dt / Math.max(0.05, h)));
    inFlight[node] = Math.max(0, inFlight[node] - completions);
  }

  // Attempt dependency calls for this tick's checkouts.
  const attempt = (node: "auth" | "pay" | "db", calls: number) => {
    if (circuit[node] || calls <= 0) {
      return { ok: 0, fail: circuit[node] ? calls : 0, rejected: 0 };
    }
    const free = room(node);
    const accepted = Math.min(calls, free);
    const rejected = Math.max(0, calls - accepted);
    inFlight[node] += accepted;

    const h = health[node];
    // Intrinsic fail rate from sickness; short timeout converts hangs → fails faster
    // but frees the slot (already modeled via holdSec). Longer timeout holds threads.
    const hangRisk = Math.max(0, 1 - h) * Math.min(1, timeoutSec / 0.5);
    const failFrac = Math.min(0.95, 1 - h + hangRisk * 0.15);
    const fail = accepted * failFrac + rejected;
    const ok = Math.max(0, accepted - accepted * failFrac);
    errRate[node] = ewma(errRate[node], calls > 0 ? fail / calls : 0);
    return { ok, fail, rejected };
  };

  const authCalls = circuit.auth ? 0 : rps * dt;
  const auth = attempt("auth", authCalls);

  // Without auth bulkhead, auth saturation bleeds into edge + pay via shared threads.
  if (!controls.bulkheadAuth && inFlight.auth / SHARED_BUDGET > 0.55) {
    health.edge = Math.max(0.15, health.edge - 0.06 * dt * 4);
    health.pay = Math.max(0.2, health.pay - 0.04 * dt * 4);
  } else if (controls.bulkheadAuth && circuit.auth) {
    // Isolated trip: edge recovers while auth is open.
    health.edge = Math.min(1, health.edge + 0.02 * dt * 3);
  }

  const payCalls = circuit.pay ? rps * dt * 0.15 : rps * dt;
  const pay = attempt("pay", payCalls);

  if (!controls.bulkheadPay && inFlight.pay / SHARED_BUDGET > 0.65) {
    health.db = Math.max(0.18, health.db - 0.035 * dt * 4);
    health.edge = Math.max(0.18, health.edge - 0.025 * dt * 4);
  }

  const dbCalls = circuit.db ? 0 : rps * dt * (circuit.pay ? 0.35 : 1);
  const db = attempt("db", dbCalls);

  if (!circuit.db && health.db < 0.45 && inFlight.db > DB_BUDGET * 0.5) {
    health.pay = Math.max(0.18, health.pay - 0.04 * dt * 4);
    health.edge = Math.max(0.12, health.edge - 0.035 * dt * 4);
  }

  // Circuit trips on recent error rate (not lifetime).
  let trips = state.trips;
  for (const node of ["auth", "pay", "db"] as const) {
    if (!circuit[node] && errRate[node] > controls.tripAt) {
      circuit[node] = true;
      openSince[node] = t;
      trips += 1;
      // Trip sheds in-flight for that dependency.
      inFlight[node] *= 0.2;
    }
  }

  // Half-open after cooldown: probe recovery.
  const COOLDOWN = 2.8;
  for (const node of ["auth", "pay", "db"] as const) {
    if (circuit[node] && openSince[node] !== null && t - openSince[node]! >= COOLDOWN) {
      health[node] = Math.min(1, health[node] + 0.04 * dt * 3);
      if (health[node] > 0.82) {
        circuit[node] = false;
        openSince[node] = null;
        errRate[node] *= 0.4;
      }
    } else if (circuit[node]) {
      health[node] = Math.min(1, health[node] + 0.015 * dt * 3);
    }
  }

  // Natural recovery when not being faulted.
  if (t < 8 || t > 22) health.auth = Math.min(1, health.auth + 0.01 * dt * 3);
  if (t < 16 || t > 30) health.db = Math.min(1, health.db + 0.01 * dt * 3);
  if (health.edge < 1) health.edge = Math.min(1, health.edge + 0.012 * dt * 3);
  if (health.pay < 1 && (controls.bulkheadPay || health.db > 0.6)) {
    health.pay = Math.min(1, health.pay + 0.01 * dt * 3);
  }

  const degraded =
    (circuit.auth ? 0.5 : Math.min(1, health.auth * (1 - Math.min(0.5, auth.rejected / Math.max(1, authCalls))))) *
    (circuit.pay ? 0.65 : health.pay) *
    (circuit.db ? 0.55 : health.db) *
    health.edge;
  const okNow = rps * dt * Math.max(0.04, Math.min(1, degraded));
  const failNow = rps * dt - okNow;
  const checkoutOk = state.checkoutOk + okNow;
  const checkoutFail = state.checkoutFail + failNow;

  const util = {
    auth: inFlight.auth / budget("auth"),
    pay: inFlight.pay / budget("pay"),
    db: inFlight.db / budget("db"),
  };

  // Risk from actual blast radius — not a flat penalty for missing bulkheads at t=0.
  const cascadeRisk = Math.min(
    1,
    (1 - health.edge) * 0.55 +
      (1 - Math.min(health.auth, health.pay, health.db)) * 0.35 +
      Math.max(0, util.auth - 0.85) * 0.25 +
      Math.max(0, util.pay - 0.85) * 0.2 +
      (!controls.bulkheadAuth && health.auth < 0.6 ? 0.2 : 0) +
      (!controls.bulkheadPay && health.pay < 0.55 ? 0.15 : 0),
  );
  const peakRisk = Math.max(state.peakRisk, cascadeRisk);

  let message = state.lastMessage;
  if (circuit.auth && !controls.bulkheadAuth)
    message = "Auth circuit open — shared threads still pile on pay/edge.";
  else if (circuit.auth)
    message = "Auth circuit open. Bulkhead holds the edge concurrency budget.";
  else if (health.db < 0.45)
    message = "DB wobbling — trip it or watch pay fan the fire.";
  else if (t > 8 && health.auth < 0.7)
    message = `Auth errors ~${(errRate.auth * 100).toFixed(0)}% — trip at ${(controls.tripAt * 100).toFixed(0)}%.`;
  else if (controls.timeoutMs < 100 && health.auth < 0.7)
    message = "Fail-fast timeout cutting hangs — slots free sooner.";
  else if (t > 30) message = "Storm easing. Keep isolation on.";

  const next: CascadeState = {
    t,
    health,
    errRate,
    inFlight,
    circuit,
    openSince,
    checkoutOk,
    checkoutFail,
    peakRisk,
    trips,
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
    util,
    checkoutOk,
    checkoutFail,
    cascadeRisk,
    message,
  };

  if (t >= CASCADE_DURATION_S) {
    const total = checkoutOk + checkoutFail;
    const okRate = total === 0 ? 0 : checkoutOk / total;
    const won = okRate >= 0.6 && health.edge > 0.42 && peakRisk < 0.82;
    const score = Math.round(
      okRate * 480 +
        health.edge * 180 +
        Math.max(0, 100 - peakRisk * 100) +
        (controls.bulkheadAuth ? 70 : 0) +
        (controls.bulkheadPay ? 50 : 0) +
        Math.max(0, 40 - controls.timeoutMs / 10) +
        (won ? 160 : 25),
    );
    const debrief = `Checkout ok ${(okRate * 100).toFixed(0)}% · edge health ${(health.edge * 100).toFixed(0)}% · peak cascade risk ${(peakRisk * 100).toFixed(0)}% · circuits tripped ${trips}×. Timeout ${controls.timeoutMs}ms${controls.bulkheadAuth ? ", auth bulkhead" : ""}${controls.bulkheadPay ? ", pay/db bulkhead" : ""}. Fail-fast frees slots; bulkheads stop shared-pool contagion.`;

    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Checkout stayed up — circuits and bulkheads contained the blast."
          : health.edge < 0.42
            ? "Edge melted — failures fanned across shared pools."
            : peakRisk >= 0.82
              ? "Cascade risk peaked too high — isolation landed too late."
              : "Too many checkout failures; the outage spread.",
        chapterHref: "/system-design/chapter-4",
        chapterLabel: "Ch.4 — Service communication and cascading failure",
        takeaway:
          "Isolate failure domains first — a circuit without a bulkhead still shares the blast radius.",
        debrief,
        before:
          "Auth/DB wobble with a shared worker pool — one slow dependency holds threads every checkout path needs.",
        after: `Checkout ok ${(okRate * 100).toFixed(0)}%, edge health ${(health.edge * 100).toFixed(0)}%, peak cascade risk ${(peakRisk * 100).toFixed(0)}%, circuits tripped ${trips}× (timeout ${controls.timeoutMs}ms${controls.bulkheadAuth ? ", auth bulkhead" : ""}${controls.bulkheadPay ? ", pay/db bulkhead" : ""}).`,
        changed:
          controls.bulkheadAuth && controls.bulkheadPay && won
            ? "Bulkheads capped auth/DB contagion while fail-fast freed slots — checkout kept its own budget."
            : !controls.bulkheadAuth && peakRisk >= 0.7
              ? "Circuits alone still shared the pool — auth failure starved checkout workers."
              : "Isolation landed partly — blast radius shrinks only when both circuit and bulkhead are in place.",
        metrics: [
          {
            label: "Checkout ok",
            value: `${(okRate * 100).toFixed(0)}%`,
            tone: okRate >= 0.6 ? "ok" : okRate >= 0.4 ? "warn" : "bad",
          },
          {
            label: "Edge health",
            value: `${(health.edge * 100).toFixed(0)}%`,
            tone: health.edge > 0.55 ? "ok" : health.edge > 0.42 ? "warn" : "bad",
          },
          {
            label: "Peak cascade",
            value: `${(peakRisk * 100).toFixed(0)}%`,
            tone: peakRisk < 0.55 ? "ok" : peakRisk < 0.82 ? "warn" : "bad",
          },
          {
            label: "Trips",
            value: `${trips}×`,
            tone: "neutral",
          },
        ],
      },
    };
  }

  return { state: next, snap, done: null };
}
