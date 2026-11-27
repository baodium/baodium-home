import { readFileSync } from "node:fs";
import { LarderRuntime, LARDER_INCIDENTS, RUTH_CART, TEST_CARD } from "../src/lib/products/larder";
import { cacheKey, NorthlightRuntime, NORTHLIGHT_INCIDENTS, PlaybackSession, type CacheRule } from "../src/lib/products/northlight";
import { PorchRuntime, PORCH_INCIDENTS, POSTS, ROSA_POST } from "../src/lib/products/porch";
import { CHARGE_TESTS, CHARGE_V158, PRICING_TESTS, PRICING_V142, RESERVE_TESTS, RESERVE_V151 } from "../src/lib/products/larder-code";
import { ABR_TESTS, ABR_V380 } from "../src/lib/products/northlight-code";
import { PAGINATE_TESTS, PAGINATE_V31 } from "../src/lib/products/porch-code";
import type { IncidentDef } from "../src/lib/products/types";
import type { LabRuntime } from "../src/lib/products/runtime";
import { ABR_FIX, CHARGE_FIX, PAGINATE_FIX, PRICING_FIX, RESERVE_FIX } from "../e2e/fixtures/product-fixes";

type Row = { title: string; passed: boolean; detail: string };
const workerSource = readFileSync(new URL("../public/workers/product-checks.js", import.meta.url), "utf8");

function runWorker(source: string, exportNames: string[], testSource: string): { compileError?: string; results: Row[] } {
  let reply: { compileError?: string; results: Row[] } | undefined;
  const self: { onmessage?: (event: { data: unknown }) => void; postMessage: (data: never) => void } = {
    postMessage: (data) => {
      reply = data;
    },
  };
  new Function("self", workerSource)(self);
  self.onmessage!({ data: { source, exportNames, testSource } });
  return reply!;
}

let failures = 0;
function expect(condition: unknown, message: string) {
  if (condition) console.log(`  ok   ${message}`);
  else {
    failures += 1;
    console.log(`  FAIL ${message}`);
  }
}

function run(runtime: LabRuntime, seconds: number) {
  for (let i = 0; i < seconds * 4; i++) runtime.advance(250);
}

const PRICING_HALF_FIX = PRICING_V142.replace("Math.floor(", "Math.round(");

function testFile(name: string, broken: string, fixed: string, exports: string[], tests: string, halves: string[] = []) {
  console.log(`\n${name} tests`);
  const before = runWorker(broken, exports, tests);
  expect(!before.compileError && before.results.some((row) => !row.passed), `shipped code fails ${before.results.filter((row) => !row.passed).length} of ${before.results.length}`);
  for (const half of halves) {
    const partial = runWorker(half, exports, tests);
    expect(!partial.compileError && partial.results.some((row) => !row.passed), `half fix still fails: ${partial.results.filter((row) => !row.passed).map((row) => row.title).join("; ")}`);
  }
  const after = runWorker(fixed, exports, tests);
  expect(!after.compileError && after.results.every((row) => row.passed), `fixed code passes ${after.results.filter((row) => row.passed).length} of ${after.results.length}${after.compileError ? ` (${after.compileError})` : ""}`);
  const syntax = runWorker("export function nope( {", exports, tests);
  expect(Boolean(syntax.compileError), "syntax error reported as a compile error");
}

testFile("pricing", PRICING_V142, PRICING_FIX, ["orderTotalCents"], PRICING_TESTS, [PRICING_HALF_FIX]);
testFile("reserve", RESERVE_V151, RESERVE_FIX, ["reserveStock"], RESERVE_TESTS);
testFile("abr", ABR_V380, ABR_FIX, ["chooseRendition"], ABR_TESTS);
testFile("paginate", PAGINATE_V31, PAGINATE_FIX, ["feedPage"], PAGINATE_TESTS);

