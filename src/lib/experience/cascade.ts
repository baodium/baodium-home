/**
 * Checkout cascade on the Chapter 1 clock.
 * `tick` advances this state with the engine rng when `engine.cascade` is set.
 * Metrics, traces, logs, and the timeline are projections of the same spans.
 */

import type { Engine } from "@/lib/experience/engine";
import type { Rng } from "@/lib/experience/rng";
import { utilization } from "@/lib/sim/bounds";

export const PROVIDER_SLOTS = 8;
export const WINDOW_SEC = 5;
const GATEWAY_SEC = 0.004;
const CHECKOUT_SEC = 0.012;

export type CascadeService = "gateway" | "checkout" | "payment" | "provider";
export type SpanStatus = "open" | "ok" | "timeout" | "cancelled" | "rejected";
export type JourneyOutcome = "open" | "ok" | "timeout" | "rejected";

export type CascadeControls = {
  arrivalRate: number;
  providerLatencyMs: number;
  maxRetries: number;
  attemptTimeoutMs: number;
  clientDeadlineMs: number;
  backoffMs: number;
  cancelInFlight: boolean;
  propagateDeadline: boolean;
  shedAtInflight: number | null;
};

export type CascadeLog = {
  t: number;
  traceId: string;
  spanId: string;
  service: CascadeService;
  kind: "start" | "end" | "retry" | "timeout" | "reject" | "cancel" | "queue";
  attempt: number;
  message: string;
};

export type CascadeSample = {
  t: number;
  successRate: number | null;
  attemptsPerCheckout: number;
  providerUtilization: number;
  gatewayP99Ms: number;
};

type Span = {
  id: string;
  traceId: string;
  parentId: string | null;
  service: CascadeService;
  attempt: number;
  start: number;
  end: number | null;
  status: SpanStatus;
  queueSec: number;
  workSec: number | null;
  timeoutSeq: number | null;
  doneSeq: number | null;
  abandoned: boolean;
};

type Journey = {
  id: string;
  traceId: string;
  arrivedAt: number;
  deadlineAt: number;
  outcome: JourneyOutcome;
  finishedAt: number | null;
  providerAttempts: number;
  clientClosed: boolean;
  paymentSpanId: string | null;
};

type Scheduled = {
  t: number;
  seq: number;
  type: "gateway-done" | "checkout-done" | "attempt-timeout" | "provider-done" | "client-deadline" | "retry";
  journeyId: string;
  spanId: string;
};

export type CascadeState = {
  controls: CascadeControls;
  arrivalAcc: number;
  nextId: number;
  seq: number;
  spans: Span[];
  journeys: Journey[];
  log: CascadeLog[];
  scheduled: Scheduled[];
  providerQueue: string[];
  providerBusy: string[];
  cancelled: Set<number>;
  sampleAt: number;
  samples: CascadeSample[];
  demonstratedAmplification: boolean;
};

export type CascadeSpanView = {
  id: string;
  traceId: string;
  parentId: string | null;
  service: CascadeService;
  attempt: number;
  start: number;
  end: number | null;
  status: SpanStatus;
  queueMs: number;
  workMs: number | null;
};

export type CascadeTrace = {
  traceId: string;
  outcome: JourneyOutcome;
  arrivedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
  providerAttempts: number;
  spans: CascadeSpanView[];
};

export type ServiceStat = {
  service: CascadeService;
  open: number;
  ended: number;
  p99Ms: number;
  errorRate: number | null;
};

export type CascadeView = {
  t: number;
  controls: CascadeControls;
  finished: number;
  successes: number;
  successRate: number | null;
  attemptsPerCheckout: number;
  providerBusy: number;
  providerQueue: number;
  providerSlots: number;
  providerUtilization: number;
  openJourneys: number;
  okPerSec: number;
  gatewayP99Ms: number;
  measuredProviderMs: number | null;
  openByService: Record<CascadeService, number>;
  services: ServiceStat[];
  traces: CascadeTrace[];
  logs: CascadeLog[];
  timeline: CascadeLog[];
  samples: CascadeSample[];
  demonstratedAmplification: boolean;
};

