import { advance, choice, flag, hold, mem, num, round } from "@/lib/experience/short-labs/sim-helpers";
import type { EdgeView, LabSim, LabSnapshot, NodeView, Tone } from "@/lib/experience/short-labs/types";

function edge(hot: boolean, dashed = false): EdgeView {
  return { hot, dashed };
}

function node(detail: string, tone: Tone, meter?: number): NodeView {
  if (meter == null || !Number.isFinite(meter)) return { detail, tone };
  return { detail, tone, meter: Math.max(0, Math.min(1, meter)) };
}

const POOL = 40;

/**
 * Chapter 2. The two pool.acquire listings.
 * Occupancy includes build_payload only while the connection is already assigned.
 * L = λW against the 40-connection pool. 400/s × 70 ms = 28.
 */
export const chapter2Sim: LabSim = {
  initialControls: {
    lookupsPerSec: 400,
    queryMs: 70,
    payloadMs: 0,
    holdDuringBuild: true,
  },
  challengeLocks: {
    lookupsPerSec: 400,
    queryMs: 70,
    payloadMs: 40,
  },
  step(prev, controls, dt) {
    const lookups = num(controls, "lookupsPerSec");
    const queryMs = num(controls, "queryMs");
    const payloadMs = num(controls, "payloadMs");
    const hold = flag(controls, "holdDuringBuild");
    const occupancyMs = queryMs + (hold ? payloadMs : 0);
    const predicted = lookups * (occupancyMs / 1000);
    const finishPerSec = occupancyMs > 0 ? (POOL * 1000) / occupancyMs : 0;
    let pending = mem(prev, "pending");
    if (prev) {
      pending += (lookups - finishPerSec) * dt;
      pending = Math.max(0, pending);
    }
    const busy = Math.min(POOL, predicted);
    const acquireP99 = pending > 1 ? Math.min(2000, (pending / Math.max(finishPerSec, 1)) * 1000) : 2;
    const sawQueue = mem(prev, "sawQueue") === 1 || pending > 12 ? 1 : 0;
    const calm = !hold && predicted <= 32 && pending < 1;
    const stable = holdTime(prev, "stable", calm, dt, 6);

    const narration = predicted > POOL + 0.2
      ? `Average demand is ${predicted.toFixed(1)} connections and the pool allows ${POOL}. Pending acquisitions are ${pending.toFixed(0)}, and acquire time is the wait, not the query.`
      : pending > 2
        ? `The pool can finish ${finishPerSec.toFixed(0)} lookups a second. Pending acquisitions are draining from ${pending.toFixed(0)}.`
        : `Little's Law gives ${predicted.toFixed(1)} busy connections: ${lookups.toFixed(0)} lookups a second times ${occupancyMs.toFixed(0)} ms. The chapter's 400 by 70 ms estimate is 28 of 40.`;

    return advance(prev, controls, dt, {
      metrics: {
        predicted: round(predicted, 1),
        occupancyMs: round(occupancyMs, 0),
        pending: round(pending, 1),
        acquireP99: round(acquireP99, 0),
        busy: round(busy, 1),
      },
      point: { predicted: round(predicted, 2), pending: round(Math.min(pending, 80), 2) },
      nodes: {
        page: node("Catalog stays here", "idle", 0.2),
        recommendation: node(
          hold ? "Payload built while holding the connection" : "Payload built, then acquire",
          predicted > POOL ? "pressure" : "active",
          predicted / POOL,
        ),
        pool: node(`${busy.toFixed(1)} of ${POOL} busy`, predicted > POOL ? "pressure" : "active", busy / POOL),
        database: node(`Query ${queryMs.toFixed(0)} ms`, "idle", queryMs / 120),
      },
      edges: {
        "page-rec": edge(true),
        "rec-pool": edge(true, predicted > POOL),
        "pool-db": edge(busy > 0),
      },
      narration,
      gates: {
        estimate: predicted > 26 && predicted < 33 && pending < 1 && payloadMs < 1,
        over: hold && predicted > POOL,
        queued: sawQueue === 1,
        released: sawQueue === 1 && calm,
      },
      challengePassed: stable.ready,
      challengeDetail: `Average ${predicted.toFixed(1)} connections. Pending ${pending.toFixed(0)}. Occupancy ${occupancyMs.toFixed(0)} ms.`,
      memory: { pending, sawQueue, stable: stable.value },
    });
  },
};

function holdTime(prev: LabSnapshot | null, key: string, ok: boolean, dt: number, need: number) {
  return hold(prev, key, ok, dt, need);
}