const CHARGE_NO_RETRY = CHARGE_FIX.replace("const ATTEMPTS = 2;", "const ATTEMPTS = 1;");
const CHARGE_KEY_PER_CALL = CHARGE_FIX.replace('"checkout-" + checkout.id', "processor.newIdempotencyKey()");
const CHARGE_KEY_PER_CARD = CHARGE_FIX.replace('"checkout-" + checkout.id', '"card-" + checkout.card');
expect(CHARGE_NO_RETRY !== CHARGE_FIX && CHARGE_KEY_PER_CALL !== CHARGE_FIX && CHARGE_KEY_PER_CARD !== CHARGE_FIX, "charge half fixes differ from the fix");
testFile("charge", CHARGE_V158, CHARGE_FIX, ["chargeCheckout"], CHARGE_TESTS, [CHARGE_NO_RETRY, CHARGE_KEY_PER_CALL, CHARGE_KEY_PER_CARD]);

{
  console.log("\nLarder: checkout fails for some carts");
  const lab = new LarderRuntime(LARDER_INCIDENTS[0]).boot();
  const success = lab.charts()[0].series[0].points.filter((p) => p.v !== null);
  const early = success.slice(0, 20).map((p) => p.v!);
  const late = success.slice(-20).map((p) => p.v!);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`  success before release ${mean(early).toFixed(1)}%, after ${mean(late).toFixed(1)}%`);
  expect(mean(early) > 99 && mean(late) < 93, "success rate drops at release 142");
  const maya = lab.placeOrder([{ sku: "olive-oil", quantity: 1 }, { sku: "sea-salt", quantity: 1 }], "");
  expect(!maya.ok && maya.code === "amount_mismatch", `Maya's order fails (${maya.code}, sent ${maya.amount}, expected ${maya.expected})`);
  expect(lab.telemetry.logs.some((line) => line.attrs.checkout_id === maya.checkoutId && line.attrs.reason === "amount_mismatch"), "her reference finds the payments log line");
  expect(lab.previewTotal([{ sku: "olive-oil", quantity: 1 }, { sku: "sea-salt", quantity: 1 }], "") === 2924, "cart shows $29.24 before the fix");
  const prior = lab.releases.find((release) => release.version === "141")!;
  lab.rollback(prior.id);
  expect(lab.releases.find((release) => release.state === "live")?.version === "142", "rollback to 141 is refused");
  lab.ship(PRICING_FIX, "Price in integer cents");
  run(lab, 5);
  const again = lab.placeOrder([{ sku: "olive-oil", quantity: 1 }, { sku: "sea-salt", quantity: 1 }], "");
  expect(again.ok, `Maya's order goes through after the fix (${again.orderId})`);
  expect(!lab.checks()[0].done, `mismatch check waits for the window: ${lab.checks()[0].detail}`);
  run(lab, 31);
  expect(lab.checks().every((check) => check.done), `all checks pass: ${lab.checks().map((c) => c.detail).join(" | ")}`);
  expect(Boolean(lab.resolvedAt), "incident resolved");
}

{
  console.log("\nLarder: checkout became slow");
  const lab = new LarderRuntime(LARDER_INCIDENTS[1]).boot();
  const p95 = lab.charts()[0].series[0].points.filter((p) => p.v !== null).map((p) => p.v!);
  console.log(`  p95 early ${Math.round(p95[5])} ms, late ${Math.round(p95[p95.length - 2])} ms`);
  expect(p95[5] < 800 && p95[p95.length - 2] > 1400, "p95 climbs above the objective at release 151");
  const big = ["olive-oil", "sea-salt", "honey", "rigatoni", "coffee", "sardines"].map((sku) => ({ sku, quantity: 1 }));
  const slow = lab.placeOrder(big, "");
  expect(slow.ok && slow.ms > 1400, `six-product order takes ${slow.ms} ms`);
  const trace = lab.telemetry.traces.find((item) => item.attrs.checkout_id === slow.checkoutId)!;
  expect(trace.spans.filter((span) => span.name === "inventory.reserve").length === 6, "trace shows six inventory.reserve spans");
  const v150 = lab.releases.find((release) => release.version === "150")!;
  lab.rollback(v150.id);
  run(lab, 2);
  const fast = lab.placeOrder(big, "");
  expect(fast.ok && fast.ms < 1000, `after rollback the same order takes ${fast.ms} ms`);
  run(lab, 32);
  expect(lab.checks().every((check) => check.done), `rollback path resolves: ${lab.checks().map((c) => c.detail).join(" | ")}`);

  const fix = new LarderRuntime(LARDER_INCIDENTS[1]).boot();
  fix.ship(RESERVE_FIX, "Reserve with reserveMany");
  run(fix, 2);
  const order = fix.placeOrder(big, "");
  expect(order.ms < 1000, `code fix path: six-product order in ${order.ms} ms`);
  run(fix, 32);
  expect(fix.checks().every((check) => check.done), `code fix path resolves: ${fix.checks().map((c) => c.detail).join(" | ")}`);
}

