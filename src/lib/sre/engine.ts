import { createRng, type Rng } from "@/lib/experience/rng";
import {
  CHECKOUT_SELF_MS,
  FULL_INSTRUMENTATION,
  LONG_WINDOW_SEC,
  PAGE_BURN,
  SHORT_WINDOW_SEC,
  SLO_WINDOW_SEC,
  budgetFraction,
  burnRate,
  defaultControls,
  hostSignal,
  isCheckoutGood,
  meetsTarget,
  type AlertKind,
  type Controls,
  type GaugeEvent,
  type RequestEvent,
  type Scene,
} from "@/lib/sre/model";

/** How a seeded challenge window marks the bad share of events. */
export type WindowMissKind = "http" | "latency" | "mismatch";

export type EngineState = {
  t: number;
  seed: number;
  nextId: number;
  rng: Rng;
  requests: RequestEvent[];
  gauges: GaugeEvent[];
};

export type SpanView = {
  name: string;
  ms: number;
  traceId: string | null;
  linked: boolean;
};

export type TraceView = {
  id: string;
  traceId: string;
  status: number;
  checkoutMs: number;
  paymentMs: number;
  spans: SpanView[];
  unlinked: SpanView[];
};

export type LogView = {
  id: string;
  line: string;
};

export type WindowMath = {
  total: number;
  good: number;
  bad: number;
  goodRate: number | null;
  allowedBad: number;
  spent: number | null;
  remaining: number | null;
  meets: boolean | null;
};

export type BurnWindow = {
  seconds: number;
  total: number;
  bad: number;
  burn: number | null;
  hot: boolean;
};

export type AlertView = {
  kind: AlertKind;
  status: "quiet" | "paging" | "no-data";
  detail: string;
};

export type Snapshot = {
  t: number;
  httpVisible: boolean;
  requests: RequestEvent[];
  window: WindowMath;
  shortBurn: BurnWindow;
  longBurn: BurnWindow;
  cpu: number | null;
  traces: TraceView[];
  logs: LogView[];
  cpuAlert: AlertView;
  burnAlert: AlertView;
  series: { t: number; errorRate: number | null; cpu: number | null }[];
};

const RETAIN_SEC = 180;