export function healthyControls(): CascadeControls {
  return {
    arrivalRate: 4,
    providerLatencyMs: 40,
    maxRetries: 0,
    attemptTimeoutMs: 400,
    clientDeadlineMs: 1600,
    backoffMs: 40,
    cancelInFlight: true,
    propagateDeadline: true,
    shedAtInflight: null,
  };
}

export function incidentControls(): CascadeControls {
  return {
    ...healthyControls(),
    providerLatencyMs: 700,
    maxRetries: 4,
    attemptTimeoutMs: 300,
    cancelInFlight: false,
    propagateDeadline: false,
  };
}

export function mitigationControls(): CascadeControls {
  return {
    ...incidentControls(),
    maxRetries: 0,
    attemptTimeoutMs: 1100,
    cancelInFlight: true,
    propagateDeadline: true,
  };
}

export function createCascade(patch?: Partial<CascadeControls>): CascadeState {
  return {
    controls: { ...healthyControls(), ...patch },
    arrivalAcc: 0,
    nextId: 1,
    seq: 0,
    spans: [],
    journeys: [],
    log: [],
    scheduled: [],
    providerQueue: [],
    providerBusy: [],
    cancelled: new Set(),
    sampleAt: 0.25,
    samples: [],
    demonstratedAmplification: false,
  };
}

export function attachCascade(engine: Engine, patch?: Partial<CascadeControls>) {
  engine.cascade = createCascade(patch);
}

export function setCascadeControls(state: CascadeState, patch: Partial<CascadeControls>) {
  state.controls = { ...state.controls, ...patch };
}

export function advanceCascade(state: CascadeState, rng: Rng, t: number, dt: number): number {
  if (dt <= 0) return t;
  const end = t + dt;
  state.arrivalAcc += state.controls.arrivalRate * dt;
  let arrivals = 0;
  while (state.arrivalAcc >= 1 && arrivals < 10000) {
    state.arrivalAcc -= 1;
    arrivals += 1;
    arrive(state, t);
  }
  let guard = 0;
  while (state.scheduled.length > 0 && state.scheduled[0]!.t <= end + 1e-12) {
    if (++guard > 100000) break;
    const ev = state.scheduled.shift()!;
    if (state.cancelled.delete(ev.seq)) continue;
    dispatch(state, rng, ev);
  }
  sample(state, end);
  prune(state, end);
  return end;
}

export function cascadeView(state: CascadeState, t: number): CascadeView {
  const controls = { ...state.controls };
  const from = t - WINDOW_SEC;
  const finished = state.journeys.filter(
    (journey) => journey.finishedAt != null && journey.finishedAt >= from && journey.finishedAt <= t + 1e-9,
  );
  const successes = finished.filter((journey) => journey.outcome === "ok");
  const traceIds = new Set(finished.map((journey) => journey.traceId));
  const providerSpans = state.spans.filter(
    (span) => span.service === "provider" && traceIds.has(span.traceId),
  );
  const durations = finished
    .filter((journey) => journey.finishedAt != null)
    .map((journey) => (journey.finishedAt! - journey.arrivedAt) * 1000);
  const windowSec = Math.min(WINDOW_SEC, Math.max(t, 0.05));
  const openByService = countOpen(state);
  const providerWork = state.spans
    .filter((span) => span.service === "provider" && span.workSec != null && span.start >= from)
    .map((span) => span.workSec! * 1000);

  return {
    t,
    controls,
    finished: finished.length,
    successes: successes.length,
    successRate: finished.length === 0 ? null : successes.length / finished.length,
    attemptsPerCheckout: finished.length === 0 ? 0 : providerSpans.length / finished.length,
    providerBusy: state.providerBusy.length,
    providerQueue: state.providerQueue.length,
    providerSlots: PROVIDER_SLOTS,
    providerUtilization: utilization(state.providerBusy.length, PROVIDER_SLOTS),
    openJourneys: state.journeys.filter((journey) => journey.outcome === "open").length,
    okPerSec: successes.length / windowSec,
    gatewayP99Ms: percentile(durations, 99),
    measuredProviderMs: providerWork.length === 0 ? null : percentile(providerWork, 50),
    openByService,
    services: serviceStats(state, t),
    traces: recentTraces(state),
    logs: state.log.slice(-200),
    timeline: state.log.slice(-200),
    samples: state.samples.slice(-80),
    demonstratedAmplification: state.demonstratedAmplification,
  };
}

