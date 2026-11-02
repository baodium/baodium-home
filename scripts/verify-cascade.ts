import { createEngine, advanceEngine, tick, POOL_SIZE } from "../src/lib/experience/engine";
import {
  attachCascade,
  cascadeView,
  gradeCascade,
  healthyControls,
  incidentControls,
  mitigationControls,
  setCascadeControls,
  PROVIDER_SLOTS,
} from "../src/lib/experience/cascade";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function run(engine: ReturnType<typeof createEngine>, seconds: number) {
  advanceEngine(engine, seconds, 0.01);
  return cascadeView(engine.cascade!, engine.t);
}

// Chapter 1 path is unchanged when cascade is off.
{
  const engine = createEngine(42, {
    arrivalRate: 80,
    exposurePct: 100,
    featureEnabled: true,
    recLookupSec: 0.07,
  });
  assert(engine.cascade === null, "chapter 1 engine starts without a cascade");
  let busy = 0;
  for (let i = 0; i < 400; i++) busy = Math.max(busy, tick(engine, 0.01).activeCount);
  assert(busy > 0 && busy <= POOL_SIZE, `chapter 1 pool stays within 40, saw ${busy}`);
}

// Healthy checkout: one provider call, success, slots quiet.
{
  const engine = createEngine(42);
  attachCascade(engine, healthyControls());
  const view = run(engine, 8);
  assert(view.successRate != null && view.successRate > 0.98, `healthy success ${view.successRate}`);
  assert(view.attemptsPerCheckout < 1.2, `healthy attempts ${view.attemptsPerCheckout}`);
  assert(view.providerUtilization < 0.5, `healthy util ${view.providerUtilization}`);
  assert(view.providerUtilization <= 1, "utilization cannot exceed 1");
  const trace = view.traces.find((item) => item.outcome === "ok");
  assert(Boolean(trace), "healthy trace exists");
  const services = new Set(trace!.spans.map((span) => span.service));
  for (const service of ["gateway", "checkout", "payment", "provider"]) {
    assert(services.has(service as "gateway"), `trace missing ${service}`);
  }
  const providerSpans = trace!.spans.filter((span) => span.service === "provider");
  assert(providerSpans.length === 1, `healthy trace provider spans ${providerSpans.length}`);
  const log = view.logs.find((entry) => entry.traceId === trace!.traceId);
  const timeline = view.timeline.find((entry) => entry.traceId === trace!.traceId);
  assert(Boolean(log && timeline), "log and timeline share the trace");
  assert(view.samples.length > 4, "samples come from the same run");
}

// Incident amplifies. Mitigation on the same engine recovers.
{
  const engine = createEngine(7);
  attachCascade(engine, incidentControls());
  const bad = run(engine, 8);
  assert(bad.successRate != null && bad.successRate < 0.15, `incident success ${bad.successRate}`);
  assert(bad.attemptsPerCheckout > 2.5, `incident attempts ${bad.attemptsPerCheckout}`);
  assert(bad.providerUtilization > 0.99 && bad.providerUtilization <= 1, `incident util ${bad.providerUtilization}`);
  assert(bad.demonstratedAmplification, "incident is visible to the grader");
  assert(engine.cascade!.demonstratedAmplification, "flag lives on the engine state");
  const trace = bad.traces.find((item) => item.providerAttempts > 1);
  assert(Boolean(trace), "a trace shows more than one provider attempt");
  const kept = bad.timeline.some((entry) => entry.message.includes("kept the slot"));
  assert(kept, "timeline records a slot kept after timeout");

  const timeoutOnly = { ...incidentControls(), attemptTimeoutMs: 1100 };
  setCascadeControls(engine.cascade!, timeoutOnly);
  const raised = run(engine, 10);
  const raisedGrade = gradeCascade(raised, { mode: "challenge", demonstrated: true });
  assert(raisedGrade.ok, `timeout above provider work should recover: ${raisedGrade.reason}`);

  const engine2 = createEngine(7);
  attachCascade(engine2, incidentControls());
  run(engine2, 8);
  setCascadeControls(engine2.cascade!, mitigationControls());
  const good = run(engine2, 10);
  console.log(
    "mitigation",
    JSON.stringify({
      success: good.successRate,
      attempts: good.attemptsPerCheckout,
      util: good.providerUtilization,
      okPerSec: good.okPerSec,
      p99: good.gatewayP99Ms,
      providerMs: good.measuredProviderMs,
    }),
  );
  const grade = gradeCascade(good, { mode: "practice", demonstrated: engine2.cascade!.demonstratedAmplification });
  assert(grade.ok, grade.reason);
  assert(good.providerSlots === PROVIDER_SLOTS, "slot count is the model capacity");
}

// Short timeout and no retries stops the storm and still fails the customer.
{
  const engine = createEngine(9);
  attachCascade(engine, incidentControls());
  run(engine, 6);
  setCascadeControls(engine.cascade!, {
    ...incidentControls(),
    maxRetries: 0,
    cancelInFlight: true,
    propagateDeadline: true,
  });
  const view = run(engine, 8);
  console.log(
    "retries-off",
    JSON.stringify({
      success: view.successRate,
      attempts: view.attemptsPerCheckout,
      util: view.providerUtilization,
    }),
  );
  const grade = gradeCascade(view, { mode: "challenge", demonstrated: true });
  assert(!grade.ok, `short timeout should still fail customers: ${grade.reason}`);
  assert(view.attemptsPerCheckout < 1.25, `retries off attempts ${view.attemptsPerCheckout}`);
}

// Same seed, same outcome.
{
  const a = createEngine(11);
  const b = createEngine(11);
  attachCascade(a, incidentControls());
  attachCascade(b, incidentControls());
  const left = run(a, 5);
  const right = run(b, 5);
  assert(left.finished === right.finished, "finished count repeats");
  assert(left.traces[0]?.traceId === right.traces[0]?.traceId, "trace ids repeat");
  assert(
    left.traces[0]?.spans[0]?.workMs === right.traces[0]?.spans[0]?.workMs,
    "provider work repeats",
  );
}

console.log("cascade ok");
