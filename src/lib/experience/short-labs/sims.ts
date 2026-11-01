import { advance, choice, flag, hold, mem, num, round } from "@/lib/experience/short-labs/sim-helpers";
import type { EdgeView, LabSim, LabSnapshot, NodeView, Tone } from "@/lib/experience/short-labs/types";

function edge(hot: boolean, dashed = false): EdgeView {
  return { hot, dashed };
}

function node(detail: string, tone: Tone, meter?: number): NodeView {
  if (meter == null || !Number.isFinite(meter)) return { detail, tone };
  return { detail, tone, meter: Math.max(0, Math.min(1, meter)) };
}

/**
 * Chapter 2. Little's Law sizing.
 * Predicted concurrency is offered load times service time.
 * Offered load includes retries. Queue wait grows only while
 * predicted concurrency stays above the worker count.
 */
export const chapter2Sim: LabSim = {
  initialControls: {
    arrivalPerSec: 120,
    serviceMs: 15,
    workers: 8,
    retryFactor: 1,
  },
  challengeLocks: {
    arrivalPerSec: 400,
    serviceMs: 20,
    retryFactor: 1.5,
  },
  step(prev, controls, dt) {
    const arrival = num(controls, "arrivalPerSec");
    const serviceMs = num(controls, "serviceMs");
    const workers = Math.max(1, num(controls, "workers"));
    const retry = num(controls, "retryFactor");
    const serviceSec = serviceMs / 1000;
    const offered = arrival * retry;
    const predicted = offered * serviceSec;
    const capacityRate = serviceSec > 0 ? workers / serviceSec : 0;
    let backlog = mem(prev, "backlog");
    const mismatch = offered - capacityRate;
    if (prev) {
      if (mismatch > 0) backlog += mismatch * dt;
      else backlog = Math.max(0, backlog + mismatch * dt);
    }
    const saturated = backlog > 0.05 || predicted > workers + 0.05;
    const busy = saturated ? workers : predicted;
    const queueWaitMs = capacityRate > 0 ? (backlog / capacityRate) * 1000 : 0;
    const util = workers > 0 ? busy / workers : 1;
    const sawQueue = mem(prev, "sawQueue") === 1 || backlog > 20 ? 1 : 0;
    const within =
      queueWaitMs < 25 && util < 0.85 && workers <= 20 && backlog < 15;
    const stable = hold(prev, "stable", within, dt, 6);

    const narration =
      predicted > workers + 0.05
        ? `Predicted concurrency is ${predicted.toFixed(1)} and you have ${workers} workers. The extra arrivals wait, and the wait keeps growing while that stays true.`
        : backlog > 2
          ? `Workers can finish ${capacityRate.toFixed(0)} requests per second. The queue is draining, and the wait is ${queueWaitMs.toFixed(0)} ms.`
          : `Little's Law puts ${predicted.toFixed(1)} requests in flight at ${offered.toFixed(0)} arrivals per second and ${serviceMs.toFixed(0)} ms of service. Utilization is ${Math.round(util * 100)} percent.`;

    return advance(prev, controls, dt, {
      metrics: {
        predicted: round(predicted, 1),
        busy: round(busy, 1),
        utilPct: round(util * 100, 1),
        queueWaitMs: round(queueWaitMs, 1),
        backlog: round(backlog, 1),
        offered: round(offered, 1),
      },
      point: { predicted: round(predicted, 2), busy: round(busy, 2) },
      nodes: {
        clients: node(`${arrival.toFixed(0)} new req/s`, "active", arrival / 900),
        api: node(
          `Offered ${offered.toFixed(0)} /s with retries`,
          predicted > workers ? "pressure" : "active",
          predicted / Math.max(workers, 1),
        ),
        workers: node(`${busy.toFixed(1)} of ${workers} busy`, util > 0.85 ? "pressure" : "active", util),
        downstream: node(`${serviceMs.toFixed(0)} ms service`, "idle", serviceMs / 80),
      },
      edges: {
        "clients-api": edge(true),
        "api-workers": edge(true, util > 0.85),
        "workers-down": edge(busy > 0),
      },
      narration,
      gates: {
        seen: (prev?.elapsedSec ?? 0) > 0.8,
        overCapacity: predicted > workers + 0.05,
        queued: backlog > 20,
        recovered: sawQueue === 1 && backlog < 2 && queueWaitMs < 20 && util < 0.9,
      },
      challengePassed: stable.ready,
      challengeDetail: `Queue wait ${queueWaitMs.toFixed(0)} ms. Utilization ${Math.round(util * 100)} percent. Workers ${workers}.`,
      memory: { backlog, sawQueue, stable: stable.value },
    });
  },
};