export function gradeCascade(
  view: CascadeView,
  opts: { mode: "guided" | "practice" | "challenge"; demonstrated: boolean },
): { ok: boolean; reason: string } {
  if (opts.mode !== "challenge" && !opts.demonstrated) {
    return {
      ok: false,
      reason:
        "Slow the provider and let a short timeout retry. The window should show failed checkouts and more than one provider call each. Then bring success back.",
    };
  }
  if (view.finished < 8 || view.successRate == null) {
    return {
      ok: false,
      reason: "Let the clock run until at least 8 checkouts finish in the last 5 seconds.",
    };
  }
  const successPct = Math.round(view.successRate * 1000) / 10;
  if (view.successRate < 0.95) {
    return {
      ok: false,
      reason: `Checkout success is ${successPct}% over the last 5 seconds. It needs to reach 95%.`,
    };
  }
  const attempts = Math.round(view.attemptsPerCheckout * 100) / 100;
  const callWord = attempts === 1 ? "call" : "calls";
  if (view.attemptsPerCheckout > 1.25) {
    return {
      ok: false,
      reason: `Each finished checkout still starts ${attempts} provider ${callWord}. Bring that to 1.25 or fewer.`,
    };
  }
  const utilPct = Math.round(view.providerUtilization * 100);
  if (view.providerUtilization >= 0.9) {
    return {
      ok: false,
      reason: `Provider slots are ${utilPct}% full. At this arrival rate a single attempt should sit under 90%.`,
    };
  }
  const needed = view.controls.arrivalRate * 0.5;
  if (view.okPerSec + 1e-9 < needed) {
    return {
      ok: false,
      reason: `Successful checkouts are ${view.okPerSec.toFixed(1)} per second. Keep at least half of the ${view.controls.arrivalRate} arrivals per second.`,
    };
  }
  return {
    ok: true,
    reason: `Checkout success is ${successPct}%, with ${attempts} provider ${callWord} per checkout. Provider slots are ${utilPct}% full.`,
  };
}

function arrive(state: CascadeState, t: number) {
  const open = state.journeys.filter((journey) => journey.outcome === "open").length;
  const traceId = `tr-${state.nextId++}`;
  const shed = state.controls.shedAtInflight;
  if (shed != null && open >= shed) {
    const span = makeSpan(state, traceId, null, "gateway", 0, t);
    span.status = "rejected";
    span.end = t;
    state.journeys.push({
      id: traceId,
      traceId,
      arrivedAt: t,
      deadlineAt: t,
      outcome: "rejected",
      finishedAt: t,
      providerAttempts: 0,
      clientClosed: true,
      paymentSpanId: null,
    });
    pushLog(state, t, span, "reject", "Gateway rejected the checkout because too many checkouts were already open.");
    return;
  }
  const span = makeSpan(state, traceId, null, "gateway", 1, t);
  state.journeys.push({
    id: traceId,
    traceId,
    arrivedAt: t,
    deadlineAt: t + state.controls.clientDeadlineMs / 1000,
    outcome: "open",
    finishedAt: null,
    providerAttempts: 0,
    clientClosed: false,
    paymentSpanId: null,
  });
  pushLog(state, t, span, "start", "Gateway accepted the checkout.");
  schedule(state, { t: t + GATEWAY_SEC, type: "gateway-done", journeyId: traceId, spanId: span.id });
  schedule(state, {
    t: t + state.controls.clientDeadlineMs / 1000,
    type: "client-deadline",
    journeyId: traceId,
    spanId: span.id,
  });
}