const CHILD_MAX_MS = 1000;

function fraudCall(controls: LabSnapshot["controls"]) {
  const provider = num(controls, "providerMs");
  const remaining = num(controls, "remainingMs");
  const reserve = num(controls, "reserveMs");
  const permit = flag(controls, "permit");
  const cancel = flag(controls, "cancel");
  const child = Math.min(CHILD_MAX_MS, Math.max(0, remaining - reserve));
  const canStart = child >= 20;
  const admitted = canStart && permit;
  if (!admitted) {
    return { caller: 15, orphan: 0, child, admitted, provider, remaining, cancel };
  }
  const caller = Math.min(provider, child, remaining);
  const orphan = cancel ? 0 : Math.max(0, provider - caller);
  return { caller, orphan, child, admitted, provider, remaining, cancel };
}

/** Chapter 4. reserve_fraud_call and evaluate_risk. */
export const chapter4Sim: LabSim = {
  initialControls: {
    providerMs: 80,
    remainingMs: 800,
    reserveMs: 50,
    permit: true,
    cancel: false,
  },
  challengeLocks: {
    providerMs: 900,
    remainingMs: 500,
    reserveMs: 80,
    permit: true,
  },
  step(prev, controls, dt) {
    const call = fraudCall(controls);
    const quiet = call.orphan < 1 && call.caller <= call.remaining + 0.1;
    const stable = hold(prev, "stable", quiet, dt, 6);
    const narration = !call.admitted
      ? "The call does not start. The deadline cannot start, or the outbound permit is missing, so the assessment waits for recovery and the provider is idle."
      : call.orphan > 0
        ? `Checkout returns at ${call.caller.toFixed(0)} ms. The provider keeps working for another ${call.orphan.toFixed(0)} ms because cancellation was not passed with the deadline.`
        : `The child deadline is ${call.child.toFixed(0)} ms, capped at ${CHILD_MAX_MS} ms. Checkout returns at ${call.caller.toFixed(0)} ms and the provider is not still running.`;

    return advance(prev, controls, dt, {
      metrics: {
        callerMs: round(call.caller, 0),
        orphanMs: round(call.orphan, 0),
        childMs: round(call.child, 0),
        remainingMs: call.remaining,
        admitted: call.admitted ? 1 : 0,
      },
      point: { callerMs: round(call.caller, 1), orphanMs: round(call.orphan, 1) },
      nodes: {
        checkout: node(
          `${call.caller.toFixed(0)} ms of ${call.remaining.toFixed(0)} left`,
          call.orphan > 0 ? "pressure" : "active",
          call.caller / Math.max(call.remaining, 1),
        ),
        fraud: node(
          call.admitted ? `Child deadline ${call.child.toFixed(0)} ms` : "Deferred, no call",
          call.admitted ? "active" : "dim",
          call.child / CHILD_MAX_MS,
        ),
        provider: node(
          call.orphan > 0 ? `Still running ${call.orphan.toFixed(0)} ms` : `${call.provider.toFixed(0)} ms of work`,
          call.orphan > 0 ? "pressure" : call.admitted ? "active" : "dim",
          call.provider / 1000,
        ),
      },
      edges: {
        "checkout-fraud": edge(true, !call.admitted),
        "fraud-provider": edge(call.admitted, call.orphan > 0),
      },
      narration,
      gates: {
        inside: call.admitted && call.orphan < 1 && call.caller < 200,
        overrun: call.orphan > 0,
        stopped: flag(controls, "cancel") && call.admitted && call.orphan < 1 && call.caller <= call.remaining + 0.1,
        deferred: !flag(controls, "permit") && call.orphan < 1,
      },
      challengePassed: stable.ready,
      challengeDetail: `Caller ${call.caller.toFixed(0)} ms. Provider still running ${call.orphan.toFixed(0)} ms. Child deadline ${call.child.toFixed(0)} ms.`,
      memory: { stable: stable.value },
    });
  },
};

