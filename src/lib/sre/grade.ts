import { runScene, snapshotSre, type Snapshot, type TraceView } from "@/lib/sre/engine";
import {
  DEFAULT_TARGET,
  PAGE_BURN,
  meetsTarget,
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
    return { ok: false, reason: `The ${controls.dependencySpan} has no outbound span yet.` };
  }
  if (!controls.instrumentation.traceContext) {
    return { ok: false, reason: `The ${controls.dependencySpan} span is not on this trace.` };
  }
  if (!controls.instrumentation.structuredLogs) {
    return { ok: false, reason: "Structured logs are still off." };
  }
  if (controls.extraLatencyMs < 200) {
    return { ok: false, reason: `Add latency on the ${controls.dependencySpan}, then read the trace.` };
  }
  if (!trace) {
    return { ok: false, reason: "Open a trace from this run." };
  }
  const payment = trace.spans.find((span) => span.name === controls.dependencySpan);
  if (!payment) {
    return { ok: false, reason: `The open trace does not include a linked ${controls.dependencySpan} span.` };
  }
  if (hop !== "payment") {
    return { ok: false, reason: `The extra time is on the ${controls.dependencySpan}, not the ${controls.handlerSpan} itself.` };
  }
  if (payment.ms <= 200) {
    return { ok: false, reason: `That ${controls.dependencySpan} span is not the slow call.` };
  }
  if (!snapshot.httpVisible) {
    return { ok: false, reason: `Metrics for ${controls.workPlural} are hidden, so the trace is not part of the recorded telemetry.` };
  }
  return {
    ok: true,
    reason: `The ${controls.dependencySpan} holds the extra latency, and the log line carries the same trace.`,
  };
}

export function gradeSlo(snapshot: Snapshot, controls: Controls): Grade {
  if (controls.journey !== "checkout") {
    return { ok: false, reason: `The customer journey is the ${controls.workNoun}. A CPU line does not spend this budget.` };
  }
  if (controls.goodWhen !== "both") {
    return { ok: false, reason: `Count a ${controls.workNoun} as good only when it succeeds in under 300 ms.` };
  }
  if (Math.abs(controls.target - DEFAULT_TARGET) > 1e-9) {
    return { ok: false, reason: "Keep the stated target at 99.5%. A looser number is a different SLO." };
  }
  if (snapshot.window.total < 40 || snapshot.window.goodRate === null || snapshot.window.meets === null) {
    return { ok: false, reason: `Run the ${controls.workPlural} until the window has samples.` };
  }
  if (snapshot.window.meets) {
    if (controls.profile === "api") {
      return {
        ok: false,
        reason:
          "The window still meets 99.5%. Raise docs lag or introduce contract mismatches until the budget is spent.",
      };
    }
    return { ok: false, reason: "The window still meets 99.5%. Raise failures until the budget is spent." };
  }
  if ((snapshot.window.spent ?? 0) <= 1) {
    return { ok: false, reason: `Bad ${controls.workPlural} have not used more than the allowed budget yet.` };
  }
  if (controls.profile === "api") {
    const usedLag = controls.docsLagMs >= 400;
    const usedMismatch = controls.contractMismatchRate >= 0.15;
    if (!usedLag && !usedMismatch && controls.errorRate < 0.1) {
      return {
        ok: false,
        reason:
          "Spend the budget with docs lag or contract mismatches so the failure mode is visible on the API path.",
      };
    }
  }
  return {
    ok: true,
    reason: `${snapshot.window.bad} bad ${controls.workPlural} is more than the ${snapshot.window.allowedBad.toFixed(1)} allowed by the 99.5% target in this window.`,
  };
}

export function gradeSloChallenge(snapshot: Snapshot, controls: Controls, verdict: "meet" | "miss" | null): Grade {
  if (Math.abs(controls.target - DEFAULT_TARGET) > 1e-9) {
    return { ok: false, reason: "The stated target is still 99.5%." };
  }
  if (snapshot.window.goodRate === null || snapshot.window.meets === null) {
    return { ok: false, reason: `This window has no ${controls.workPlural}.` };
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

export function sceneVerdict(
  scene: Scene,
  seed = 7,
  base?: Partial<Controls>,
): SceneVerdict {
  const { state, controls } = runScene(scene, seed, base);
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
  choice:
    | "cpu-spike"
    | "warehouse-busy"
    | "late-batches"
    | "short-spike"
    | "sustained"
    | "missing-telemetry"
    | null;
}): Grade {
  const analytics = input.controls.profile === "analytics";
  const hostLabel = analytics ? "warehouse util" : "CPU";
  if (input.controls.alert !== "burn") {
    return {
      ok: false,
      reason: `A ${hostLabel} threshold is the alert that pages with no failed ${input.controls.workNoun}.`,
    };
  }
  if (input.choice === "late-batches") {
    return {
      ok: false,
      reason:
        "Late batches spend the latency line. For this exercise, name the sustained reject storm as the page the burn-rate rule was built to catch.",
    };
  }
  if (input.choice !== "sustained") {
    return {
      ok: false,
      reason: `The page belongs on the sustained ${input.controls.workNoun} failure. A ${hostLabel} spike, a short spike, and missing metrics do not.`,
    };
  }
  const profile = { profile: input.controls.profile } as Partial<Controls>;
  const sustained = sceneVerdict("sustained", 7, profile);
  const spike = sceneVerdict(analytics ? "warehouse-busy" : "cpu-spike", 7, profile);
  const brief = sceneVerdict("short-spike", 7, profile);
  const missing = sceneVerdict("missing-telemetry", 7, profile);
  if (sustained.burn !== "paging" || sustained.cpu === "paging") {
    return {
      ok: false,
      reason: `The sustained failure should page the burn alert while ${hostLabel} stays under 80%.`,
    };
  }
  if (spike.cpu !== "paging" || spike.burn === "paging") {
    return {
      ok: false,
      reason: `The ${hostLabel} spike should page only the ${hostLabel} alert.`,
    };
  }
  if (brief.burn === "paging") {
    return { ok: false, reason: "The short spike should trip the short window only." };
  }
  if (missing.burn !== "no-data") {
    return {
      ok: false,
      reason: `Missing ${input.controls.workNoun} metrics should leave the burn alert with no samples.`,
    };
  }
  return {
    ok: true,
    reason: `The burn-rate alert pages when both windows reach ${PAGE_BURN}. That is the sustained ${input.controls.workNoun} failure, and it is the one that deserves a page.`,
  };
}

export function gradeAlertChallenge(
  snapshot: Snapshot,
  decision: "page" | "hold" | null,
  controls?: Pick<Controls, "profile">,
): Grade {
  if (decision === null) return { ok: false, reason: "Decide whether this page matches a customer who is still failing." };
  const customersFailing = snapshot.burnAlert.status === "paging";
  const hostLabel = controls?.profile === "analytics" ? "Warehouse util" : "CPU";
  if (decision === "page" && customersFailing) {
    return { ok: true, reason: "Both burn windows agree. The SLO is being missed, so the page matches the customer." };
  }
  if (decision === "hold" && !customersFailing) {
    return {
      ok: true,
      reason:
        snapshot.cpuAlert.status === "paging"
          ? `${hostLabel} is hot and the SLO is still being met. This page does not deserve a wake-up.`
          : "The SLO is not burning in both windows, so there is nothing to page.",
    };
  }
  if (decision === "page") {
    return { ok: false, reason: "The SLO is not burning in both windows. Paging here wakes someone for a signal that is not the customer." };
  }
  return { ok: false, reason: "The SLO is being missed in both windows. This is the page that deserves a person." };
}