function dispatch(state: CascadeState, rng: Rng, ev: Scheduled) {
  if (ev.type === "gateway-done") return finishGateway(state, ev);
  if (ev.type === "checkout-done") return finishCheckout(state, rng, ev);
  if (ev.type === "attempt-timeout") return timeoutAttempt(state, rng, ev);
  if (ev.type === "provider-done") return finishProvider(state, rng, ev);
  if (ev.type === "client-deadline") return clientDeadline(state, rng, ev);
  return retryAttempt(state, rng, ev);
}

function finishGateway(state: CascadeState, ev: Scheduled) {
  const journey = findJourney(state, ev.journeyId);
  const span = findSpan(state, ev.spanId);
  if (!journey || !span || span.status !== "open") return;
  span.status = "ok";
  span.end = ev.t;
  const checkout = makeSpan(state, journey.traceId, span.id, "checkout", 1, ev.t);
  pushLog(state, ev.t, checkout, "start", "Checkout started.");
  schedule(state, { t: ev.t + CHECKOUT_SEC, type: "checkout-done", journeyId: journey.id, spanId: checkout.id });
}

function finishCheckout(state: CascadeState, rng: Rng, ev: Scheduled) {
  const journey = findJourney(state, ev.journeyId);
  const span = findSpan(state, ev.spanId);
  if (!journey || !span || span.status !== "open") return;
  span.status = "ok";
  span.end = ev.t;
  const payment = makeSpan(state, journey.traceId, span.id, "payment", 1, ev.t);
  journey.paymentSpanId = payment.id;
  pushLog(state, ev.t, payment, "start", "Checkout called payment.");
  startAttempt(state, rng, journey, ev.t);
}

function startAttempt(state: CascadeState, rng: Rng, journey: Journey, t: number) {
  if (journey.outcome === "rejected" || journey.outcome === "ok") return;
  const latency = state.controls.providerLatencyMs / 1000;
  const payment = journey.paymentSpanId ? findSpan(state, journey.paymentSpanId) : undefined;
  if (state.controls.propagateDeadline && (journey.clientClosed || t + latency > journey.deadlineAt)) {
    if (payment) {
      pushLog(
        state,
        t,
        payment,
        "cancel",
        "Payment did not start another provider call. The remaining deadline is shorter than the provider work.",
      );
    }
    failJourney(state, journey, t);
    return;
  }
  journey.providerAttempts += 1;
  const span = makeSpan(
    state,
    journey.traceId,
    journey.paymentSpanId,
    "provider",
    journey.providerAttempts,
    t,
  );
  pushLog(state, t, span, "start", `Payment started provider attempt ${journey.providerAttempts}.`);
  span.timeoutSeq = schedule(state, {
    t: t + state.controls.attemptTimeoutMs / 1000,
    type: "attempt-timeout",
    journeyId: journey.id,
    spanId: span.id,
  });
  if (state.providerBusy.length < PROVIDER_SLOTS) beginServiceWithRng(state, rng, span, t);
  else {
    state.providerQueue.push(span.id);
    pushLog(state, t, span, "queue", "Provider attempt is waiting for a free slot.");
  }
}

function beginServiceWithRng(state: CascadeState, rng: Rng, span: Span, t: number) {
  span.queueSec = Math.max(0, t - span.start);
  const work = (state.controls.providerLatencyMs / 1000) * (0.9 + rng.next() * 0.2);
  span.workSec = work;
  span.doneSeq = schedule(state, {
    t: t + work,
    type: "provider-done",
    journeyId: span.traceId,
    spanId: span.id,
  });
  if (!state.providerBusy.includes(span.id)) state.providerBusy.push(span.id);
}

