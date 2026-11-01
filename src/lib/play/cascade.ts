/** Cascade. Chapter 4: child deadline, outbound permit, and cancellation on the fraud call. */

export type CascadeControls = {
  providerMs: number;
  remainingMs: number;
  reserveMs: number;
  permit: boolean;
  cancel: boolean;
};

export type NodeId = "edge" | "auth" | "pay" | "db";

export type CascadeSnap = {
  t: number;
  health: Record<NodeId, number>;
  circuitOpen: Record<"auth" | "pay" | "db", boolean>;
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

export type CascadeState = {
  t: number;
  checkoutOk: number;
  checkoutFail: number;
  peakRisk: number;
};

type Call = {
  caller: number;
  orphan: number;
  child: number;
  admitted: boolean;
};

function fraudCall(controls: CascadeControls): Call {
  const child = Math.min(1000, Math.max(0, controls.remainingMs - controls.reserveMs));
  const admitted = child >= 20 && controls.permit;
  if (!admitted) return { caller: 15, orphan: 0, child, admitted };
  const caller = Math.min(controls.providerMs, child, controls.remainingMs);
  const orphan = controls.cancel ? 0 : Math.max(0, controls.providerMs - caller);
  return { caller, orphan, child, admitted };
}

export function createCascade(): CascadeState {
  return { t: 0, checkoutOk: 0, checkoutFail: 0, peakRisk: 0 };
}

export function emptyCascadeSnap(message?: string): CascadeSnap {
  return {
    t: 0,
    health: { edge: 1, auth: 1, pay: 1, db: 1 },
    circuitOpen: { auth: false, pay: false, db: false },
    util: { auth: 0.2, pay: 0.2, db: 0.2 },
    checkoutOk: 0,
    checkoutFail: 0,
    cascadeRisk: 0,
    message: message ?? "Checkout calls fraud with a child deadline. The provider should stop when checkout is out of time.",
  };
}

export function tickCascade(
  state: CascadeState,
  controls: CascadeControls,
  dt = CASCADE_TICK_MS / 1000,
): { state: CascadeState; snap: CascadeSnap; done?: CascadeResult } {
  const t = state.t + dt;
  const call = fraudCall(controls);
  const quiet = call.orphan < 1 && call.caller <= controls.remainingMs + 0.1;
  const checkoutOk = state.checkoutOk + (quiet ? dt : 0);
  const checkoutFail = state.checkoutFail + (quiet ? 0 : dt);
  const risk = call.orphan > 0 ? 0.9 : call.admitted ? 0.12 : 0.2;
  const health = {
    edge: quiet ? 0.94 : 0.36,
    auth: call.admitted ? Math.min(1, call.child / 1000) : 0.35,
    pay: call.orphan > 0 ? 0.28 : call.admitted ? 0.9 : 0.45,
    db: controls.permit ? 0.92 : 0.3,
  };
  const message = !call.admitted
    ? "The permit is missing or the child deadline cannot start, so the provider is not called."
    : call.orphan > 0
      ? `Checkout returns at ${call.caller.toFixed(0)} ms. The provider keeps running for another ${call.orphan.toFixed(0)} ms because cancellation was not passed.`
      : `The child deadline is ${call.child.toFixed(0)} ms. Checkout returns at ${call.caller.toFixed(0)} ms and the provider is not still running.`;

  const next: CascadeState = {
    t,
    checkoutOk,
    checkoutFail,
    peakRisk: Math.max(state.peakRisk, risk),
  };
  const snap: CascadeSnap = {
    t,
    health,
    circuitOpen: { auth: false, pay: false, db: false },
    util: {
      auth: call.child / 1000,
      pay: Math.min(1, controls.providerMs / 1000),
      db: controls.permit ? 0.4 : 1,
    },
    checkoutOk,
    checkoutFail,
    cascadeRisk: risk,
    message,
  };

  if (t < CASCADE_DURATION_S) return { state: next, snap };

  const won = controls.cancel && controls.permit && call.orphan < 1 && call.admitted && call.caller <= controls.remainingMs + 0.1;
  const done: CascadeResult = {
    outcome: won ? "won" : "lost",
    score: Math.round((1 - next.peakRisk) * 100),
    reason: won
      ? "Cancellation stopped the provider when the child deadline was spent. Checkout did not leave that work running."
      : call.orphan > 0
        ? "The provider kept working after checkout returned. The listing passes request.cancellation with the deadline."
        : "The call never started. A missing permit defers the assessment, which is a different branch from stopping a call already in flight.",
    chapterHref: "/system-design/chapter-4",
    chapterLabel: "Ch.4 · Cascading failure",
    takeaway:
      "reserve_fraud_call caps the child deadline and takes an outbound permit. evaluate_risk passes cancellation so leftover provider work stops with the caller.",
    debrief: `Caller ${call.caller.toFixed(0)} ms. Still running ${call.orphan.toFixed(0)} ms. Child deadline ${call.child.toFixed(0)} ms.`,
    before: "A slow fraud provider can outlast the time checkout has left.",
    after: won ? "Leftover provider work is 0 ms." : "Provider work continued after the caller returned.",
    changed: controls.cancel
      ? "Cancellation was passed with the deadline."
      : "The deadline was computed, and the provider was allowed to finish anyway.",
    metrics: [
      { label: "Caller", value: `${call.caller.toFixed(0)} ms`, tone: "neutral" },
      { label: "Still running", value: `${call.orphan.toFixed(0)} ms`, tone: call.orphan < 1 ? "ok" : "bad" },
      { label: "Child deadline", value: `${call.child.toFixed(0)} ms`, tone: "neutral" },
    ],
  };
  return { state: next, snap, done };
}