export function createSreEngine(seed = 7): EngineState {
  return {
    t: 0,
    seed,
    nextId: 1,
    rng: createRng(seed),
    requests: [],
    gauges: [],
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function stepSre(state: EngineState, controls: Controls, dt = 1): EngineState {
  const seconds = Math.max(0, dt);
  const arrivals = Math.max(0, Math.round(controls.arrivalRate * seconds));
  const signal = clamp01(hostSignal(controls));
  const requests = state.requests.slice();
  let nextId = state.nextId;
  const t = state.t + seconds;

  const failCount = Math.round(clamp01(controls.errorRate) * arrivals);
  const mismatchCount =
    controls.profile === "api"
      ? Math.round(clamp01(controls.contractMismatchRate) * arrivals)
      : 0;
  const rejectCount =
    controls.profile === "analytics"
      ? Math.round(clamp01(controls.batchRejectRate) * arrivals)
      : 0;

  for (let i = 0; i < arrivals; i += 1) {
    const jitter = Math.floor(state.rng.next() * 8);
    let status = 200;
    let timedOut = false;
    let paymentMs = controls.paymentBaseMs;
    let checkoutMs = CHECKOUT_SELF_MS + paymentMs;

    if (controls.profile === "api") {
      const mismatch = i < mismatchCount;
      const failed = !mismatch && i < mismatchCount + failCount;
      const docsMs =
        controls.paymentBaseMs + controls.docsLagMs + controls.extraLatencyMs + jitter;
      timedOut = !mismatch && !failed && docsMs > controls.timeoutMs;
      paymentMs = mismatch
        ? Math.max(8, Math.floor(controls.paymentBaseMs * 0.4))
        : failed
          ? controls.paymentBaseMs
          : timedOut
            ? controls.timeoutMs
            : docsMs;
      status = mismatch ? 400 : failed ? 500 : timedOut ? 504 : 200;
      checkoutMs = CHECKOUT_SELF_MS + paymentMs;
    } else if (controls.profile === "analytics") {
      const rejected = i < rejectCount;
      const failed = !rejected && i < rejectCount + failCount;
      const writeMs =
        controls.paymentBaseMs + controls.lateBatchMs + controls.extraLatencyMs + jitter;
      timedOut = !rejected && !failed && writeMs > controls.timeoutMs;
      paymentMs = rejected || failed
        ? controls.paymentBaseMs
        : timedOut
          ? controls.timeoutMs
          : writeMs;
      status = rejected ? 503 : failed ? 500 : timedOut ? 504 : 200;
      checkoutMs = CHECKOUT_SELF_MS + paymentMs;
    } else {
      const failed = i < failCount;
      const attempted = controls.paymentBaseMs + controls.extraLatencyMs + jitter;
      timedOut = !failed && attempted > controls.timeoutMs;
      paymentMs = failed ? controls.paymentBaseMs : timedOut ? controls.timeoutMs : attempted;
      status = failed ? 500 : timedOut ? 504 : 200;
      checkoutMs = CHECKOUT_SELF_MS + paymentMs;
    }

    const id = `c-${nextId}`;
    nextId += 1;
    const request: RequestEvent = {
      t,
      id,
      traceId: `t-${id.slice(2)}`,
      status,
      checkoutMs,
      paymentMs,
      cpu: signal,
      bad: status !== 200,
      timedOut,
    };
    requests.push(request);
  }

  const gauges = state.gauges.concat({ t, cpu: signal });
  const cutoff = t - RETAIN_SEC;
  return {
    ...state,
    t,
    nextId,
    requests: requests.filter((request) => request.t >= cutoff),
    gauges: gauges.filter((gauge) => gauge.t >= cutoff),
  };
}

export function runSre(state: EngineState, controls: Controls, seconds: number): EngineState {
  let next = state;
  const whole = Math.max(0, Math.round(seconds));
  for (let i = 0; i < whole; i += 1) next = stepSre(next, controls, 1);
  return next;
}

export function resetSre(seed: number): EngineState {
  return createSreEngine(seed);
}

/**
 * Replace the window with an exact event count.
 * Keeps 17 misses in 1,000 at 98.3%. missKind shapes how those misses look in traces.
 */
export function loadCheckoutWindow(
  seed: number,
  input: {
    total: number;
    bad: number;
    checkoutMs?: number;
    badMs?: number;
    missKind?: WindowMissKind;
    host?: number;
  },
): EngineState {
  const state = createSreEngine(seed);
  const total = Math.max(0, Math.round(input.total));
  const bad = Math.min(total, Math.max(0, Math.round(input.bad)));
  const goodMs = input.checkoutMs ?? 80;
  const badMs = input.badMs ?? 800;
  const missKind = input.missKind ?? "http";
  const host = input.host ?? 0.3;
  const requests: RequestEvent[] = [];
  // Spread misses through the window so the copper miss line stays readable.
  const missAt = new Set<number>();
  for (let m = 0; m < bad; m += 1) {
    missAt.add(Math.min(total - 1, Math.floor(((m + 0.5) * total) / bad)));
  }
  for (let i = 0; i < total; i += 1) {
    const failed = missAt.has(i);
    const id = `c-${i + 1}`;
    let status = 200;
    let checkoutMs = goodMs;
    if (failed) {
      if (missKind === "latency") {
        status = 200;
        checkoutMs = badMs;
      } else if (missKind === "mismatch") {
        status = 400;
        checkoutMs = Math.max(8, Math.floor(goodMs * 0.5));
      } else {
        status = 500;
        checkoutMs = badMs;
      }
    }
    const t = SLO_WINDOW_SEC * ((i + 1) / Math.max(1, total));
    requests.push({
      t,
      id,
      traceId: `t-${i + 1}`,
      status,
      checkoutMs,
      paymentMs: Math.max(0, checkoutMs - CHECKOUT_SELF_MS),
      cpu: host,
      bad: status !== 200,
      timedOut: false,
    });
  }
  const gauges: GaugeEvent[] = [];
  for (let t = 1; t <= SLO_WINDOW_SEC; t += 1) {
    gauges.push({ t, cpu: host });
  }
  return {
    ...state,
    t: SLO_WINDOW_SEC,
    nextId: total + 1,
    requests,
    gauges,
  };
}

function inWindow(requests: RequestEvent[], t: number, seconds: number): RequestEvent[] {
  const start = t - seconds;
  return requests.filter((request) => request.t > start && request.t <= t);
}

function windowMath(requests: RequestEvent[], controls: Controls, visible: boolean): WindowMath {
  if (!visible) {
    return {
      total: 0,
      good: 0,
      bad: 0,
      goodRate: null,
      allowedBad: 0,
      spent: null,
      remaining: null,
      meets: null,
    };
  }
  if (controls.journey === "cpu") {
    const good = requests.filter((request) => request.cpu < 0.8).length;
    const total = requests.length;
    const bad = total - good;
    const allowedBad = budgetFraction(controls.target) * total;
    const goodRate = total === 0 ? null : good / total;
    const spent = allowedBad <= 0 ? null : bad / allowedBad;
    return {
      total,
      good,
      bad,
      goodRate,
      allowedBad,
      spent,
      remaining: spent === null ? null : 1 - spent,
      meets: goodRate === null ? null : meetsTarget(goodRate, controls.target),
    };
  }
  const good = requests.filter((request) => isCheckoutGood(request, controls)).length;
  const total = requests.length;
  const bad = total - good;
  const allowedBad = budgetFraction(controls.target) * total;
  const goodRate = total === 0 ? null : good / total;
  const spent = total === 0 || allowedBad <= 0 ? null : bad / allowedBad;
  return {
    total,
    good,
    bad,
    goodRate,
    allowedBad,
    spent,
    remaining: spent === null ? null : 1 - spent,
    meets: goodRate === null ? null : meetsTarget(goodRate, controls.target),
  };
}

function burnWindow(requests: RequestEvent[], controls: Controls, seconds: number, t: number, visible: boolean): BurnWindow {
  const rows = visible ? inWindow(requests, t, seconds) : [];
  const bad =
    controls.journey === "cpu"
      ? rows.filter((request) => request.cpu >= 0.8).length
      : rows.filter((request) => !isCheckoutGood(request, controls)).length;
  const rate = visible ? burnRate(bad, rows.length, controls.target) : null;
  return {
    seconds,
    total: rows.length,
    bad,
    burn: rate,
    hot: rate !== null && rate >= PAGE_BURN,
  };
}

function httpVisible(controls: Controls): boolean {
  return controls.emitHttp && controls.instrumentation.httpMetrics;
}

function tracesFor(requests: RequestEvent[], controls: Controls): TraceView[] {
  if (!controls.emitHttp) return [];
  return requests.slice(-6).reverse().map((request) => {
    const server: SpanView = {
      name: controls.handlerSpan,
      ms: request.checkoutMs,
      traceId: request.traceId,
      linked: true,
    };
    const spans: SpanView[] = [server];
    const unlinked: SpanView[] = [];
    if (controls.instrumentation.outboundSpan) {
      const child: SpanView = {
        name: controls.dependencySpan,
        ms: request.paymentMs,
        traceId: controls.instrumentation.traceContext ? request.traceId : null,
        linked: controls.instrumentation.traceContext,
      };
      if (child.linked) spans.push(child);
      else unlinked.push(child);
    }
    return {
      id: request.id,
      traceId: request.traceId,
      status: request.status,
      checkoutMs: request.checkoutMs,
      paymentMs: request.paymentMs,
      spans,
      unlinked,
    };
  });
}

function logsFor(requests: RequestEvent[], controls: Controls): LogView[] {
  if (!controls.emitHttp || !controls.instrumentation.structuredLogs) return [];
  return requests.slice(-6).reverse().map((request) => {
    const fields: Record<string, string | number> = {
      request_id: request.id,
      status: request.status,
      [controls.requestLog]: request.checkoutMs,
    };
    if (controls.instrumentation.traceContext) fields.trace_id = request.traceId;
    if (controls.instrumentation.outboundSpan) fields[controls.dependencyLog] = request.paymentMs;
    return { id: request.id, line: JSON.stringify(fields) };
  });
}

function seriesFor(state: EngineState, controls: Controls): Snapshot["series"] {
  const buckets: Snapshot["series"] = [];
  const start = Math.max(0, Math.floor(state.t) - 59);
  for (let t = start; t <= Math.floor(state.t); t += 1) {
    const cpu = state.gauges.findLast((gauge) => Math.round(gauge.t) === t)?.cpu ?? null;
    if (!httpVisible(controls)) {
      buckets.push({ t, errorRate: null, cpu });
      continue;
    }
    const rows = state.requests.filter((request) => Math.round(request.t) === t);
    // Copper tracks SLI misses (HTTP failure or over the latency line), not status≠200 alone.
    const errorRate =
      rows.length === 0
        ? null
        : rows.filter((request) => !isCheckoutGood(request, controls)).length / rows.length;
    buckets.push({ t, errorRate, cpu });
  }
  return buckets;
}

export function snapshotSre(state: EngineState, controls: Controls): Snapshot {
  const visible = httpVisible(controls);
  const windowRequests = visible ? inWindow(state.requests, state.t, SLO_WINDOW_SEC) : [];
  const window = windowMath(windowRequests, controls, visible);
  const shortBurn = burnWindow(state.requests, controls, SHORT_WINDOW_SEC, state.t, visible);
  const longBurn = burnWindow(state.requests, controls, LONG_WINDOW_SEC, state.t, visible);
  const cpu = state.gauges.length === 0 ? null : state.gauges[state.gauges.length - 1]!.cpu;
  const hostKind: AlertKind =
    controls.profile === "analytics" ? "warehouse" : "cpu";
  const hostLabel = controls.profile === "analytics" ? "Warehouse util" : "CPU";
  const cpuAlert: AlertView =
    cpu === null
      ? {
          kind: hostKind,
          status: "no-data",
          detail: `No ${hostLabel.toLowerCase()} sample has arrived.`,
        }
      : cpu > 0.8
        ? {
            kind: hostKind,
            status: "paging",
            detail: `${hostLabel} is ${Math.round(cpu * 100)}%, over the 80% line.`,
          }
        : {
            kind: hostKind,
            status: "quiet",
            detail: `${hostLabel} is ${Math.round(cpu * 100)}%, under the 80% line.`,
          };
  let burnAlert: AlertView;
  if (!visible || shortBurn.total < 20 || longBurn.total < 40) {
    burnAlert = {
      kind: "burn",
      status: "no-data",
      detail: visible
        ? `The windows do not have enough ${controls.workPlural} yet.`
        : `Metrics for ${controls.workPlural} are missing. This alert cannot call the SLO healthy, and it does not page.`,
    };
  } else if (shortBurn.hot && longBurn.hot) {
    burnAlert = {
      kind: "burn",
      status: "paging",
      detail: `Both windows are at or above ${PAGE_BURN} times the ${((1 - controls.target) * 100).toFixed(1)}% budget.`,
    };
  } else if (shortBurn.hot) {
    burnAlert = {
      kind: "burn",
      status: "quiet",
      detail: "The short window is burning. The long window has not confirmed it, so this does not page.",
    };
  } else {
    burnAlert = {
      kind: "burn",
      status: "quiet",
      detail: "Neither window is burning through the budget.",
    };
  }
  return {
    t: state.t,
    httpVisible: visible,
    requests: windowRequests,
    window,
    shortBurn,
    longBurn,
    cpu,
    traces: tracesFor(inWindow(state.requests, state.t, SLO_WINDOW_SEC).slice(-12), controls),
    logs: logsFor(inWindow(state.requests, state.t, SLO_WINDOW_SEC).slice(-12), controls),
    cpuAlert,
    burnAlert,
    series: seriesFor(state, controls),
  };
}

export function sceneControls(scene: Scene, base?: Partial<Controls>): Controls {
  const instrumentation = { ...FULL_INSTRUMENTATION, ...base?.instrumentation };
  const profile = base?.profile ?? "default";
  if (scene === "healthy") {
    return defaultControls({
      ...base,
      instrumentation,
      profile,
      errorRate: 0,
      cpu: 0.22,
      warehouseUtil: 0.22,
      docsLagMs: 0,
      lateBatchMs: 0,
      contractMismatchRate: 0,
      batchRejectRate: 0,
      extraLatencyMs: 0,
      emitHttp: true,
      timeoutMs: 2000,
    });
  }
  if (scene === "cpu-spike" || scene === "warehouse-busy") {
    return defaultControls({
      ...base,
      instrumentation,
      profile,
      errorRate: 0,
      batchRejectRate: 0,
      contractMismatchRate: 0,
      cpu: scene === "cpu-spike" ? 0.92 : 0.22,
      warehouseUtil: scene === "warehouse-busy" || profile === "analytics" ? 0.92 : 0.22,
      extraLatencyMs: 0,
      docsLagMs: 0,
      lateBatchMs: 0,
      emitHttp: true,
      arrivalRate: 10,
      timeoutMs: 2000,
    });
  }
  if (scene === "short-spike") {
    return defaultControls({
      ...base,
      instrumentation,
      profile,
      emitHttp: true,
      arrivalRate: 10,
      timeoutMs: 300,
      cpu: 0.35,
      warehouseUtil: 0.35,
    });
  }
  if (scene === "sustained") {
    return defaultControls({
      ...base,
      instrumentation,
      profile,
      errorRate: profile === "analytics" ? 0 : 0.2,
      batchRejectRate: profile === "analytics" ? 0.2 : 0,
      contractMismatchRate: 0,
      cpu: 0.35,
      warehouseUtil: 0.35,
      extraLatencyMs: 0,
      docsLagMs: 0,
      lateBatchMs: 0,
      emitHttp: true,
      arrivalRate: 10,
      timeoutMs: 300,
    });
  }
  if (scene === "missing-telemetry") {
    return defaultControls({
      ...base,
      instrumentation,
      profile,
      errorRate: profile === "analytics" ? 0 : 0.2,
      batchRejectRate: profile === "analytics" ? 0.2 : 0,
      cpu: 0.35,
      warehouseUtil: 0.35,
      emitHttp: false,
      arrivalRate: 10,
      timeoutMs: 300,
    });
  }
  if (scene === "docs-lag") {
    return defaultControls({
      ...base,
      instrumentation,
      profile: "api",
      errorRate: 0,
      contractMismatchRate: 0,
      docsLagMs: 520,
      // Keep gateway timeout above docs lag so the miss is a late 200, not a 504.
      timeoutMs: 2000,
      arrivalRate: 10,
      emitHttp: true,
      cpu: 0.3,
    });
  }
  if (scene === "contract-mismatch") {
    return defaultControls({
      ...base,
      instrumentation,
      profile: "api",
      errorRate: 0,
      contractMismatchRate: 0.25,
      docsLagMs: 0,
      timeoutMs: 300,
      arrivalRate: 10,
      emitHttp: true,
      cpu: 0.3,
    });
  }
  if (scene === "late-batches") {
    return defaultControls({
      ...base,
      instrumentation,
      profile: "analytics",
      errorRate: 0,
      batchRejectRate: 0,
      lateBatchMs: 520,
      // Keep warehouse write timeout above late-batch delay so the miss is a late 200.
      timeoutMs: 2000,
      warehouseUtil: 0.35,
      arrivalRate: 10,
      emitHttp: true,
    });
  }
  return defaultControls({
    ...base,
    instrumentation,
    profile,
    errorRate: 0,
    cpu: 0.22,
    warehouseUtil: 0.22,
    extraLatencyMs: 400,
    timeoutMs: 2000,
    arrivalRate: 4,
    emitHttp: true,
  });
}

/** Run a named situation to the moment a learner should read the alerts. */
export function runScene(scene: Scene, seed = 7, base?: Partial<Controls>): { state: EngineState; controls: Controls } {
  const controls = sceneControls(scene, base);
  let state = createSreEngine(seed);
  if (scene === "short-spike") {
    const quiet =
      controls.profile === "analytics"
        ? { batchRejectRate: 0, errorRate: 0 }
        : { errorRate: 0, batchRejectRate: 0 };
    const hot =
      controls.profile === "analytics"
        ? { batchRejectRate: 0.5, errorRate: 0 }
        : { errorRate: 0.5, batchRejectRate: 0 };
    state = runSre(state, { ...controls, ...quiet }, 54);
    state = runSre(state, { ...controls, ...hot }, 6);
    return { state, controls: { ...controls, ...hot } };
  }
  if (scene === "slow-payment") {
    state = runSre(state, controls, 4);
    return { state, controls };
  }
  if (scene === "cpu-spike" || scene === "warehouse-busy") {
    const quietSignal =
      controls.profile === "analytics"
        ? { warehouseUtil: 0.22, cpu: 0.22 }
        : { cpu: 0.22, warehouseUtil: 0.22 };
    state = runSre(state, { ...controls, ...quietSignal, errorRate: 0, batchRejectRate: 0 }, 40);
    state = runSre(state, controls, 20);
    return { state, controls };
  }
  if (scene === "docs-lag" || scene === "contract-mismatch" || scene === "late-batches") {
    state = runSre(state, controls, 60);
    return { state, controls };
  }
  const seconds = scene === "healthy" ? 8 : 60;
  state = runSre(state, controls, seconds);
  return { state, controls };
}

export function activeAlert(snapshot: Snapshot, kind: AlertKind): AlertView {
  if (kind === "burn") return snapshot.burnAlert;
  return snapshot.cpuAlert;
}