function timeoutAttempt(state: CascadeState, rng: Rng, ev: Scheduled) {
  const span = findSpan(state, ev.spanId);
  const journey = findJourney(state, ev.journeyId);
  if (!span || !journey || span.status === "ok" || span.status === "cancelled" || span.status === "rejected") return;
  const waiting = state.providerQueue.includes(span.id);
  span.status = "timeout";
  span.end = ev.t;
  if (waiting) {
    state.providerQueue = state.providerQueue.filter((id) => id !== span.id);
    pushLog(state, ev.t, span, "timeout", "Provider attempt timed out while it was still waiting for a slot.");
  } else if (state.providerBusy.includes(span.id)) {
    if (state.controls.cancelInFlight) {
      if (span.doneSeq != null) state.cancelled.add(span.doneSeq);
      state.providerBusy = state.providerBusy.filter((id) => id !== span.id);
      pushLog(state, ev.t, span, "cancel", "The timeout released the provider slot.");
      pump(state, rng, ev.t);
    } else {
      span.abandoned = true;
      pushLog(state, ev.t, span, "timeout", "The caller timed out. Provider work kept the slot.");
    }
  } else {
    pushLog(state, ev.t, span, "timeout", "Provider attempt timed out.");
  }
  const retried = maybeRetry(state, journey, ev.t);
  if (!retried) failJourney(state, journey, ev.t);
}

function finishProvider(state: CascadeState, rng: Rng, ev: Scheduled) {
  if (state.cancelled.has(ev.seq)) return;
  const span = findSpan(state, ev.spanId);
  if (!span) return;
  state.providerBusy = state.providerBusy.filter((id) => id !== span.id);
  const journey = findJourney(state, span.traceId);
  if (span.abandoned || span.status === "timeout" || span.status === "cancelled") {
    pushLog(state, ev.t, span, "end", "Provider finished after the caller had already timed out.");
    pump(state, rng, ev.t);
    return;
  }
  span.status = "ok";
  span.end = ev.t;
  const workMs = span.workSec == null ? 0 : Math.round(span.workSec * 1000);
  pushLog(state, ev.t, span, "end", `Provider attempt ${span.attempt} finished in ${workMs} ms.`);
  if (journey && !journey.clientClosed && journey.outcome === "open") {
    const payment = journey.paymentSpanId ? findSpan(state, journey.paymentSpanId) : undefined;
    if (payment && payment.status === "open") {
      payment.status = "ok";
      payment.end = ev.t;
    }
    journey.outcome = "ok";
    journey.finishedAt = ev.t;
    journey.clientClosed = true;
    pushLog(state, ev.t, span, "end", "Gateway returned the checkout.");
  }
  pump(state, rng, ev.t);
}

function clientDeadline(state: CascadeState, rng: Rng, ev: Scheduled) {
  const journey = findJourney(state, ev.journeyId);
  if (!journey || journey.outcome !== "open") return;
  journey.clientClosed = true;
  journey.outcome = "timeout";
  journey.finishedAt = ev.t;
  const gateway = state.spans.find((span) => span.traceId === journey.traceId && span.service === "gateway");
  if (gateway) {
    pushLog(state, ev.t, gateway, "timeout", "The client deadline passed. The gateway returned a timeout.");
  }
  if (state.controls.cancelInFlight || state.controls.propagateDeadline) {
    cancelOpenProvider(state, rng, journey, ev.t);
  }
}

function retryAttempt(state: CascadeState, rng: Rng, ev: Scheduled) {
  const journey = findJourney(state, ev.journeyId);
  if (!journey || journey.outcome === "ok" || journey.outcome === "rejected") return;
  if (journey.clientClosed && state.controls.propagateDeadline) return;
  if (journey.providerAttempts >= state.controls.maxRetries + 1) return;
  startAttempt(state, rng, journey, ev.t);
}

