import { runScene, snapshotSre, type Snapshot, type TraceView } from "@/lib/sre/engine";
import {
  DEFAULT_TARGET,
  PAGE_BURN,
  meetsTarget,
  type AlertKind,
  type Controls,
  type Scene,
} from "@/lib/sre/model";

export type Grade = { ok: boolean; reason: string };

export function gradeInstrument(input: {
  controls: Controls;
  snapshot: Snapshot;
  trace: TraceView | null;
  hop: "checkout" | "payment" | null;
}): Grade {
  const { controls, snapshot, trace, hop } = input;
  if (!controls.instrumentation.httpMetrics) {
    return { ok: false, reason: "HTTP metrics are still off, so the chart has nothing to read." };
  }
  if (!controls.instrumentation.outboundSpan) {
    return { ok: false, reason: "The payment call has no outbound span yet." };
  }
  if (!controls.instrumentation.traceContext) {
    return { ok: false, reason: "The payment span is not on the checkout trace." };
  }
  if (!controls.instrumentation.structuredLogs) {
    return { ok: false, reason: "Structured logs are still off." };
  }
  if (controls.extraLatencyMs < 200) {
    return { ok: false, reason: "Add latency on the payment call, then read the trace." };
  }
  if (!trace) {
    return { ok: false, reason: "Open a trace from this run." };
  }
  const payment = trace.spans.find((span) => span.name === "payment charge");
  if (!payment) {
    return { ok: false, reason: "The open trace does not include a linked payment span." };
  }
  if (hop !== "payment") {
    return { ok: false, reason: "The extra time is on the payment span, not the checkout handler itself." };
  }
  if (payment.ms <= 200) {
    return { ok: false, reason: "That payment span is not the slow call." };
  }
  if (!snapshot.httpVisible) {
    return { ok: false, reason: "Checkout metrics are hidden, so the trace is not part of the recorded telemetry." };
  }
  return {
    ok: true,
    reason: "The payment span holds the extra latency, and the log line carries the same trace.",
  };
}

export function gradeSlo(snapshot: Snapshot, controls: Controls): Grade {
  if (controls.journey !== "checkout") {
    return { ok: false, reason: "The customer journey is checkout. A CPU line does not spend this budget." };
  }
  if (controls.goodWhen !== "both") {
    return { ok: false, reason: "Count a checkout as good only when it succeeds in under 300 ms." };
  }
  if (Math.abs(controls.target - DEFAULT_TARGET) > 1e-9) {
    return { ok: false, reason: "Keep the stated target at 99.5%. A looser number is a different SLO." };
  }
  if (snapshot.window.total < 40 || snapshot.window.goodRate === null || snapshot.window.meets === null) {
    return { ok: false, reason: "Run the checkout until the window has samples." };
  }
  if (snapshot.window.meets) {
    return { ok: false, reason: "The window still meets 99.5%. Raise failures until the budget is spent." };
  }
  if ((snapshot.window.spent ?? 0) <= 1) {
    return { ok: false, reason: "Bad checkouts have not used more than the allowed budget yet." };
  }
  return {
    ok: true,
    reason: `${snapshot.window.bad} bad checkouts is more than the ${snapshot.window.allowedBad.toFixed(1)} allowed by the 99.5% target in this window.`,
  };
}

export function gradeSloChallenge(snapshot: Snapshot, controls: Controls, verdict: "meet" | "miss" | null): Grade {
  if (Math.abs(controls.target - DEFAULT_TARGET) > 1e-9) {
    return { ok: false, reason: "The stated target is still 99.5%." };
  }
  if (snapshot.window.goodRate === null || snapshot.window.meets === null) {
    return { ok: false, reason: "This window has no checkout samples." };
  }
  const actuallyMeets = meetsTarget(snapshot.window.goodRate, controls.target);
  if (verdict === null) {
    return { ok: false, reason: "Decide whether this window meets the stated target." };
  }
  if (verdict === "meet" && !actuallyMeets) {
    return {
      ok: false,
      reason: `The window is ${(snapshot.window.goodRate * 100).toFixed(1)}% good. That does not meet ${(controls.target * 100).toFixed(1)}%.`,
    };
  }
  if (verdict === "miss" && actuallyMeets) {
    return { ok: false, reason: "This window meets the stated target." };
  }
  return {
    ok: true,
    reason: actuallyMeets
      ? "The measured rate meets the stated target."
      : `The measured rate is ${(snapshot.window.goodRate * 100).toFixed(1)}%. The target is ${(controls.target * 100).toFixed(1)}%. The difference is spent budget, not a rounding allowance.`,
  };
}

export type SceneVerdict = {
  scene: Scene;
  cpu: Snapshot["cpuAlert"]["status"];
  burn: Snapshot["burnAlert"]["status"];
  deservesPage: boolean;
};

export function sceneVerdict(scene: Scene, seed = 7): SceneVerdict {
  const { state, controls } = runScene(scene, seed);
  const snapshot = snapshotSre(state, controls);
  const sustained = scene === "sustained";
  return {
    scene,
    cpu: snapshot.cpuAlert.status,
    burn: snapshot.burnAlert.status,
    deservesPage: sustained,
  };
}

export function gradeAlert(input: {
  controls: Controls;
  choice: "cpu-spike" | "short-spike" | "sustained" | "missing-telemetry" | null;
}): Grade {
  if (input.controls.alert !== "burn") {
    return { ok: false, reason: "A CPU threshold is the alert that pages with no failed checkout." };
  }
  if (input.choice !== "sustained") {
    return { ok: false, reason: "The page belongs on the sustained checkout failure. A CPU spike, a short spike, and missing metrics do not." };
  }
  const sustained = sceneVerdict("sustained");
  const spike = sceneVerdict("cpu-spike");
  const brief = sceneVerdict("short-spike");
  const missing = sceneVerdict("missing-telemetry");
  if (sustained.burn !== "paging" || sustained.cpu === "paging") {
    return { ok: false, reason: "The sustained failure should page the burn alert while CPU stays under 80%." };
  }
  if (spike.cpu !== "paging" || spike.burn === "paging") {
    return { ok: false, reason: "The CPU spike should page only the CPU alert." };
  }
  if (brief.burn === "paging") {
    return { ok: false, reason: "The short spike should trip the short window only." };
  }
  if (missing.burn !== "no-data") {
    return { ok: false, reason: "Missing checkout metrics should leave the burn alert with no samples." };
  }
  return {
    ok: true,
    reason: `The burn-rate alert pages when both windows reach ${PAGE_BURN}. That is the sustained checkout failure, and it is the one that deserves a page.`,
  };
}

export function gradeAlertChallenge(snapshot: Snapshot, decision: "page" | "hold" | null): Grade {
  if (decision === null) return { ok: false, reason: "Decide whether this page matches failing checkouts." };
  const customersFailing = snapshot.burnAlert.status === "paging";
  if (decision === "page" && customersFailing) {
    return { ok: true, reason: "Both burn windows agree. Checkouts are missing the SLO, so the page matches the customer." };
  }
  if (decision === "hold" && !customersFailing) {
    return {
      ok: true,
      reason:
        snapshot.cpuAlert.status === "paging"
          ? "CPU is hot and checkouts are still meeting the SLO. This page does not deserve a wake-up."
          : "The checkout SLO is not burning in both windows, so there is nothing to page.",
    };
  }
  if (decision === "page") {
    return { ok: false, reason: "The checkout SLO is not burning in both windows. Paging here wakes someone for a signal that is not the customer." };
  }
  return { ok: false, reason: "Checkouts are missing the SLO in both windows. This is the page that deserves a person." };
}