function watch(lab: NorthlightRuntime, network: "broadband" | "fiber", bps: number, metro: "Chicago" | "Frankfurt", seconds: number) {
  const session = lab.session(() => bps, () => metro, () => undefined);
  for (let i = 0; i < seconds * 10; i++) {
    session.step(100);
    if (i % 2 === 0) lab.advance(200);
    lab.reportMine(session, network, metro);
  }
  return session as PlaybackSession;
}

{
  console.log("\nNorthlight: films stall on ordinary connections");
  const lab = new NorthlightRuntime(NORTHLIGHT_INCIDENTS[0]).boot();
  const ratio = lab.charts()[0].series[0].points.filter((p) => p.v !== null).map((p) => p.v!);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`  rebuffering before ${mean(ratio.slice(0, 20)).toFixed(2)}%, after ${mean(ratio.slice(-20)).toFixed(2)}%`);
  expect(mean(ratio.slice(0, 20)) < 1 && mean(ratio.slice(-20)) > 3, "rebuffering jumps at player 3.8.0");
  const before = watch(lab, "broadband", 4_200_000, "Chicago", 30);
  expect(before.stalls >= 2 && before.renditionAt().id === "1080p", `broadband session stalls ${before.stalls} times at ${before.renditionAt().id}`);
  const fiber = watch(lab, "fiber", 25_000_000, "Chicago", 20);
  expect(fiber.stalls === 0, `fiber session does not stall (${fiber.stalls})`);
  lab.ship(ABR_FIX, "Compare in one unit");
  const after = watch(lab, "broadband", 4_200_000, "Chicago", 30);
  expect(after.stalls === 0 && after.renditionAt().id === "720p", `after the fix: ${after.stalls} stalls at ${after.renditionAt().id}`);
  run(lab, 10);
  expect(lab.checks().every((check) => check.done), `all checks pass: ${lab.checks().map((c) => c.detail).join(" | ")}`);
}

{
  console.log("\nNorthlight: Frankfurt viewers stall on fiber");
  const lab = new NorthlightRuntime(NORTHLIGHT_INCIDENTS[1]).boot();
  const byEdge = lab.charts()[0].series;
  const tail = (label: string) => {
    const points = byEdge.find((s) => s.label === label)!.points.filter((p) => p.v !== null).slice(-20).map((p) => p.v!);
    return points.reduce((a, b) => a + b, 0) / Math.max(1, points.length);
  };
  console.log(`  rebuffering fra-2 ${tail("fra-2").toFixed(1)}%, fra-1 ${tail("fra-1").toFixed(2)}%, ord-1 ${tail("ord-1").toFixed(2)}%`);
  expect(tail("fra-2") > 3 && tail("fra-1") < 1, "only fra-2 is unhealthy");
  console.log(`  Frankfurt ratio ${lab.ratio("Frankfurt", 120)?.toFixed(1)}%`);
  const before = watch(lab, "fiber", 25_000_000, "Frankfurt", 30);
  expect(before.stalls >= 1, `Frankfurt fiber session stalls ${before.stalls} times at ${before.renditionAt().id}`);
  lab.drain("fra-2", true);
  const after = watch(lab, "fiber", 25_000_000, "Frankfurt", 25);
  expect(after.stalls === 0 && after.renditionAt().id === "1080p", `after drain: ${after.stalls} stalls at ${after.renditionAt().id}`);
  run(lab, 10);
  expect(lab.checks().every((check) => check.done), `all checks pass: ${lab.checks().map((c) => c.detail).join(" | ")}`);
}

