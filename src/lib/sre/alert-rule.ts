import type { EngineState } from "@/lib/sre/engine";
import { burnRate, isCheckoutGood, type Controls } from "@/lib/sre/model";
export type AlertRule = {
  signal: "cpu" | "burn";
  threshold: number;
  forSeconds: number;
};
export type RuleState = "quiet" | "pending" | "paging" | "no-data";
export type RuleEvaluation = {
  t: number;
  state: RuleState;
  value: number | null;
  heldSeconds: number;
};
export const DEFAULT_RULE: AlertRule = {
  signal: "burn",
  threshold: 14.4,
  forSeconds: 5,
};
export function parseAlertRule(text: string): AlertRule {
  const rule = JSON.parse(text);
  if (!rule || (rule.signal !== "cpu" && rule.signal !== "burn"))
    throw new Error('signal must be "cpu" or "burn".');
  if (
    typeof rule.threshold !== "number" ||
    !Number.isFinite(rule.threshold) ||
    rule.threshold <= 0 ||
    rule.threshold > (rule.signal === "cpu" ? 1 : 1000)
  )
    throw new Error(
      "threshold must be positive, at most 1 for CPU or 1000 for burn rate.",
    );
  if (
    !Number.isInteger(rule.forSeconds) ||
    rule.forSeconds < 0 ||
    rule.forSeconds > 60
  )
    throw new Error("forSeconds must be a whole number between 0 and 60.");
  if (
    Object.keys(rule).some(
      (key) => !["signal", "threshold", "forSeconds"].includes(key),
    )
  )
    throw new Error("Only signal, threshold and forSeconds are supported.");
  return {
    signal: rule.signal,
    threshold: rule.threshold,
    forSeconds: rule.forSeconds,
  };
}
/** Replay the rule at one-second sample timestamps. No notification service is used. */
export function evaluateAlertRule(
  engine: EngineState,
  controls: Controls,
  rule: AlertRule,
): RuleEvaluation[] {
  let hotSince: number | null = null;
  return engine.gauges.map((gauge) => {
    let value: number | null = gauge.cpu;
    if (rule.signal === "burn") {
      const short = engine.requests.filter(
        (request) => request.t > gauge.t - 12 && request.t <= gauge.t,
      );
      const long = engine.requests.filter(
        (request) => request.t > gauge.t - 60 && request.t <= gauge.t,
      );
      value =
        !controls.emitHttp ||
        !controls.instrumentation.httpMetrics ||
        short.length < 20 ||
        long.length < 40
          ? null
          : Math.min(
              burnRate(
                short.filter((row) => !isCheckoutGood(row, controls)).length,
                short.length,
                controls.target,
              ) ?? 0,
              burnRate(
                long.filter((row) => !isCheckoutGood(row, controls)).length,
                long.length,
                controls.target,
              ) ?? 0,
            );
    }
    if (value == null || value < rule.threshold) hotSince = null;
    else hotSince ??= gauge.t;
    const heldSeconds = hotSince == null ? 0 : gauge.t - hotSince;
    const state: RuleState =
      value == null
        ? "no-data"
        : value < rule.threshold
          ? "quiet"
          : heldSeconds >= rule.forSeconds
            ? "paging"
            : "pending";
    return { t: gauge.t, state, value, heldSeconds };
  });
}