function maybeRetry(state: CascadeState, journey: Journey, t: number): boolean {
  if (journey.outcome === "ok" || journey.outcome === "rejected") return false;
  if (journey.providerAttempts >= state.controls.maxRetries + 1) return false;
  if (journey.clientClosed && state.controls.propagateDeadline) return false;
  const when = t + state.controls.backoffMs / 1000;
  const latency = state.controls.providerLatencyMs / 1000;
  if (state.controls.propagateDeadline && when + latency > journey.deadlineAt) return false;
  const payment = journey.paymentSpanId ? findSpan(state, journey.paymentSpanId) : undefined;
  if (payment) {
    pushLog(
      state,
      t,
      payment,
      "retry",
      `Payment scheduled provider attempt ${journey.providerAttempts + 1}.`,
    );
  }
  schedule(state, { t: when, type: "retry", journeyId: journey.id, spanId: payment?.id ?? journey.id });
  return true;
}

function failJourney(state: CascadeState, journey: Journey, t: number) {
  if (journey.outcome === "open") {
    journey.outcome = "timeout";
    journey.finishedAt = t;
    journey.clientClosed = true;
  }
  const payment = journey.paymentSpanId ? findSpan(state, journey.paymentSpanId) : undefined;
  if (payment && payment.status === "open") {
    payment.status = "timeout";
    payment.end = t;
    pushLog(state, t, payment, "timeout", "Payment stopped calling the provider.");
  }
}

function cancelOpenProvider(state: CascadeState, rng: Rng, journey: Journey, t: number) {
  for (const span of state.spans) {
    if (span.traceId !== journey.traceId || span.service !== "provider" || span.status !== "open") continue;
    span.status = "cancelled";
    span.end = t;
    if (span.doneSeq != null) state.cancelled.add(span.doneSeq);
    if (span.timeoutSeq != null) state.cancelled.add(span.timeoutSeq);
    state.providerQueue = state.providerQueue.filter((id) => id !== span.id);
    state.providerBusy = state.providerBusy.filter((id) => id !== span.id);
    pushLog(state, t, span, "cancel", "The deadline cancelled provider work and released the slot.");
  }
  pump(state, rng, t);
}

function pump(state: CascadeState, rng: Rng, t: number) {
  while (state.providerBusy.length < PROVIDER_SLOTS && state.providerQueue.length > 0) {
    const id = state.providerQueue.shift()!;
    const span = findSpan(state, id);
    if (!span || span.status !== "open") continue;
    beginServiceWithRng(state, rng, span, t);
  }
}

function sample(state: CascadeState, t: number) {
  if (t + 1e-9 < state.sampleAt) return;
  const view = cascadeView(state, t);
  state.samples.push({
    t,
    successRate: view.successRate,
    attemptsPerCheckout: view.attemptsPerCheckout,
    providerUtilization: view.providerUtilization,
    gatewayP99Ms: view.gatewayP99Ms,
  });
  if (state.samples.length > 240) state.samples.shift();
  if (view.finished >= 4 && view.attemptsPerCheckout >= 2.5 && (view.successRate ?? 1) <= 0.5) {
    state.demonstratedAmplification = true;
  }
  while (state.sampleAt <= t + 1e-9) state.sampleAt += 0.25;
}

function prune(state: CascadeState, t: number) {
  const keep = new Set(state.journeys.slice(-40).map((journey) => journey.traceId));
  for (const journey of state.journeys) {
    if (journey.outcome === "open") keep.add(journey.traceId);
  }
  const live = new Set([...state.providerBusy, ...state.providerQueue]);
  state.spans = state.spans.filter(
    (span) => keep.has(span.traceId) || live.has(span.id) || span.status === "open",
  );
  state.journeys = state.journeys.filter((journey) => keep.has(journey.traceId));
  state.log = state.log.filter((entry) => entry.t > t - 20);
  if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
  const pending = new Set(state.scheduled.map((event) => event.seq));
  for (const seq of state.cancelled) if (!pending.has(seq)) state.cancelled.delete(seq);
}