{
  console.log("\nPorch: sign-in canary");
  const lab = new PorchRuntime(PORCH_INCIDENTS[0]).boot();
  const series = lab.charts()[1].series;
  const last = (label: string) => series.find((s) => s.label === label)!.points.filter((p) => p.v !== null).slice(-10).map((p) => p.v!);
  console.log(`  2.13.4 ${last("2.13.4").slice(-1)[0]?.toFixed(0)}%, 2.14.0 ${last("2.14.0").slice(-1)[0]?.toFixed(0)}%`);
  expect(!lab.mySignIn().ok, "your sign-in is bounced");
  lab.setCanary(0);
  expect(lab.mySignIn().ok, "after rollback you sign in");
  run(lab, 32);
  expect(lab.checks().every((check) => check.done), `rollback path resolves: ${lab.checks().map((c) => c.detail).join(" | ")}`);

  const forward = new PorchRuntime(PORCH_INCIDENTS[0]).boot();
  forward.publishKey();
  expect(!forward.mySignIn().ok, "publishing does not help until the cache refreshes");
  run(forward, 31);
  expect(forward.mySignIn().ok, "after the JWKS refresh, the canary signs you in");
  run(forward, 31);
  expect(forward.checks().every((check) => check.done), `fix-forward path resolves: ${forward.checks().map((c) => c.detail).join(" | ")}`);
}

{
  console.log("\nPorch: posts go missing");
  const lab = new PorchRuntime(PORCH_INCIDENTS[1]).boot();
  const scroll = () => {
    const ids: string[] = [];
    let cursor: unknown = null;
    for (let i = 0; i < 10; i++) {
      const page = lab.feedPage(cursor);
      ids.push(...page.items.map((post) => post.id));
      cursor = page.nextCursor;
      if (!cursor) break;
    }
    return ids;
  };
  const before = scroll();
  expect(!before.includes(ROSA_POST) && before.length < POSTS.length, `feed shows ${before.length} of ${POSTS.length}, without Rosa's post`);
  lab.ship(PAGINATE_FIX, "Tie-break the cursor on id");
  const after = scroll();
  expect(after.length === POSTS.length && after.includes(ROSA_POST), `feed shows ${after.length} of ${POSTS.length}, with Rosa's post`);
  run(lab, 45);
  expect(lab.checks().every((check) => check.done), `all checks pass: ${lab.checks().map((c) => c.detail).join(" | ")}`);
}

const byId = (incidents: IncidentDef[], id: string) => incidents.find((incident) => incident.id === id)!;
const status = (runtime: LabRuntime) => runtime.checks().map((check) => `${check.done ? "ok" : "no"} ${check.detail}`).join(" | ");
const check = (runtime: LabRuntime, id: string) => runtime.checks().find((item) => item.id === id)!;
const recent = (runtime: LabRuntime, chart: string, series = 0, count = 3) => {
  const points = runtime.charts().find((item) => item.id === chart)!.series[series].points.filter((point) => point.v !== null).slice(-count);
  return points.reduce((sum, point) => sum + point.v!, 0) / Math.max(1, points.length);
};