function deadlineCall(controls: LabSnapshot["controls"]) {
  const parent = num(controls, "parentMs");
  const attempt = num(controls, "attemptMs");
  const propagate = flag(controls, "propagate");
  const cancel = flag(controls, "cancel");
  const hops = [
    { id: "inventory", work: num(controls, "inventoryMs") },
    { id: "payments", work: num(controls, "paymentsMs") },
  ];
  let cursor = 20;
  let orphan = 0;
  let unfinished = false;
  const spent: Record<string, number> = { edge: 20, inventory: 0, payments: 0 };
  for (const hop of hops) {
    const remaining = Math.max(0, parent - cursor);
    const childBudget = propagate ? remaining : attempt;
    const childRuns = Math.min(hop.work, Math.max(0, childBudget));
    const callerWaits = Math.min(childRuns, remaining);
    spent[hop.id] = callerWaits;
    cursor += callerWaits;
    // The child only hears the caller give up when the remaining deadline is passed down and cancel is on.
    if (!(cancel && propagate) && childRuns > remaining + 0.01) {
      orphan += childRuns - remaining;
    }
    if (hop.work > callerWaits + 0.01) {
      unfinished = true;
      break;
    }
  }
  const caller = Math.min(parent, cursor);
  return { caller, orphan, unfinished, spent, parent, propagate, cancel };
}

