/**
 * Checkout telemetry for the SRE Lab.
 * One clock produces requests. Metrics, traces, logs, and alerts are views of those requests.
 * A stated SLO target is the only pass line. 98.3% does not meet a 99.5% target.
 */

export const DEFAULT_TARGET = 0.995;
export const LATENCY_BUDGET_MS = 300;
export const PAGE_BURN = 14.4;
export const SHORT_WINDOW_SEC = 12;
export const LONG_WINDOW_SEC = 60;
export const SLO_WINDOW_SEC = 60;
export const CHECKOUT_SELF_MS = 15;
export const PAYMENT_BASE_MS = 40;

export type Journey = "checkout" | "cpu";
export type GoodWhen = "success" | "fast" | "both";
export type AlertKind = "cpu" | "burn";
export type Scene =
  | "healthy"
  | "cpu-spike"
  | "short-spike"
  | "sustained"
  | "missing-telemetry"
  | "slow-payment";

export type Instrumentation = {
  httpMetrics: boolean;
  outboundSpan: boolean;
  traceContext: boolean;
  structuredLogs: boolean;
};

export type Controls = {
  arrivalRate: number;
  errorRate: number;
  paymentBaseMs: number;
  extraLatencyMs: number;
  timeoutMs: number;
  cpu: number;
  emitHttp: boolean;
  instrumentation: Instrumentation;
  journey: Journey;
  goodWhen: GoodWhen;
  latencyBudgetMs: number;
  target: number;
  alert: AlertKind;
};

export type RequestEvent = {
  t: number;
  id: string;
  traceId: string;
  status: number;
  checkoutMs: number;
  paymentMs: number;
  cpu: number;
  bad: boolean;
  timedOut: boolean;
};

export type GaugeEvent = {
  t: number;
  cpu: number;
};

export const EMPTY_INSTRUMENTATION: Instrumentation = {
  httpMetrics: false,
  outboundSpan: false,
  traceContext: false,
  structuredLogs: false,
};

export const FULL_INSTRUMENTATION: Instrumentation = {
  httpMetrics: true,
  outboundSpan: true,
  traceContext: true,
  structuredLogs: true,
};

export function defaultControls(patch?: Partial<Controls>): Controls {
  const base: Controls = {
    arrivalRate: 10,
    errorRate: 0,
    paymentBaseMs: PAYMENT_BASE_MS,
    extraLatencyMs: 0,
    timeoutMs: 2000,
    cpu: 0.22,
    emitHttp: true,
    instrumentation: { ...FULL_INSTRUMENTATION },
    journey: "checkout",
    goodWhen: "both",
    latencyBudgetMs: LATENCY_BUDGET_MS,
    target: DEFAULT_TARGET,
    alert: "burn",
  };
  return {
    ...base,
    ...patch,
    instrumentation: {
      ...base.instrumentation,
      ...patch?.instrumentation,
    },
  };
}

/** True only when the measured good rate reaches the stated target. */
export function meetsTarget(goodRate: number, target: number): boolean {
  if (!Number.isFinite(goodRate) || !Number.isFinite(target)) return false;
  return goodRate + 1e-12 >= target;
}

export function budgetFraction(target: number): number {
  return Math.max(0, 1 - target);
}

export function isCheckoutGood(request: RequestEvent, controls: Controls): boolean {
  const success = request.status === 200;
  const fast = request.checkoutMs <= controls.latencyBudgetMs;
  if (controls.goodWhen === "success") return success;
  if (controls.goodWhen === "fast") return fast;
  return success && fast;
}

export function burnRate(bad: number, total: number, target: number): number | null {
  if (total <= 0) return null;
  const allowed = budgetFraction(target);
  if (allowed <= 0) return null;
  return bad / total / allowed;
}

export function targetLabel(target: number): string {
  return `${(target * 100).toFixed(1)}%`;
}