function schedule(state: CascadeState, ev: Omit<Scheduled, "seq">): number {
  const seq = ++state.seq;
  const full: Scheduled = { ...ev, seq };
  let lo = 0;
  let hi = state.scheduled.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const item = state.scheduled[mid]!;
    if (item.t < full.t || (item.t === full.t && item.seq < full.seq)) lo = mid + 1;
    else hi = mid;
  }
  state.scheduled.splice(lo, 0, full);
  return seq;
}

function makeSpan(
  state: CascadeState,
  traceId: string,
  parentId: string | null,
  service: CascadeService,
  attempt: number,
  t: number,
): Span {
  const span: Span = {
    id: `sp-${state.nextId++}`,
    traceId,
    parentId,
    service,
    attempt,
    start: t,
    end: null,
    status: "open",
    queueSec: 0,
    workSec: null,
    timeoutSeq: null,
    doneSeq: null,
    abandoned: false,
  };
  state.spans.push(span);
  return span;
}

function pushLog(state: CascadeState, t: number, span: Span, kind: CascadeLog["kind"], message: string) {
  state.log.push({
    t,
    traceId: span.traceId,
    spanId: span.id,
    service: span.service,
    kind,
    attempt: span.attempt,
    message,
  });
}

function findSpan(state: CascadeState, id: string): Span | undefined {
  return state.spans.find((span) => span.id === id);
}

function findJourney(state: CascadeState, id: string): Journey | undefined {
  return state.journeys.find((journey) => journey.id === id || journey.traceId === id);
}

function countOpen(state: CascadeState): Record<CascadeService, number> {
  const open: Record<CascadeService, number> = { gateway: 0, checkout: 0, payment: 0, provider: 0 };
  for (const span of state.spans) {
    if (span.status === "open") open[span.service] += 1;
  }
  return open;
}

function serviceStats(state: CascadeState, t: number): ServiceStat[] {
  const from = t - WINDOW_SEC;
  return (["gateway", "checkout", "payment", "provider"] as const).map((service) => {
    const ended = state.spans.filter(
      (span) => span.service === service && span.end != null && span.end >= from && span.end <= t + 1e-9,
    );
    const bad = ended.filter((span) => span.status === "timeout" || span.status === "rejected" || span.status === "cancelled");
    const durations = ended
      .filter((span) => span.end != null)
      .map((span) => (span.end! - span.start) * 1000);
    return {
      service,
      open: state.spans.filter((span) => span.service === service && span.status === "open").length,
      ended: ended.length,
      p99Ms: percentile(durations, 99),
      errorRate: ended.length === 0 ? null : bad.length / ended.length,
    };
  });
}

function recentTraces(state: CascadeState): CascadeTrace[] {
  return state.journeys.slice(-6).reverse().map((journey) => ({
    traceId: journey.traceId,
    outcome: journey.outcome,
    arrivedAt: journey.arrivedAt,
    finishedAt: journey.finishedAt,
    durationMs: journey.finishedAt == null ? null : (journey.finishedAt - journey.arrivedAt) * 1000,
    providerAttempts: journey.providerAttempts,
    spans: state.spans
      .filter((span) => span.traceId === journey.traceId)
      .sort((a, b) => a.start - b.start || a.attempt - b.attempt)
      .map(toSpanView),
  }));
}

function toSpanView(span: Span): CascadeSpanView {
  return {
    id: span.id,
    traceId: span.traceId,
    parentId: span.parentId,
    service: span.service,
    attempt: span.attempt,
    start: span.start,
    end: span.end,
    status: span.status,
    queueMs: span.queueSec * 1000,
    workMs: span.workSec == null ? null : span.workSec * 1000,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}