/** Chapter 4. A child timeout that outlives the caller. */
export const chapter4Sim: LabSim = {
  initialControls: {
    inventoryMs: 70,
    paymentsMs: 60,
    parentMs: 400,
    attemptMs: 500,
    propagate: false,
    cancel: false,
  },
  challengeLocks: {
    inventoryMs: 260,
    paymentsMs: 160,
    parentMs: 400,
    attemptMs: 500,
  },
  step(prev, controls, dt) {
    const call = deadlineCall(controls);
    const quiet = call.orphan < 1 && call.caller <= call.parent + 0.1;
    const stable = hold(prev, "stable", quiet, dt, 6);
    const remaining = Math.max(0, call.parent - call.caller);
    const narration = call.orphan > 0
      ? `The caller returns at ${call.caller.toFixed(0)} ms. Downstream work keeps running for another ${call.orphan.toFixed(0)} ms after that.`
      : call.unfinished
        ? `The caller stops at ${call.caller.toFixed(0)} ms and the child stops with it. The payment did not finish, and nothing is left running.`
        : `The call finishes in ${call.caller.toFixed(0)} ms, inside the ${call.parent.toFixed(0)} ms deadline, with ${remaining.toFixed(0)} ms left.`;

    return advance(prev, controls, dt, {
      metrics: {
        callerMs: round(call.caller, 1),
        orphanMs: round(call.orphan, 1),
        parentMs: call.parent,
        inventoryMs: call.spent.inventory ?? 0,
        paymentsMs: call.spent.payments ?? 0,
      },
      point: { callerMs: round(call.caller, 1), orphanMs: round(call.orphan, 1) },
      nodes: {
        edge: node("20 ms at the edge", "idle", 20 / Math.max(call.parent, 1)),
        checkout: node(
          `${call.caller.toFixed(0)} ms of ${call.parent.toFixed(0)} used`,
          call.orphan > 0 ? "pressure" : "active",
          call.caller / Math.max(call.parent, 1),
        ),
        inventory: node(
          `${num(controls, "inventoryMs").toFixed(0)} ms of work`,
          call.spent.inventory ? "active" : "dim",
          num(controls, "inventoryMs") / Math.max(call.parent, 1),
        ),
        payments: node(
          call.orphan > 0 ? `Still running ${call.orphan.toFixed(0)} ms` : `${num(controls, "paymentsMs").toFixed(0)} ms of work`,
          call.orphan > 0 ? "pressure" : call.spent.payments ? "active" : "dim",
          call.orphan > 0 ? 1 : num(controls, "paymentsMs") / Math.max(call.parent, 1),
        ),
      },
      edges: {
        "edge-checkout": edge(true),
        "checkout-inventory": edge(true),
        "checkout-payments": edge(Boolean(call.spent.payments) || call.orphan > 0, call.orphan > 0),
      },
      narration,
      gates: {
        inside: call.orphan < 1 && call.caller < 300 && !call.unfinished,
        overrun: call.orphan > 0 || call.caller >= call.parent - 1,
        passedDown: flag(controls, "propagate"),
        stopped: flag(controls, "propagate") && flag(controls, "cancel") && call.orphan < 1 && call.caller <= call.parent + 0.1,
      },
      challengePassed: stable.ready,
      challengeDetail: `Caller ${call.caller.toFixed(0)} ms. Work still running after the caller returns: ${call.orphan.toFixed(0)} ms.`,
      memory: { stable: stable.value },
    });
  },
};

const CACHE_KEYS = 12;

function cacheOffset(index: number, ttl: number, align: boolean, jitter: boolean): number {
  if (align && !jitter) return 0;
  if (jitter) return (index * ttl) / CACHE_KEYS;
  return ((index * 5) % CACHE_KEYS) * (ttl / CACHE_KEYS);
}

