import { snapshotSre, loadCheckoutWindow, runScene, runSre, createSreEngine } from "../src/lib/sre/engine";
import { gradeAlert, gradeAlertChallenge, gradeInstrument, gradeSlo, gradeSloChallenge } from "../src/lib/sre/grade";
import { defaultControls, meetsTarget } from "../src/lib/sre/model";
import { utilization, utilizationPercent } from "../src/lib/sim/bounds";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

assert(meetsTarget(0.995, 0.995), "99.5% should meet a 99.5% target");
assert(meetsTarget(0.996, 0.995), "a rate above the target should meet it");
assert(!meetsTarget(0.983, 0.995), "98.3% must not meet a 99.5% target");
assert(!meetsTarget(0.994, 0.995), "99.4% must not meet a 99.5% target");

{
  const loaded = loadCheckoutWindow(7, { total: 1000, bad: 17 });
  const controls = defaultControls({ target: 0.995, journey: "checkout", goodWhen: "both" });
  const snap = snapshotSre(loaded, controls);
  assert(snap.window.total === 1000, `expected 1000 checkouts, got ${snap.window.total}`);
  assert(snap.window.bad === 17, `expected 17 bad, got ${snap.window.bad}`);
  assert(snap.window.goodRate !== null && Math.abs(snap.window.goodRate - 0.983) < 1e-9, "good rate should be 98.3%");
  assert(snap.window.meets === false, "98.3% window must miss 99.5%");
  assert(Math.abs(snap.window.allowedBad - 5) < 1e-9, `allowed bad should be 5, got ${snap.window.allowedBad}`);
  assert(gradeSloChallenge(snap, controls, "meet").ok === false, "calling 98.3% a pass should fail");
  assert(gradeSloChallenge(snap, controls, "miss").ok === true, "marking the miss should pass");
  assert(gradeSloChallenge(snap, { ...controls, target: 0.983 }, "meet").ok === false, "loosening the target should not pass");
}

{
  const healthy = runScene("healthy", 3);
  const again = runScene("healthy", 3);
  assert(
    healthy.state.requests.map((request) => request.checkoutMs).join() ===
      again.state.requests.map((request) => request.checkoutMs).join(),
    "same seed diverged",
  );
  const other = runScene("healthy", 4);
  assert(
    healthy.state.requests.map((request) => request.paymentMs).join() !==
      other.state.requests.map((request) => request.paymentMs).join(),
    "different seeds matched",
  );
}

{
  const slow = runScene("slow-payment", 9, {
    instrumentation: { httpMetrics: true, outboundSpan: true, traceContext: true, structuredLogs: true },
  });
  const hidden = snapshotSre(slow.state, { ...slow.controls, instrumentation: { ...slow.controls.instrumentation, httpMetrics: false } });
  assert(hidden.window.total === 0, "metrics off should hide the window");
  assert(hidden.burnAlert.status === "no-data", "metrics off should not look healthy");
  const visible = snapshotSre(slow.state, slow.controls);
  const trace = visible.traces[0];
  assert(trace, "slow payment should leave a trace");
  const payment = trace.spans.find((span) => span.name === "payment charge");
  assert(payment && payment.ms > 200, "payment span should hold the injected latency");
  assert(visible.logs[0]?.line.includes(trace.traceId), "log should carry the trace id");
  assert(
    gradeInstrument({ controls: slow.controls, snapshot: visible, trace, hop: "payment" }).ok,
    "instrument grade should pass when the payment hop is named",
  );
  assert(
    !gradeInstrument({ controls: slow.controls, snapshot: visible, trace, hop: "checkout" }).ok,
    "naming the checkout handler should fail",
  );
}

{
  let state = createSreEngine(1);
  const controls = defaultControls({ errorRate: 0.2, timeoutMs: 300, arrivalRate: 10, target: 0.995 });
  state = runSre(state, controls, 20);
  const snap = snapshotSre(state, controls);
  assert(gradeSlo(snap, controls).ok, `budget should be spent: ${JSON.stringify(snap.window)}`);
  assert(utilization(40, 40) === 1, "full pool is 100%");
  assert(utilization(80, 40) === 1, "offered overflow must not raise utilization past 1");
  assert(utilizationPercent(80, 40) === 100, "utilization label must stay at 100");
}

{
  const cpu = runScene("cpu-spike", 7);
  const cpuSnap = snapshotSre(cpu.state, cpu.controls);
  assert(cpuSnap.cpuAlert.status === "paging", "CPU spike should page the CPU alert");
  assert(cpuSnap.burnAlert.status !== "paging", "CPU spike should not page the burn alert");
  assert(cpuSnap.window.meets === true, "CPU spike should leave checkouts inside the SLO");

  const brief = runScene("short-spike", 7);
  const briefSnap = snapshotSre(brief.state, brief.controls);
  assert(briefSnap.shortBurn.hot, `short window should burn, got ${briefSnap.shortBurn.burn}`);
  assert(!briefSnap.longBurn.hot, `long window should stay cool, got ${briefSnap.longBurn.burn}`);
  assert(briefSnap.burnAlert.status === "quiet", "short spike must not page");

  const sustained = runScene("sustained", 7);
  const sustainedSnap = snapshotSre(sustained.state, sustained.controls);
  assert(sustainedSnap.burnAlert.status === "paging", "sustained failure should page");
  assert(sustainedSnap.cpuAlert.status === "quiet", "sustained failure should leave CPU quiet");
  assert(gradeAlertChallenge(sustainedSnap, "page").ok, "paging the sustained failure is correct");
  assert(!gradeAlertChallenge(sustainedSnap, "hold").ok, "ignoring the sustained failure should fail");
  assert(gradeAlertChallenge(cpuSnap, "hold").ok, "holding the CPU page is correct");
  assert(!gradeAlertChallenge(cpuSnap, "page").ok, "paging the CPU spike should fail");

  const missing = runScene("missing-telemetry", 7);
  const missingSnap = snapshotSre(missing.state, missing.controls);
  assert(missingSnap.burnAlert.status === "no-data", "missing metrics should not evaluate as healthy");
  assert(missingSnap.window.goodRate === null, "missing metrics should not report a good rate");
  assert(missing.state.requests.some((request) => request.bad), "the checkout is still failing while metrics are hidden");

  assert(
    gradeAlert({ controls: defaultControls({ alert: "burn" }), choice: "sustained" }).ok,
    "choosing the sustained failure should pass",
  );
  assert(
    !gradeAlert({ controls: defaultControls({ alert: "cpu" }), choice: "sustained" }).ok,
    "a CPU alert should not pass the page lab",
  );
  assert(
    !gradeAlert({ controls: defaultControls({ alert: "burn" }), choice: "cpu-spike" }).ok,
    "the CPU spike does not deserve a page",
  );
}

console.log(JSON.stringify({ ok: true, labs: ["instrument", "slo", "alert"] }));
