/**
 * The listing a lab or drill is executing.
 * Numbers and branches are the same controls the graph and the metrics read.
 * The cursor walks only the lines this configuration actually runs.
 */

export type NumberEdit = {
  id: string;
  kind: "number";
  value: number;
  min: number;
  max: number;
  step: number;
  locked?: boolean;
};

export type BoolEdit = {
  id: string;
  kind: "bool";
  value: boolean;
  onLabel: string;
  offLabel: string;
  locked?: boolean;
};

export type ChoiceEdit = {
  id: string;
  kind: "choice";
  value: string;
  options: { value: string; label: string }[];
  locked?: boolean;
};

export type RunEdit = NumberEdit | BoolEdit | ChoiceEdit;
export type RunSpan = { text: string } | { edit: RunEdit };

export type RunLine = {
  spans: RunSpan[];
  runs: boolean;
  walk: boolean;
  select?: { id: string; value: boolean | string };
};

export type RunTrace = { label: string; detail: string };

export type RunningProgram = {
  title: string;
  lines: RunLine[];
  trace: RunTrace[];
  hotLine: number;
  hotTrace: number;
};

type Metrics = Record<string, number>;
type Controls = Record<string, number | boolean | string>;

function n(controls: Controls, id: string, fallback = 0): number {
  const value = controls[id];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function on(controls: Controls, id: string): boolean {
  return controls[id] === true;
}

function pick(controls: Controls, id: string, fallback = ""): string {
  const value = controls[id];
  return typeof value === "string" ? value : fallback;
}

function text(value: string): RunSpan {
  return { text: value };
}

function numEdit(
  id: string,
  value: number,
  min: number,
  max: number,
  step: number,
  locked: string[],
): RunSpan {
  return { edit: { id, kind: "number", value, min, max, step, locked: locked.includes(id) } };
}

function boolEdit(
  id: string,
  value: boolean,
  onLabel: string,
  offLabel: string,
  locked: string[],
): RunSpan {
  return { edit: { id, kind: "bool", value, onLabel, offLabel, locked: locked.includes(id) } };
}

function choiceEdit(
  id: string,
  value: string,
  options: { value: string; label: string }[],
  locked: string[],
): RunSpan {
  return { edit: { id, kind: "choice", value, options, locked: locked.includes(id) } };
}

function line(spans: RunSpan[], runs: boolean, walk = false, select?: RunLine["select"]): RunLine {
  return { spans, runs, walk: walk && runs, select: runs ? undefined : select };
}

function light(title: string, lines: RunLine[], trace: RunTrace[], elapsed: number, reduced: boolean): RunningProgram {
  void elapsed;
  void reduced;
  const walking = lines
    .map((entry, index) => (entry.walk && entry.runs ? index : -1))
    .filter((index) => index >= 0);
  const hotLine = walking.length ? (walking[walking.length - 1] ?? -1) : -1;
  const hotTrace = trace.length ? trace.length - 1 : -1;
  return { title, lines, trace, hotLine, hotTrace };
}

function metric(metrics: Metrics, id: string, digits = 0): string {
  const value = metrics[id];
  const shown = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return shown.toFixed(digits);
}

export function buildLabProgram(
  slug: string,
  controls: Controls,
  metrics: Metrics,
  elapsed: number,
  reduced: boolean,
  locked: string[] = [],
): RunningProgram {
  if (slug === "chapter-2") return chapter2(controls, metrics, elapsed, reduced, locked);
  if (slug === "chapter-4") return fraudProgram(fraudFrom(controls, metrics), elapsed, reduced, locked);
  if (slug === "chapter-5") return metadataProgram(metaFrom(controls, metrics), elapsed, reduced, locked);
  if (slug === "chapter-7") return chapter7(controls, metrics, elapsed, reduced, locked);
  if (slug === "chapter-12") return chapter12(controls, metrics, elapsed, reduced, locked);
  return chapter14(controls, metrics, elapsed, reduced, locked);
}

function chapter2(
  controls: Controls,
  metrics: Metrics,
  elapsed: number,
  reduced: boolean,
  locked: string[],
): RunningProgram {
  const hold = on(controls, "holdDuringBuild");
  const query = n(controls, "queryMs", 70);
  const payload = n(controls, "payloadMs", 0);
  const lines: RunLine[] = [
    line([
      text("# lookups/s = "),
      numEdit("lookupsPerSec", n(controls, "lookupsPerSec", 400), 100, 560, 10, locked),
      text("  query_ms = "),
      numEdit("queryMs", query, 10, 120, 5, locked),
      text("  payload_ms = "),
      numEdit("payloadMs", payload, 0, 80, 5, locked),
      text("  pool = 40"),
    ], true),
    line([text("hold_during_build = "), boolEdit("holdDuringBuild", hold, "True", "False", locked)], true),
    line([text("with pool.acquire() as conn:")], hold, true, { id: "holdDuringBuild", value: true }),
    line([text("    payload = build_payload(request)")], hold, true),
    line([text("    result = query_database(conn, payload)")], hold, true),
    line([text("payload = build_payload(request)")], !hold, true, { id: "holdDuringBuild", value: false }),
    line([text("with pool.acquire() as conn:")], !hold, true),
    line([text("    result = query_database(conn, payload)")], !hold, true),
  ];
  const trace: RunTrace[] = hold
    ? [
        { label: "Acquire", detail: `Pending ${metric(metrics, "pending")} on a pool of 40` },
        { label: "build_payload", detail: `${payload.toFixed(0)} ms while the connection is held` },
        { label: "Query", detail: `${query.toFixed(0)} ms. Average ${metric(metrics, "predicted", 1)} of 40` },
      ]
    : [
        { label: "build_payload", detail: `${payload.toFixed(0)} ms before the connection is taken` },
        { label: "Acquire", detail: `Pending ${metric(metrics, "pending")}. Occupancy ${metric(metrics, "occupancyMs")} ms` },
        { label: "Query", detail: `${query.toFixed(0)} ms. Average ${metric(metrics, "predicted", 1)} of 40` },
      ];
  return light("pool.acquire", lines, trace, elapsed, reduced);
}

type FraudInput = {
  providerMs: number;
  remainingMs: number;
  reserveMs: number;
  permit: boolean;
  cancel: boolean;
  callerMs: number;
  orphanMs: number;
  childMs: number;
  admitted: boolean;
};

function fraudFrom(controls: Controls, metrics: Metrics): FraudInput {
  return {
    providerMs: n(controls, "providerMs", 80),
    remainingMs: n(controls, "remainingMs", 800),
    reserveMs: n(controls, "reserveMs", 50),
    permit: on(controls, "permit"),
    cancel: on(controls, "cancel"),
    callerMs: n(metrics, "callerMs"),
    orphanMs: n(metrics, "orphanMs"),
    childMs: n(metrics, "childMs"),
    admitted: n(metrics, "admitted") >= 1,
  };
}

export function fraudProgram(input: FraudInput, elapsed: number, reduced: boolean, locked: string[] = []): RunningProgram {
  const admitted = input.admitted;
  const lines: RunLine[] = [
    line([
      text("# remaining_ms = "),
      numEdit("remainingMs", input.remainingMs, 100, 1500, 20, locked),
      text("  provider_ms = "),
      numEdit("providerMs", input.providerMs, 20, 1200, 20, locked),
    ], true),
    line([text("def reserve_fraud_call(request):")], true, true),
    line([text("    deadline = request.child_deadline(")], true, true),
    line([text("        maximum_ms=1000,")], true, true),
    line([
      text("        reserve_ms="),
      numEdit("reserveMs", input.reserveMs, 0, 400, 10, locked),
      text(","),
    ], true, true),
    line([text("    )")], true),
    line([text("    if not deadline.can_start_call():")], !admitted, true),
    line([text("        return deadline, None")], !admitted, true),
    line([
      text("    permit = "),
      boolEdit("permit", input.permit, "outbound_fraud_slots.try_acquire()", "None", locked),
    ], admitted, true),
    line([text("def evaluate_risk(assessment, request, permit, deadline):")], admitted, true),
    line([text("    with permit:")], admitted, true),
    line([
      text("        cancellation="),
      boolEdit("cancel", input.cancel, "request.cancellation", "None", locked),
    ], admitted, true),
  ];
  const trace: RunTrace[] = admitted
    ? [
        { label: "Child deadline", detail: `${input.childMs.toFixed(0)} ms, capped at 1000` },
        { label: "Caller", detail: `${input.callerMs.toFixed(0)} ms of ${input.remainingMs.toFixed(0)} left` },
        {
          label: "Provider",
          detail:
            input.orphanMs > 0
              ? `Still running ${input.orphanMs.toFixed(0)} ms`
              : input.cancel
                ? `${input.providerMs.toFixed(0)} ms, and cancellation stopped the rest`
                : `${input.providerMs.toFixed(0)} ms, inside the child deadline`,
        },
      ]
    : [
        { label: "Child deadline", detail: `${input.childMs.toFixed(0)} ms` },
        { label: "Deferred", detail: "The call does not start. The provider is idle." },
      ];
  return light("reserve_fraud_call", lines, trace, elapsed, reduced);
}

type MetaInput = {
  readers: number;
  fresh: boolean;
  singleflight: boolean;
  permit: boolean;
  origin: number;
  unavailable: number;
};

function metaFrom(controls: Controls, metrics: Metrics): MetaInput {
  return {
    readers: n(controls, "readers", 40),
    fresh: on(controls, "fresh"),
    singleflight: on(controls, "singleflight"),
    permit: on(controls, "permit"),
    origin: n(metrics, "origin"),
    unavailable: n(metrics, "unavailable"),
  };
}

export function metadataProgram(input: MetaInput, elapsed: number, reduced: boolean, locked: string[] = []): RunningProgram {
  const fresh = input.fresh;
  const miss = !fresh;
  const shared = miss && input.singleflight;
  const direct = miss && !input.singleflight && input.permit;
  const lines: RunLine[] = [
    line([
      text("# readers = "),
      numEdit("readers", input.readers, 1, 120, 1, locked),
      text("  ttl_seconds = 300"),
    ], true),
    line([text("def get_product_metadata(product_id):")], true, true),
    line([text('    key = f"product-metadata:v1:{product_id}"')], true, true),
    line([text("    cached = cache.get(key)")], true, true),
    line([
      text("    fresh = "),
      boolEdit("fresh", fresh, "True", "False", locked),
    ], true, true),
    line([text("    if cached is not None:")], fresh, true),
    line([text("        return decode(cached)")], fresh, true),
    line([text("    product = catalog_db.fetch_metadata(product_id)")], direct, true),
    line([text("    cache.set(key, encode(product), ttl_seconds=300)")], direct, true),
    line([text("def get_metadata(key, request):")], shared || (miss && !input.permit), true),
    line([
      text("    loader = "),
      boolEdit("singleflight", input.singleflight, "singleflight.run", "each reader", locked),
    ], miss, true),
    line([
      text("    permit = "),
      boolEdit("permit", input.permit, "source_reads.try_acquire()", "None", locked),
    ], miss, true),
  ];
  const trace: RunTrace[] = fresh
    ? [
        { label: "Cache", detail: "product-metadata:v1 is inside its 300 second TTL" },
        { label: "Catalog", detail: "0 reads" },
      ]
    : [
        { label: "Miss", detail: `${input.readers.toFixed(0)} readers on one key` },
        {
          label: "Catalog",
          detail: input.permit
            ? `${input.origin.toFixed(0)} reads`
            : `${input.unavailable.toFixed(0)} unavailable, source_read_limit`,
        },
      ];
  return light("get_product_metadata", lines, trace, elapsed, reduced);
}

function chapter7(
  controls: Controls,
  metrics: Metrics,
  elapsed: number,
  reduced: boolean,
  locked: string[],
): RunningProgram {
  const route = pick(controls, "route", "replica");
  const router = route === "router";
  const lines: RunLine[] = [
    line([
      text("# lag_ms = "),
      numEdit("lagMs", n(controls, "lagMs", 400), 0, 2000, 20, locked),
      text("  available = "),
      boolEdit("replicaAvailable", on(controls, "replicaAvailable"), "True", "False", locked),
      text("  sample_is_current = "),
      boolEdit("sampleCurrent", on(controls, "sampleCurrent"), "True", "False", locked),
    ], true),
    line([
      text("target = "),
      choiceEdit(
        "route",
        route,
        [
          { value: "replica", label: "replica.read()" },
          { value: "router", label: "choose_read_target(...)" },
        ],
        locked,
      ),
    ], true, true),
    line([text("def choose_read_target(policy, observations, request):")], router, true, { id: "route", value: "router" }),
    line([text("    candidates = [replica for replica in observations.replicas")], router, true),
    line([text("        if replica.available")], router, true),
    line([text("        and replica.sample_is_current()")], router, true),
    line([text("        and policy.accepts(replica)]")], router, true),
    line([text("    if candidates:")], router, true),
    line([text("        return replica_admission.try_choose(candidates, deadline=request.deadline)")], router, true),
    line([
      text("    if policy.allow_primary_fallback:  "),
      boolEdit("allowPrimaryFallback", on(controls, "allowPrimaryFallback"), "True", "False", locked),
    ], router, true),
    line([text("        return primary_fallback.try_admit(deadline=request.deadline)")], router && on(controls, "allowPrimaryFallback"), true),
    line([text("    raise ReadTemporarilyUnavailable()")], router && !on(controls, "allowPrimaryFallback"), true),
  ];
  const unavailable = n(metrics, "unavailable") >= 1;
  const primary = n(metrics, "primaryPct") >= 50;
  const trace: RunTrace[] = [
    { label: "Lag", detail: `${metric(metrics, "lagMs")} ms behind the write` },
    {
      label: "This read",
      detail: unavailable
        ? "ReadTemporarilyUnavailable. The old address is not returned."
        : primary
          ? "Primary. The saved address is returned."
          : n(metrics, "sawPct") >= 50
            ? "Replica. The saved address is on this replica."
            : "Replica. The old address comes back.",
    },
  ];
  return light("choose_read_target", lines, trace, elapsed, reduced);
}

function chapter12(
  controls: Controls,
  metrics: Metrics,
  elapsed: number,
  reduced: boolean,
  locked: string[],
): RunningProgram {
  const claim = on(controls, "claim");
  const after = on(controls, "commitAfter");
  const lines: RunLine[] = [
    line([
      text("# produce/s = "),
      numEdit("producePerSec", n(controls, "producePerSec", 80), 10, 200, 5, locked),
      text("  partitions = "),
      numEdit("partitions", n(controls, "partitions", 12), 1, 12, 1, locked),
      text("  consumers = "),
      numEdit("consumers", n(controls, "consumers", 1), 1, 12, 1, locked),
      text("  process_ms = "),
      numEdit("processMs", n(controls, "processMs", 50), 10, 120, 5, locked),
    ], true),
    line([text("def process_order_event(record, db, consumer):")], true, true),
    line([text("    event = decode_and_validate(record.value)")], true, true),
    line([text("    consumer.commit_next_offset(...)")], !after, true, { id: "commitAfter", value: false }),
    line([text("    with db.transaction() as tx:")], true, true),
    line([
      text("        first_delivery = "),
      boolEdit("claim", claim, "tx.claim_event(...)", "True", locked),
    ], true, true),
    line([text("        if first_delivery:")], claim, true),
    line([text('            tx.create_notification_task(..., notification_type="order_confirmation")')], true, true),
    line([text("    consumer.commit_next_offset(...)")], after, true, { id: "commitAfter", value: true }),
  ];
  const trace: RunTrace[] = [
    { label: "Backlog age", detail: `${metric(metrics, "ageSec", 1)} s. Size ${metric(metrics, "lag")} messages` },
    { label: "Assigned", detail: `${metric(metrics, "effective")} consumers on this topic` },
    {
      label: "This delivery",
      detail: `Second tasks ${metric(metrics, "duplicatePerSec")}/s. Lost tasks ${metric(metrics, "lostPerSec")}/s`,
    },
  ];
  return light("process_order_event", lines, trace, elapsed, reduced);
}

function chapter14(
  controls: Controls,
  metrics: Metrics,
  elapsed: number,
  reduced: boolean,
  locked: string[],
): RunningProgram {
  const lines: RunLine[] = [
    line([
      text(""),
      numEdit("readsPerSec", n(controls, "readsPerSec", 1440), 400, 2000, 20, locked),
      text(" reads/s × "),
      numEdit("occupancyMs", n(controls, "occupancyMs", 12), 5, 40, 1, locked),
      text(" ms × extra "),
      numEdit("extraPct", n(controls, "extraPct", 0), 0, 50, 5, locked),
      text("%"),
    ], true, true),
    line([text(`average = ${metric(metrics, "average", 1)} connections`)], true, true),
    line([text(`70 percent target = ${metric(metrics, "target70", 1)}`)], true, true),
    line([
      text(""),
      numEdit("instances", n(controls, "instances", 4), 1, 6, 1, locked),
      text(" instances × "),
      numEdit("perInstance", n(controls, "perInstance", 20), 4, 40, 1, locked),
      text(" connections"),
    ], true, true),
    line([
      text("one_instance_down = "),
      boolEdit("instanceDown", on(controls, "instanceDown"), "True", "False", locked),
    ], true, true),
    line([text(`surviving = ${metric(metrics, "surviving")} connections`)], true, true),
  ];
  const trace: RunTrace[] = [
    { label: "Average", detail: `${metric(metrics, "average", 1)} connections across the region` },
    { label: "Opened", detail: `${metric(metrics, "opened")} if every instance is up` },
    { label: "Surviving", detail: `${metric(metrics, "surviving")} with the instances that are up` },
  ];
  return light("L = λW", lines, trace, elapsed, reduced);
}

export function chapter1Call(input: {
  exposurePct: number;
  flagOff: boolean;
  busy: number;
  pending: number;
  acquireMs: number;
  poolSize: number;
  callsCatalog: boolean;
  callsRecommendation: boolean;
  acquiresPool: boolean;
  invoked: boolean;
  phase: string | null;
  skipReason: "flag" | "listing" | "shed" | null;
}): RunningProgram {
  const catalogDetail = input.callsCatalog
    ? "Ran on Product Page. It does not take a pool slot."
    : "That line is not in the handler, so this response has no product.";
  const recDetail = !input.callsRecommendation
    ? "The handler does not call recommendation_service.get, so no connection is taken."
    : input.skipReason === "flag"
      ? "The flag stopped this call. No connection is taken."
      : input.skipReason === "shed"
        ? "The shed gate skipped the call. No connection is taken."
        : !input.acquiresPool
          ? "The call is in the handler, and it is not taking a connection."
          : input.phase === "waiting"
          ? `Waiting for one of ${input.poolSize} connections. Pending ${input.pending.toFixed(0)}. Acquire ${input.acquireMs.toFixed(0)} ms.`
          : input.phase === "holding"
            ? `Holding one of ${input.poolSize} connections. The page is still open. Busy ${input.busy}. Pending ${input.pending.toFixed(0)}.`
            : input.invoked
              ? `The call took one connection and returned. Busy ${input.busy} of ${input.poolSize}. Pending ${input.pending.toFixed(0)}. Acquire ${input.acquireMs.toFixed(0)} ms.`
              : `The call is in the handler. Busy ${input.busy} of ${input.poolSize}. Pending ${input.pending.toFixed(0)}.`;
  const waitingOnCall = input.phase === "waiting" || input.phase === "holding" || input.phase === "arriving";
  const pageDetail = waitingOnCall
    ? "build_response has not run. The handler waits for the lines above it."
    : input.invoked
      ? "build_response returned the product and the recommendation row."
      : input.callsCatalog
        ? "build_response returned the product without a recommendation row."
        : "build_response had no product to return.";
  const trace: RunTrace[] = [
    { label: "catalog_service.fetch", detail: catalogDetail },
    { label: "feature flag", detail: input.flagOff ? `New calls are stopped. Exposure is ${input.exposurePct}%.` : `Exposure is ${input.exposurePct}%. The check runs before the recommendation call.` },
    { label: "recommendation_service.get", detail: recDetail },
    { label: "build_response", detail: pageDetail },
  ];
  const hotTrace =
    input.phase === "arriving"
      ? 0
      : input.phase === "waiting" || input.phase === "holding"
        ? 2
        : input.invoked
          ? 3
          : input.callsCatalog
            ? 0
            : 3;
  return { title: "get_product_page", lines: [], trace, hotLine: -1, hotTrace };
}

export function chapter3Program(input: {
  reuse: boolean;
  outbox: boolean;
  timeoutMs: number;
  providerMs: number;
  unique: number;
  duplicate: number;
  unresolved: number;
  lost: number;
  elapsed: number;
  reduced: boolean;
  lockTimes: boolean;
}): RunningProgram {
  const locked = input.lockTimes ? ["timeoutMs", "providerMs"] : [];
  const lines: RunLine[] = [
    line([
      text("client_timeout_ms = "),
      numEdit("timeoutMs", input.timeoutMs, 200, 2000, 50, locked),
      text("  provider_ms = "),
      numEdit("providerMs", input.providerMs, 200, 3000, 50, locked),
    ], true),
    line([text("POST /v1/orders/4471/payment-authorizations")], true, true),
    line([text("Idempotency-Key: checkout-4471-attempt-1")], true, true),
    line([
      text("reuse_operation_id = "),
      boolEdit("reuseOperationId", input.reuse, "True", "False", []),
    ], true, true),
    line([text("CREATE UNIQUE INDEX one_active_authorization_per_order")], input.reuse, true),
    line([text("ON payment_operations (order_id)")], input.reuse, true),
    line([text("WHERE operation_type = 'authorize'")], input.reuse, true),
    line([
      text("outbox_with_charge = "),
      boolEdit("outbox", input.outbox, "True", "False", []),
    ], true, true),
  ];
  const trace: RunTrace[] = [
    { label: "This attempt", detail: input.reuse ? "The retry keeps checkout-4471-attempt-1." : "The retry is a new operation id." },
    { label: "Ledger", detail: `Unique ${input.unique}. Duplicate ${input.duplicate}. Unresolved ${input.unresolved}.` },
    { label: "Notification", detail: input.lost > 0 ? `${input.lost} lost` : "Written with the charge, or still waiting on it." },
  ];
  return light("payment-authorizations", lines, trace, input.elapsed, input.reduced);
}

export function sloProgram(input: {
  exposurePct: number;
  flagOff: boolean;
  arrivals: number;
  pending: number;
  poolPct: number;
  headroom: number;
  elapsed: number;
  reduced: boolean;
}): RunningProgram {
  const calls = !input.flagOff && input.exposurePct > 0;
  const lines: RunLine[] = [
    line([text("def get_product_page(user_id, product_id):")], true, true),
    line([text("    product = catalog_service.fetch(product_id)")], true, true),
    line([text("    recs = recommendation_service.get(user_id, product_id)")], calls, true),
    line([text("    return build_response(product, recs)")], true, true),
    line([
      text("exposure_pct = "),
      numEdit("exposurePct", input.exposurePct, 0, 100, 5, []),
    ], true),
    line([
      text("flag_off_for_new = "),
      boolEdit("flagOff", input.flagOff, "True", "False", []),
    ], true),
    line([text("pool = 40")], true),
    line([text("query_ms = 70")], true),
  ];
  const trace: RunTrace[] = [
    { label: "Catalog", detail: "No pool slot on Product Page." },
    {
      label: "Recommendation",
      detail: input.flagOff
        ? "New calls are stopped. The pool stays at 40."
        : `${input.arrivals.toFixed(0)} lookups/s. Pool ${input.poolPct.toFixed(0)}%.`,
    },
    { label: "Acquire", detail: `Pending ${input.pending.toFixed(0)}. Headroom ${input.headroom.toFixed(0)}% of the 600 ms tail.` },
  ];
  return light("get_product_page", lines, trace, input.elapsed, input.reduced);
}

export function surgeProgram(input: {
  admitPerSec: number;
  arrivals: number;
  p95: number;
  rejectedPct: number;
  elapsed: number;
  reduced: boolean;
}): RunningProgram {
  const lines: RunLine[] = [
    line([text("payload = build_payload(request)")], true, true),
    line([text("with pool.acquire() as conn:")], true, true),
    line([text("    result = query_database(conn, payload)")], true, true),
    line([
      text("admit_per_sec = "),
      numEdit("admitPerSec", input.admitPerSec, 300, 560, 20, []),
    ], true, true),
  ];
  const trace: RunTrace[] = [
    { label: "Stage", detail: `${input.arrivals.toFixed(0)} lookups a second` },
    { label: "Acquire p95", detail: `${input.p95.toFixed(0)} ms. The bar is 50 ms.` },
    { label: "Rejected", detail: `${input.rejectedPct.toFixed(1)} percent. The bar is under 1 percent.` },
  ];
  return light("pool.acquire", lines, trace, input.elapsed, input.reduced);
}

export function tailProgram(input: {
  lookupsPerSec: number;
  queryMs: number;
  p95: number;
  elapsed: number;
  reduced: boolean;
}): RunningProgram {
  const lines: RunLine[] = [
    line([text("payload = build_payload(request)")], true, true),
    line([text("with pool.acquire() as conn:")], true, true),
    line([text("    result = query_database(conn, payload)")], true, true),
    line([text(`query_ms = ${input.queryMs.toFixed(0)}`)], true, true),
    line([
      text("lookups_per_sec = "),
      numEdit("lookupsPerSec", input.lookupsPerSec, 300, 560, 20, []),
    ], true, true),
  ];
  const trace: RunTrace[] = [
    { label: "Query", detail: `${input.queryMs.toFixed(0)} ms, and it stays there` },
    { label: "Acquire p95", detail: `${input.p95.toFixed(0)} ms. The bar is 50 ms.` },
    { label: "Lookups", detail: `${input.lookupsPerSec.toFixed(0)} a second into a pool of 40` },
  ];
  return light("pool.acquire", lines, trace, input.elapsed, input.reduced);
}