/** Chapter 5. get_product_metadata, singleflight, and source_reads.try_acquire. */
export const chapter5Sim: LabSim = {
  initialControls: {
    readers: 40,
    fresh: true,
    singleflight: false,
    permit: true,
  },
  challengeLocks: {
    readers: 80,
    fresh: false,
    permit: true,
  },
  step(prev, controls, dt) {
    const readers = Math.max(1, Math.round(num(controls, "readers")));
    const fresh = flag(controls, "fresh");
    const single = flag(controls, "singleflight");
    const permit = flag(controls, "permit");
    const origin = fresh ? 0 : !permit ? 0 : single ? 1 : readers;
    const unavailable = fresh || permit ? 0 : readers;
    const hit = fresh ? 1 : 0;
    const sawStampede = mem(prev, "sawStampede") === 1 || (!fresh && !single && permit && origin >= 10) ? 1 : 0;
    const ok = !fresh && single && permit && origin <= 1 && unavailable === 0;
    const stable = hold(prev, "stable", ok, dt, 6);
    const elapsed = (prev?.elapsedSec ?? 0) + (prev ? dt : 0);

    const narration = fresh
      ? "The key product-metadata:v1 is still inside its 300 second TTL. Catalog is not called."
      : !permit
        ? "The loader calls source_reads.try_acquire and gets nothing back. Readers receive TemporarilyUnavailable(source_read_limit) instead of a catalog query."
        : single
          ? "singleflight shares one loader. Catalog sees one read, and the waiters take that result."
          : `The key missed. ${readers} readers each call catalog_db.fetch_metadata.`;

    return advance(prev, controls, dt, {
      metrics: {
        origin,
        unavailable,
        hitPct: round(hit * 100, 0),
        readers,
      },
      point: { origin, unavailable },
      nodes: {
        client: node(`${readers} readers`, "active", readers / 80),
        app: node(single ? "One loader" : "Each miss loads alone", origin > 1 ? "pressure" : "active", Math.min(1, origin / 40)),
        cache: node(fresh ? "Fresh, TTL 300 s" : "Miss", fresh ? "active" : "pressure", fresh ? 0.2 : 0.9),
        catalog: node(
          origin > 0 ? `${origin} reads` : unavailable > 0 ? "Permit refused" : "Idle",
          origin > 1 ? "pressure" : "idle",
          origin / 80,
        ),
      },
      edges: {
        "client-app": edge(true),
        "app-cache": edge(true),
        "cache-catalog": edge(origin > 0, unavailable > 0),
      },
      narration,
      gates: {
        warm: fresh && origin === 0 && elapsed > 0.4,
        stampede: sawStampede === 1,
        coalesced: sawStampede === 1 && single && permit && origin <= 1,
        limited: !permit && !fresh && origin === 0 && unavailable > 0,
      },
      challengePassed: stable.ready,
      challengeDetail: `Catalog reads ${origin}. Unavailable responses ${unavailable}. Readers ${readers}.`,
      memory: { sawStampede, stable: stable.value },
    });
  },
};

function readTarget(controls: LabSnapshot["controls"]) {
  const lag = num(controls, "lagMs");
  const route = choice(controls, "route");
  const fallback = flag(controls, "allowPrimaryFallback");
  const available = flag(controls, "replicaAvailable");
  const sample = flag(controls, "sampleCurrent");
  const caughtUp = lag <= 0;
  const accepted = available && sample && caughtUp;
  if (route === "replica") {
    return { where: "replica", address: lag > 0 ? "old" : "new", lag, fallback };
  }
  if (accepted) return { where: "replica", address: "new", lag, fallback };
  if (fallback) return { where: "primary", address: "new", lag, fallback };
  return { where: "unavailable", address: "none", lag, fallback };
}