{
  console.log("\nLarder: some customers were charged twice");
  const incident = byId(LARDER_INCIDENTS, "double-charge");
  const lab = new LarderRuntime(incident).boot();
  const extra = lab.charts()[1].series[0].points.map((point) => point.v ?? 0);
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  expect(total(extra.slice(0, 15)) === 0 && total(extra.slice(-15)) > 30, `duplicate charges appear only after release 158 (${total(extra.slice(-15)).toFixed(0)} in the last 15 buckets)`);
  expect(lab.ruthOrder?.ok && lab.ruthOrder.chargeIds.length === 2, `Ruth's order ${lab.ruthOrder?.orderId} carries ${lab.ruthOrder?.chargeIds.length} charges`);
  const broken = lab.placeOrder(RUTH_CART, "", TEST_CARD);
  expect(!broken.ok && broken.chargeIds.length === 2, `test card checkout fails with ${broken.chargeIds.length} charges taken (${broken.code})`);

  const rollback = new LarderRuntime(incident).boot();
  rollback.rollback(rollback.releases.find((release) => release.version === "157")!.id);
  const afterRollback = rollback.placeOrder(RUTH_CART, "", TEST_CARD);
  expect(!afterRollback.ok && afterRollback.chargeIds.length === 1, `rollback to 157 takes one charge but still fails the checkout (${afterRollback.code})`);
  run(rollback, 40);
  expect(!rollback.checks().every((item) => item.done), `rollback alone does not resolve: ${status(rollback)}`);

  lab.ship(CHARGE_FIX, "Reuse one idempotency key per checkout");
  const fixed = lab.placeOrder(RUTH_CART, "", TEST_CARD);
  expect(fixed.ok && fixed.chargeIds.length === 1, `after the fix the test card checkout succeeds with one charge (${fixed.orderId})`);
  run(lab, 5);
  expect(lab.outstanding().count > 0 && !check(lab, "refunds").done, `the code fix alone leaves ${lab.outstanding().count} extra charges to refund`);
  lab.refundExtras();
  run(lab, 5);
  lab.refundExtras();
  run(lab, 31);
  expect(lab.checks().every((item) => item.done), `fix and refunds resolve: ${status(lab)}`);
  expect(Boolean(lab.resolvedAt), "incident resolved");
}

{
  console.log("\nNorthlight: films take seconds to start and some fail");
  const incident = byId(NORTHLIGHT_INCIDENTS, "cache-key");
  const vod: CacheRule = { path: "/vod/*", key: "path", ttl: 604_800 };
  const all: CacheRule = { path: "/*", key: "path", ttl: 3600 };
  const play = (lab: NorthlightRuntime, report: boolean) => {
    const session = lab.session(() => 4_200_000, () => "Chicago", () => undefined, "night-market");
    for (let i = 0; i < 48; i++) {
      session.step(250);
      if (i % 4 === 3) lab.advance(1000);
      if (report) lab.reportMine(session, "broadband", "Chicago");
    }
    return session;
  };
  const scenario = (rules: CacheRule[] | "rollback-player") => {
    const lab = new NorthlightRuntime(incident).boot();
    if (rules === "rollback-player") lab.rollback("web-player-3.8.1");
    else lab.deployRules(rules);
    run(lab, 75);
    play(lab, true);
    return lab;
  };

  const lab = new NorthlightRuntime(incident).boot();
  console.log(`  hit ratio ${recent(lab, "hit-ratio").toFixed(1)}%, origin ${recent(lab, "origin").toFixed(1)}/s, start p95 ${Math.round(recent(lab, "startup"))} ms, failed ${recent(lab, "failed").toFixed(1)}%`);
  expect(recent(lab, "hit-ratio") < 10 && recent(lab, "origin") > 6, "cache misses send origin past its capacity");
  expect(recent(lab, "startup") > 2000 && recent(lab, "failed") > 2, "starts are slow and some fail");
  expect(cacheKey(lab.rules, "/vod/night-market/720p/seg_00041.m4s?sid=4be07a").key?.includes("sid="), "film segment keys carry the session id under rules r91");
  const mine = play(lab, false);
  expect(mine.error === "NL-503" || mine.startupMs > 2000, `your film start is slow or fails (${mine.error ?? `${Math.round(mine.startupMs)} ms`})`);

  const scoped = scenario([{ path: "/live/*", key: "query", ttl: 10 }, vod, all]);
  expect(scoped.checks().every((item) => item.done) && Boolean(scoped.resolvedAt), `scoping the 10 s rule to /live/* resolves: ${status(scoped)}`);
  const below = scenario([vod, { path: "/*", key: "query", ttl: 10 }, all]);
  expect(below.checks().every((item) => item.done), `moving the rule below /vod/* resolves: ${status(below)}`);
  const pathOnly = scenario([{ path: "/*", key: "path", ttl: 10 }, vod, all]);
  expect(!check(pathOnly, "live").done, `a path-only key shares live segments between viewers: ${check(pathOnly, "live").detail}`);
  const deleted = scenario([vod, all]);
  expect(!check(deleted, "live").done, `deleting the rule caches live segments by path: ${check(deleted, "live").detail}`);
  const bypass = scenario([{ path: "/*", key: "bypass", ttl: 10 }, vod, all]);
  expect(!check(bypass, "start").done, `bypassing the cache for everything keeps starts slow: ${check(bypass, "start").detail}`);
  const token = scenario([{ path: "/*", key: "token", ttl: 10 }, vod, all]);
  expect(!check(token, "start").done, `a token key with a 10 s TTL keeps origin overloaded: ${check(token, "start").detail}`);
  const player = scenario("rollback-player");
  expect(!check(player, "start").done, `rolling back the player leaves the 10 s TTL in place: ${check(player, "start").detail}`);
}