/** Chapter 5. Cache-aside when expiries line up. */
export const chapter5Sim: LabSim = {
  initialControls: {
    rps: 120,
    ttlSec: 8,
    align: false,
    singleflight: false,
    jitter: false,
  },
  challengeLocks: {
    rps: 360,
    ttlSec: 6,
    align: true,
  },
  step(prev, controls, dt) {
    const rps = num(controls, "rps");
    const ttl = Math.max(1, num(controls, "ttlSec"));
    const align = flag(controls, "align");
    const single = flag(controls, "singleflight");
    const jitter = flag(controls, "jitter");
    const elapsed = (prev?.elapsedSec ?? 0) + (prev ? dt : 0);
    const shared = align && !jitter;
    const alignJustOn =
      shared &&
      !!prev &&
      (!flag(prev.controls, "align") || flag(prev.controls, "jitter"));
    let cohort = mem(prev, "cohort", ttl);
    if (alignJustOn) cohort = elapsed + 1.25;
    const memory: Record<string, number> = {};
    let hits = 0;
    let misses = 0;
    let originEvents = 0;
    let coldKeys = 0;
    let refreshedCohort = false;

    for (let i = 0; i < CACHE_KEYS; i += 1) {
      const share = i === 0 ? 0.42 : 0.58 / (CACHE_KEYS - 1);
      const req = rps * share * (prev ? dt : 0);
      const spread = jitter
        ? (i * ttl) / CACHE_KEYS
        : cacheOffset(i, ttl, false, false);
      let until = shared
        ? cohort
        : mem(prev, `until${i}`, 0.85 * ttl + spread);
      if (!shared && prev && flag(prev.controls, "align") && !flag(prev.controls, "jitter") && jitter) {
        until = elapsed + spread + 0.35;
      }
      let filling = mem(prev, `fill${i}`);
      if (prev && filling > 0) {
        filling = Math.max(0, filling - dt);
        if (filling === 0) {
          if (shared) {
            if (!refreshedCohort) {
              cohort = elapsed + ttl;
              refreshedCohort = true;
            }
            until = cohort;
          } else {
            until = elapsed + Math.max(0.4, spread);
          }
        }
      }
      const fresh = elapsed < until;
      if (!prev) {
        hits += rps * share;
      } else if (fresh) {
        hits += req;
      } else {
        coldKeys += 1;
        misses += req;
        if (single) {
          if (filling <= 0) {
            originEvents += 1;
            filling = 0.2;
          }
        } else {
          originEvents += req;
          if (filling <= 0) filling = 0.2;
        }
      }
      memory[`until${i}`] = until;
      memory[`fill${i}`] = filling;
    }
    memory.cohort = cohort;

    const originQps = prev ? originEvents / dt : 0;
    const total = hits + misses;
    const instant = total > 0 ? hits / total : 1;
    const previousHit = prev?.metrics.hitRate ?? 1;
    const hitRate = previousHit * 0.55 + instant * 0.45;
    const sawStampede = mem(prev, "sawStampede") === 1 || originQps > 80 ? 1 : 0;
    const wasWarm = mem(prev, "wasWarm") === 1 || (hitRate > 0.9 && (prev?.elapsedSec ?? 0) > 0.4) ? 1 : 0;
    const hitWindow = prev ? [...prev.series.map((point) => point.hitPct ?? 100), hitRate * 100].slice(-24) : [hitRate * 100];
    const avgHit = hitWindow.reduce((sum, value) => sum + value, 0) / hitWindow.length;
    const lastHot = originQps > 24 ? elapsed : mem(prev, "lastHot", -1);
    const calmFor = lastHot < 0 ? elapsed : elapsed - lastHot;
    const passed = elapsed >= 8 && calmFor >= 6.5 && avgHit >= 75 && originQps <= 24;

    const narration = originQps > 80
      ? `Origin is taking ${originQps.toFixed(0)} requests per second. The keys expired together, and each miss went to origin on its own.`
      : single && align && originQps > 24
        ? `Fills are shared per key, and ${coldKeys} keys still miss in the same moment. Origin sees ${originQps.toFixed(0)} requests per second.`
        : `Hit rate is ${Math.round(hitRate * 100)} percent. Origin is at ${originQps.toFixed(0)} requests per second.`

    return advance(prev, controls, dt, {
      metrics: {
        hitRate: round(hitRate, 3),
        hitPct: round(hitRate * 100, 1),
        originQps: round(originQps, 1),
        coldKeys,
      },
      point: { originQps: round(originQps, 2), hitPct: round(hitRate * 100, 1) },
      nodes: {
        client: node(`${rps.toFixed(0)} reads/s`, "active", rps / 500),
        app: node(single ? "One fill serves the waiters" : "Each miss fills alone", originQps > 40 ? "pressure" : "active", Math.min(1, originQps / 80)),
        cache: node(align && !jitter ? "Keys share one expiry" : jitter ? "Expiries are spread out" : "Expiries are already spread", coldKeys > 0 ? "pressure" : "active", coldKeys / 12),
        origin: node(`${originQps.toFixed(0)} req/s`, originQps > 24 ? "pressure" : "idle", originQps / 80),
      },
      edges: {
        "client-app": edge(true),
        "app-cache": edge(true),
        "cache-origin": edge(originQps > 1, originQps > 24),
      },
      narration,
      gates: {
        warm: wasWarm === 1,
        stampede: sawStampede === 1,
        coalesced: sawStampede === 1 && single && originQps < 56,
        spread: sawStampede === 1 && jitter && single && originQps < 20 && hitRate > 0.75,
      },
      challengePassed: passed,
      challengeDetail: `Origin is ${originQps.toFixed(0)} req/s. It has stayed at or under 24 req/s for ${Math.max(0, calmFor).toFixed(0)} s. Average hit rate ${avgHit.toFixed(0)} percent.`,
      memory: { ...memory, sawStampede, wasWarm, lastHot },
    });
  },
};