/** Chapter 7. choose_read_target for the address the customer just saved. */
export const chapter7Sim: LabSim = {
  initialControls: {
    lagMs: 400,
    route: "replica",
    allowPrimaryFallback: false,
    replicaAvailable: true,
    sampleCurrent: true,
  },
  challengeLocks: {
    lagMs: 400,
    replicaAvailable: true,
    sampleCurrent: true,
  },
  step(prev, controls, dt) {
    const read = readTarget(controls);
    const saw = read.address === "new" ? 100 : 0;
    const primary = read.where === "primary" ? 100 : 0;
    const ok = saw === 100;
    const stable = hold(prev, "stable", ok, dt, 6);
    const narration = read.address === "old"
      ? `Replica lag is ${read.lag.toFixed(0)} ms. This read ignored the policy and returned the old address.`
      : read.where === "unavailable"
        ? "No replica has applied the write, and primary fallback is off. The read raises ReadTemporarilyUnavailable instead of returning the old row."
        : read.where === "primary"
          ? "No replica was eligible. allow_primary_fallback admitted the primary, and the saved address is what comes back."
          : "A replica is available, the sample is current, and it has applied the write. choose_read_target uses that replica.";

    return advance(prev, controls, dt, {
      metrics: {
        lagMs: read.lag,
        sawPct: saw,
        primaryPct: primary,
        unavailable: read.where === "unavailable" ? 1 : 0,
      },
      point: { sawPct: saw, primaryPct: primary },
      nodes: {
        app: node(
          read.where === "primary" ? "Primary fallback" : read.where === "replica" ? "Replica candidate" : "No eligible target",
          "active",
          primary / 100,
        ),
        primary: node(read.where === "primary" ? "This read" : "Not this read", read.where === "primary" ? "active" : "dim", primary / 100),
        replicaA: node(`${read.lag.toFixed(0)} ms behind`, read.address === "old" ? "pressure" : "active", read.lag / 2000),
        replicaB: node(`${read.lag.toFixed(0)} ms behind`, read.address === "old" ? "pressure" : "idle", read.lag / 2000),
      },
      edges: {
        "app-primary": edge(read.where === "primary"),
        "primary-a": edge(read.where === "replica", read.address === "old"),
        "primary-b": edge(false),
      },
      narration,
      gates: {
        stale: read.address === "old",
        refused: read.where === "unavailable",
        current: read.where === "primary" && saw === 100,
        caughtUp: choice(controls, "route") === "router" && read.lag <= 0 && read.where === "replica" && saw === 100,
      },
      challengePassed: stable.ready,
      challengeDetail: read.address === "new"
        ? `The saved address came from the ${read.where}.`
        : read.where === "unavailable"
          ? "The read is unavailable. The old address was not returned."
          : "The read returned the old address.",
      memory: { stable: stable.value },
    });
  },
};

/** Chapter 12. process_order_event: claim_event, then commit the next offset. */
export const chapter12Sim: LabSim = {
  initialControls: {
    producePerSec: 40,
    partitions: 12,
    consumers: 2,
    processMs: 25,
    claim: false,
    commitAfter: true,
  },
  challengeLocks: {
    producePerSec: 80,
    partitions: 12,
    processMs: 50,
  },
  step(prev, controls, dt) {
    const produce = num(controls, "producePerSec");
    const partitions = Math.max(1, Math.round(num(controls, "partitions")));
    const consumers = Math.max(1, Math.round(num(controls, "consumers")));
    const processMs = Math.max(5, num(controls, "processMs"));
    const claim = flag(controls, "claim");
    const commitAfter = flag(controls, "commitAfter");
    const effective = Math.min(consumers, partitions);
    const idle = Math.max(0, consumers - partitions);
    const consume = effective * (1000 / processMs);
    let lag = mem(prev, "lag");
    lag = Math.max(0, lag + (produce - consume) * (prev ? dt : 0));
    const age = consume > 1 ? lag / consume : lag > 0 ? 999 : 0;
    const repeats = Math.min(produce, consume) * 0.2;
    const duplicate = commitAfter && !claim ? repeats : 0;
    const lost = commitAfter ? 0 : repeats;
    const sawAged = mem(prev, "sawAged") === 1 || age > 5 ? 1 : 0;
    const ok = age < 2 && duplicate < 0.5 && lost < 0.5 && consume + 0.01 >= produce;
    const stable = hold(prev, "stable", ok, dt, 6);

    const narration = idle > 0
      ? `${idle} ${idle === 1 ? "consumer has" : "consumers have"} no partition. Assigned consumers stay at ${effective}, the smaller of the consumer count and the ${partitions} partitions on order-events.`
      : !commitAfter
        ? "The offset is committed before the task exists. A crash after that commit loses the message."
        : duplicate > 0
          ? "A redelivery arrives with the same message_id and the handler creates another confirmation task."
          : `Backlog age is ${age.toFixed(1)} s. claim_event records the message_id before the task is created, and the offset is committed after that transaction.`;

    return advance(prev, controls, dt, {
      metrics: {
        ageSec: round(age, 2),
        lag: round(lag, 1),
        consumePerSec: round(consume, 1),
        duplicatePerSec: round(duplicate, 1),
        lostPerSec: round(lost, 1),
        effective,
      },
      point: { ageSec: round(Math.min(age, 40), 2) },
      nodes: {
        api: node(`${produce.toFixed(0)} msgs/s`, "active", produce / 200),
        outbox: node("Same message_id on republish", "idle", 0.4),
        log: node(`${partitions} partitions`, age > 2 ? "pressure" : "active", Math.min(1, age / 12)),
        group: node(
          `${effective} assigned${idle ? `, ${idle} idle` : ""}`,
          duplicate > 0 || lost > 0 ? "pressure" : "active",
          effective / Math.max(partitions, 1),
        ),
      },
      edges: {
        "api-outbox": edge(true),
        "outbox-log": edge(true),
        "log-group": edge(true, age > 2),
      },
      narration,
      gates: {
        steady: age < 2 && consume >= produce,
        aged: sawAged === 1,
        scaled: effective >= Math.min(partitions, 4) && age < 4 && consume >= produce && sawAged === 1,
        safe: claim && commitAfter && duplicate < 0.5 && lost < 0.5,
      },
      challengePassed: stable.ready,
      challengeDetail: `Age ${age.toFixed(1)} s. Second tasks ${duplicate.toFixed(0)}/s. Lost tasks ${lost.toFixed(0)}/s. Consume ${consume.toFixed(0)}/s.`,
      memory: { lag, sawAged, stable: stable.value },
    });
  },
};