{
  console.log("\nPorch: a gas leak warning never reached the neighbors");
  const incident = byId(PORCH_INCIDENTS, "slow-posts");
  const scenario = (change: (lab: PorchRuntime) => void) => {
    const lab = new PorchRuntime(incident).boot();
    change(lab);
    run(lab, 5);
    lab.post("theo", "Testing delivery from Theo");
    run(lab, 60);
    return lab;
  };
  const lab = new PorchRuntime(incident).boot();
  console.log(`  partition 3 lag ${Math.round(recent(lab, "lag"))} s, others ${Math.round(recent(lab, "lag", 1))} s`);
  expect(recent(lab, "lag") > 300 && recent(lab, "lag", 1) < 60, "only partition 3 lags");
  const june = lab.timeline("june").slice(0, 8);
  expect(!june.some((item) => item.kind === "post" && item.post.id === "p_0443"), "Hal's warning is not in June's feed yet");

  for (const [label, change] of [
    ["16 consumers", (rt: PorchRuntime) => rt.setConsumers(16)],
    ["pausing the import", (rt: PorchRuntime) => rt.setImportPaused(true)],
    ["fan-out on read over 100,000", (rt: PorchRuntime) => rt.setReadThreshold(100_000)],
  ] as const) {
    const attempt = scenario(change);
    expect(!check(attempt, "late").done, `${label} leaves partition 3 behind: ${check(attempt, "late").detail}`);
  }
  const tooLow = scenario((rt) => rt.setReadThreshold(1_000));
  expect(!check(tooLow, "reads").done, `fan-out on read over 1,000 slows feed reads: ${check(tooLow, "reads").detail}`);
  for (const threshold of [25_000, 10_000]) {
    const fixed = scenario((rt) => rt.setReadThreshold(threshold));
    expect(fixed.checks().every((item) => item.done) && Boolean(fixed.resolvedAt), `fan-out on read over ${threshold.toLocaleString("en-US")} resolves: ${status(fixed)}`);
  }
  const rolledBack = scenario((rt) => rt.rollback("feed-fanout-5.1.4"));
  expect(!check(rolledBack, "late").done, `rolling back to 5.1.4 leaves queued posts waiting: ${check(rolledBack, "late").detail}`);
}

console.log(failures ? `\n${failures} failed` : "\nAll product lab checks passed");
process.exit(failures ? 1 : 0);