/** Chapter 7. Read-your-writes without pinning every read to the primary. */
export const chapter7Sim: LabSim = {
  initialControls: {
    lagMs: 480,
    route: "any",
    lagBoundMs: 800,
  },
  challengeLocks: {
    lagMs: 480,
  },
  step(prev, controls, dt) {
    const lag = num(controls, "lagMs");
    const bound = num(controls, "lagBoundMs");
    const route = choice(controls, "route");
    const rywShare = 0.32;
    const staleIfReplica = lag <= 200 ? 0 : Math.min(1, (lag - 200) / 280);
    let primaryShare = 0.05;
    let ryw = 1 - staleIfReplica;
    if (route === "primary") {
      primaryShare = 1;
      ryw = 1;
    } else if (route === "bound" && lag > bound) {
      primaryShare = rywShare;
      ryw = 1;
    }
    const ok = ryw >= 0.99 && primaryShare <= 0.45;
    const stable = hold(prev, "stable", ok, dt, 6);
    const held = hold(prev, "held", route === "bound" && ryw >= 0.99 && primaryShare <= 0.45, dt, 3);

    const narration = route === "primary"
      ? "Every read sees the latest write, and the primary is also serving the reads that did not need it."
      : ryw < 0.99
        ? `Replica lag is ${lag.toFixed(0)} ms. A session that just wrote still reads the old row on the replica.`
        : `Reads that must see the write use the primary while lag is ${lag.toFixed(0)} ms. The primary handles ${Math.round(primaryShare * 100)} percent of reads.`;

    const replicaTone: Tone = route === "primary" ? "dim" : ryw < 0.99 ? "pressure" : "active";
    return advance(prev, controls, dt, {
      metrics: {
        lagMs: lag,
        rywPct: round(ryw * 100, 1),
        primaryPct: round(primaryShare * 100, 1),
        replicaPct: round((1 - primaryShare) * 100, 1),
      },
      point: { rywPct: round(ryw * 100, 1), primaryPct: round(primaryShare * 100, 1) },
      nodes: {
        app: node(route === "primary" ? "All reads to the primary" : route === "bound" ? `Bound ${bound.toFixed(0)} ms` : "Reads pick a replica", "active", route === "primary" ? 1 : 0.45),
        primary: node(`${Math.round(primaryShare * 100)}% of reads`, primaryShare > 0.7 ? "pressure" : "active", primaryShare),
        replicaA: node(`${lag.toFixed(0)} ms behind`, replicaTone, lag / 2000),
        replicaB: node(`${lag.toFixed(0)} ms behind`, replicaTone, lag / 2000),
      },
      edges: {
        "app-primary": edge(primaryShare > 0.2),
        "primary-a": edge(route !== "primary", ryw < 0.99),
        "primary-b": edge(route !== "primary", ryw < 0.99),
      },
      narration,
      gates: {
        stale: ryw < 0.5,
        primaryOnly: route === "primary" && ryw >= 0.99,
        bounded: route === "bound" && ryw >= 0.99 && primaryShare <= 0.5 && lag > bound,
        held: held.ready,
      },
      challengePassed: stable.ready,
      challengeDetail: `Read-your-writes ${Math.round(ryw * 100)} percent. Primary handles ${Math.round(primaryShare * 100)} percent of reads. Lag ${lag.toFixed(0)} ms.`,
      memory: { stable: stable.value, held: held.value },
    });
  },
};