/** Chapter 14. European Catalog: 1,440 × 0.012 ≈ 17.3, planning case 32.4, four pools of 20. */
export const chapter14Sim: LabSim = {
  initialControls: {
    readsPerSec: 1440,
    occupancyMs: 12,
    extraPct: 0,
    instances: 4,
    perInstance: 8,
    instanceDown: false,
  },
  challengeLocks: {
    readsPerSec: 1440,
    occupancyMs: 18,
    extraPct: 25,
    instances: 4,
    instanceDown: true,
  },
  step(prev, controls, dt) {
    const reads = num(controls, "readsPerSec");
    const occupancyMs = num(controls, "occupancyMs");
    const extra = num(controls, "extraPct") / 100;
    const instances = Math.max(1, Math.round(num(controls, "instances")));
    const perInstance = Math.max(1, Math.round(num(controls, "perInstance")));
    const down = flag(controls, "instanceDown");
    const average = reads * (1 + extra) * (occupancyMs / 1000);
    const opened = instances * perInstance;
    const surviving = Math.max(0, instances - (down ? 1 : 0)) * perInstance;
    const target70 = average / 0.7;
    const covers = surviving + 0.01 >= average;
    const stable = hold(prev, "stable", down && covers, dt, 6);
    const narration = average > 16 && average < 19
      ? `1,440 reads a second at 12 ms is about ${average.toFixed(1)} connections. That regional average is not the size of one instance pool.`
      : average > 31 && average < 34
        ? `The planning case is 1,440 × 1.25 × 18 ms = ${average.toFixed(1)} connections. At 70 percent utilization that is about ${target70.toFixed(0)} across the region, which the chapter rounds to 47.`
        : down
          ? `One instance is down. ${surviving} connections remain of the ${opened} that four healthy instances would open. The planning demand is ${average.toFixed(1)}.`
          : `${instances} instances × ${perInstance} connections open ${opened}. A free connection on one instance cannot serve a request waiting on another.`;

    return advance(prev, controls, dt, {
      metrics: {
        average: round(average, 1),
        opened,
        surviving,
        target70: round(target70, 1),
      },
      point: { average: round(average, 2), surviving },
      nodes: {
        region: node("Europe", "idle", 0.4),
        catalog: node(`${reads.toFixed(0)} reads/s`, average > surviving ? "pressure" : "active", Math.min(1, average / Math.max(surviving, 1))),
        pool: node(`${perInstance} each`, "active", perInstance / 20),
        database: node(down ? `${surviving} surviving` : `${opened} opened`, covers ? "active" : "pressure", Math.min(1, average / Math.max(opened, 1))),
      },
      edges: {
        "region-catalog": edge(true),
        "catalog-pool": edge(true, !covers),
        "pool-db": edge(true),
      },
      narration,
      gates: {
        baseline: extra < 0.01 && occupancyMs >= 11 && occupancyMs <= 13 && reads > 1400 && reads < 1480 && average > 16 && average < 19,
        planning: extra >= 0.24 && occupancyMs >= 17 && occupancyMs <= 19 && average > 31 && average < 34,
        fleet: instances === 4 && perInstance >= 20 && !down && opened >= 80,
        survivor: down && perInstance >= 20 && surviving + 0.01 >= 32.4,
      },
      challengePassed: stable.ready,
      challengeDetail: `Planning demand ${average.toFixed(1)}. Surviving connections ${surviving}. Opened if every instance were up: ${opened}.`,
      memory: { stable: stable.value },
    });
  },
};

export const SHORT_LAB_SIMS = {
  "chapter-2": chapter2Sim,
  "chapter-4": chapter4Sim,
  "chapter-5": chapter5Sim,
  "chapter-7": chapter7Sim,
  "chapter-12": chapter12Sim,
  "chapter-14": chapter14Sim,
} as const;