/** Chapter 12. Backlog age, partition count, and a redelivered message. */
export const chapter12Sim: LabSim = {
  initialControls: {
    producePerSec: 40,
    partitions: 4,
    consumers: 2,
    processMs: 25,
    idempotent: false,
    ackBefore: false,
  },
  challengeLocks: {
    producePerSec: 80,
    partitions: 4,
    processMs: 50,
  },
  step(prev, controls, dt) {
    const produce = num(controls, "producePerSec");
    const partitions = Math.max(1, Math.round(num(controls, "partitions")));
    const consumers = Math.max(1, Math.round(num(controls, "consumers")));
    const processMs = Math.max(5, num(controls, "processMs"));
    const idempotent = flag(controls, "idempotent");
    const ackBefore = flag(controls, "ackBefore");
    const effective = Math.min(consumers, partitions);
    const idle = Math.max(0, consumers - partitions);
    const perConsumer = 1000 / processMs;
    const consume = effective * perConsumer;
    let lag = mem(prev, "lag");
    lag = Math.max(0, lag + (produce - consume) * (prev ? dt : 0));
    const age = consume > 1 ? lag / consume : lag > 0 ? 999 : 0;
    const crashed = consume * 0.2;
    const duplicatePerSec = ackBefore || idempotent ? 0 : crashed;
    const lostPerSec = ackBefore ? crashed : 0;
    const sawAged = mem(prev, "sawAged") === 1 || age > 5 ? 1 : 0;
    const ok = age < 8 && duplicatePerSec < 0.5 && lostPerSec < 0.5 && consume + 0.01 >= produce;
    const stable = hold(prev, "stable", ok, dt, 6);

    const narration = idle > 0
      ? `${idle} consumer${idle === 1 ? "" : "s"} have no partition. Consume rate stays at ${consume.toFixed(0)} per second.`
      : age >= 8
        ? `Backlog age is ${age.toFixed(1)} s. The group finishes ${consume.toFixed(0)} messages per second and the producer writes ${produce.toFixed(0)}.`
        : ackBefore
          ? "The consumer acknowledges first. A crash after that loses the send, and the message is not delivered again."
          : duplicatePerSec > 0
            ? `Redelivery sends ${duplicatePerSec.toFixed(0)} extra notifications per second, because the handler does not recognize the message.`
            : `Backlog age is ${age.toFixed(1)} s. A redelivery does not send the notification twice.`;

    return advance(prev, controls, dt, {
      metrics: {
        lag: round(lag, 1),
        ageSec: round(age, 2),
        consumePerSec: round(consume, 1),
        duplicatePerSec: round(duplicatePerSec, 1),
        lostPerSec: round(lostPerSec, 1),
        effective,
      },
      point: { ageSec: round(Math.min(age, 40), 2) },
      nodes: {
        api: node(`${produce.toFixed(0)} msgs/s`, "active", produce / 200),
        outbox: node("Relay appends the log", "idle", 0.45),
        log: node(`${partitions} partitions`, age > 8 ? "pressure" : "active", Math.min(1, age / 16)),
        group: node(
          `${effective} assigned${idle ? `, ${idle} idle` : ""}`,
          duplicatePerSec > 0 || lostPerSec > 0 ? "pressure" : "active",
          effective / Math.max(partitions, 1),
        ),
      },
      edges: {
        "api-outbox": edge(true),
        "outbox-log": edge(true),
        "log-group": edge(true, age > 8),
      },
      narration,
      gates: {
        steady: age < 2 && consume >= produce,
        aged: sawAged === 1,
        scaled: effective >= partitions && age < 4 && consume >= produce && sawAged === 1,
        safe: idempotent && !ackBefore && duplicatePerSec < 0.5 && lostPerSec < 0.5,
      },
      challengePassed: stable.ready,
      challengeDetail: `Age ${age.toFixed(1)} s. Duplicate sends ${duplicatePerSec.toFixed(0)}/s. Lost sends ${lostPerSec.toFixed(0)}/s. Consume ${consume.toFixed(0)}/s.`,
      memory: { lag, sawAged, stable: stable.value },
    });
  },
};

/** Chapter 14. The regional checkout budget when the provider slows. */
export const chapter14Sim: LabSim = {
  initialControls: {
    slowdown: false,
    inventoryCritical: true,
    retryExtra: 0.4,
    providerBudgetMs: 300,
    shedPct: 0,
  },
  challengeLocks: {
    slowdown: true,
  },
  step(prev, controls, dt) {
    const slow = flag(controls, "slowdown");
    const inventoryOn = flag(controls, "inventoryCritical");
    const retryExtra = num(controls, "retryExtra");
    const providerBudget = num(controls, "providerBudgetMs");
    const shed = num(controls, "shedPct") / 100;
    const providerWork = slow ? 260 : 140;
    const inventoryMs = inventoryOn ? 100 : 0;
    const providerSpent = Math.min(providerWork, providerBudget);
    const timedOut = providerWork > providerBudget + 0.5;
    const path = 30 + 45 + inventoryMs + 80 + providerSpent;
    const amp = 1 + retryExtra;
    let success = 1 - shed;
    if (timedOut) success *= 0.35;
    if (slow && amp > 1.15) success *= 0.82;
    const p99 = path;
    const ok = success >= 0.99 && p99 <= 500 && amp <= 1.15 && !timedOut;
    const stable = hold(prev, "stable", ok, dt, 6);

    const narration = p99 > 500
      ? `The path adds up to ${p99.toFixed(0)} ms, past the 500 ms checkout budget.`
      : amp > 1.15 && slow
        ? `The path fits in ${p99.toFixed(0)} ms, and retries multiply attempts by ${amp.toFixed(2)}. The provider success rate falls to ${Math.round(success * 100)} percent.`
        : timedOut
          ? `The provider needs ${providerWork.toFixed(0)} ms and the budget for that hop is ${providerBudget.toFixed(0)} ms, so the checkout fails.`
          : `Checkout p99 is ${p99.toFixed(0)} ms. Success is ${Math.round(success * 100)} percent. Retry amplification is ${amp.toFixed(2)}.`;

    return advance(prev, controls, dt, {
      metrics: {
        p99Ms: round(p99, 1),
        successPct: round(success * 100, 1),
        amplification: round(amp, 2),
        providerMs: providerSpent,
        inventoryMs,
      },
      point: { p99Ms: round(p99, 1) },
      nodes: {
        region: node("One region owns the write", "idle", 0.4),
        edge: node("30 ms", "idle", 30 / 500),
        checkout: node(`Budget 500 ms`, p99 > 500 ? "pressure" : "active", p99 / 500),
        inventory: node(inventoryOn ? "100 ms on the deadline" : "Off this deadline", inventoryOn ? "active" : "dim", inventoryOn ? 100 / 500 : 0),
        payments: node("80 ms", "active", 80 / 500),
        provider: node(slow ? `${providerWork} ms, slowed` : `${providerWork} ms`, timedOut || (slow && amp > 1.15) ? "pressure" : "active", providerWork / 500),
      },
      edges: {
        "region-edge": edge(true),
        "edge-checkout": edge(true),
        "checkout-inventory": edge(inventoryOn, !inventoryOn),
        "inventory-payments": edge(true),
        "payments-provider": edge(true, timedOut || p99 > 500),
      },
      narration,
      gates: {
        fits: !slow && p99 <= 500 && success > 0.95,
        overBudget: slow && p99 > 500,
        deferred: slow && !inventoryOn && p99 <= 500,
        reserved: slow && !inventoryOn && amp <= 1.15 && success >= 0.99 && p99 <= 500 && !timedOut,
      },
      challengePassed: stable.ready,
      challengeDetail: `Success ${Math.round(success * 100)} percent. p99 ${p99.toFixed(0)} ms. Retry amplification ${amp.toFixed(2)}.`,
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
