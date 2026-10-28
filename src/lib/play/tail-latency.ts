/** Pure engine. Tail Latency: shared workers, queueing, hedging tradeoffs. */

export type TailControls = {
  /** Worker pool size. drives queueing under load. */
  concurrency: number;
  /** Duplicate slow requests (hedging). */
  hedge: boolean;
  hedgeAfterMs: number;
  timeoutMs: number;
};

export type TailSnap = {
  t: number;
  p50: number;
  p95: number;
  p99: number;
  cost: number;
  goodput: number;
  queueDepth: number;
  util: number;
  message: string;
};

export type TailResult = {
  outcome: "won" | "lost";
  score: number;
  reason: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
  debrief: string;
  before: string;
  after: string;
  changed: string;
  metrics: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "neutral" }[];
};

export const TAIL_TICK_MS = 200;
export const TAIL_DURATION_S = 32;
export const P99_BUDGET_MS = 420;
export const BASE_RPS = 60;

export type TailState = {
  t: number;
  samples: number[];
  cost: number;
  completed: number;
  timedOut: number;
  hedgeExtra: number;
  queueDepth: number;
  seed: number;
  lastMessage: string;
};

/** Mulberry32. deterministic per-run RNG so controls, not luck, decide. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTail(seed = 0x2a7f3c19): TailState {
  return {
    t: 0,
    samples: [],
    cost: 0,
    completed: 0,
    timedOut: 0,
    hedgeExtra: 0,
    queueDepth: 0,
    seed,
    lastMessage: "Quiet lane. Stragglers appear after 10s.",
  };
}

export function emptyTailSnap(message?: string): TailSnap {
  return {
    t: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    cost: 1,
    goodput: 0,
    queueDepth: 0,
    util: 0,
    message: message ?? "Idle. Start a run to compare p50 vs p99.",
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

export function tickTail(
  state: TailState,
  controls: TailControls,
  dt = TAIL_TICK_MS / 1000,
): { state: TailState; snap: TailSnap; done: TailResult | null } {
  const t = state.t + dt;
  const rand = mulberry32((state.seed + Math.floor(t * 1000)) >>> 0);
  const workers = Math.max(4, controls.concurrency);
  const stragglerBias = t > 10 && t < 24 ? 0.2 : 0.045;

  // Arrivals this tick.
  const arrivals = Math.max(1, Math.round(BASE_RPS * dt));
  let queueDepth = state.queueDepth + arrivals;

  // Service rate: each worker finishes ~1 request per meanServiceSec.
  // Mean service rises with stragglers and hedge load.
  const hedgeLoad = controls.hedge ? 1 + Math.min(0.8, state.hedgeExtra / Math.max(1, state.completed + 1)) : 1;
  const meanServiceSec = (0.055 * hedgeLoad) / Math.max(0.35, 1 - stragglerBias * 0.6);
  const completionsCap = workers * (dt / meanServiceSec);
  const served = Math.min(queueDepth, completionsCap);
  queueDepth = Math.max(0, queueDepth - served);

  // Utilization from Little's approximation on the worker pool.
  const offered = BASE_RPS * meanServiceSec;
  const util = Math.min(1.6, offered / workers + queueDepth / (workers * 4));
  const queueWaitMs =
    util < 1
      ? (util / (1 - Math.min(0.97, util))) * meanServiceSec * 1000 * 0.35
      : 180 + (util - 1) * 420 + queueDepth * 8;

  const batch = Math.max(1, Math.round(served));
  const samples = state.samples.slice(-500);
  let cost = state.cost;
  let completed = state.completed;
  let timedOut = state.timedOut;
  let hedgeExtra = state.hedgeExtra;

  for (let i = 0; i < batch; i++) {
    const u = rand();
    let latency =
      30 +
      Math.pow(u, 1.85) * 85 +
      queueWaitMs * (0.55 + rand() * 0.7) +
      (rand() < stragglerBias ? 260 + rand() * 520 : 0);

    let work = 1;
    if (controls.hedge && latency > controls.hedgeAfterMs) {
      // Hedge launches a duplicate after hedgeAfterMs. costs a worker slot.
      work += 1;
      hedgeExtra += 1;
      const hedgeLat =
        35 +
        Math.pow(rand(), 1.55) * 95 +
        queueWaitMs * 0.4 +
        // Hedge itself adds util pressure
        (workers < 20 ? 40 : 10);
      latency = Math.min(latency, hedgeLat + controls.hedgeAfterMs * 0.4);
      // Duplicate work raises everyone's latency slightly this tick.
      latency += (work - 1) * (8 + util * 25);
    }

    cost += work;
    if (latency > controls.timeoutMs) {
      timedOut += 1;
      samples.push(controls.timeoutMs);
    } else {
      completed += 1;
      samples.push(latency);
    }
  }

  // Hedge extras briefly inflate queue (duplicate work).
  if (controls.hedge && hedgeExtra > state.hedgeExtra) {
    queueDepth += (hedgeExtra - state.hedgeExtra) * 0.35;
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const totalDone = completed + timedOut;
  const goodput = totalDone === 0 ? 0 : completed / totalDone;
  const costPer = totalDone === 0 ? 1 : cost / totalDone;

  let message = state.lastMessage;
  if (samples.length < 8) message = "Collecting samples. P99 needs a window.";
  else if (t > 10 && t < 14) message = "Stragglers landing. Watch p99, not p50.";
  else if (controls.hedge && costPer > 1.55)
    message = `Hedges helping the tail. cost ${costPer.toFixed(2)}× work/request.`;
  else if (util > 1.05)
    message = `Workers saturated (${(util * 100).toFixed(0)}% util). queue wait dominates the tail.`;
  else if (p99 > P99_BUDGET_MS)
    message = "p99 over budget. Mean / p50 still look fine.";
  else if (p50 < 90 && p99 < P99_BUDGET_MS)
    message = "Tail tamed. Mean and p99 both respectable.";

  const next: TailState = {
    t,
    samples,
    cost,
    completed,
    timedOut,
    hedgeExtra,
    queueDepth,
    seed: state.seed,
    lastMessage: message,
  };

  const snap: TailSnap = {
    t,
    p50,
    p95,
    p99,
    cost: costPer,
    goodput,
    queueDepth,
    util: Math.min(1.5, util),
    message,
  };

  if (t >= TAIL_DURATION_S) {
    const won =
      p99 <= P99_BUDGET_MS &&
      goodput >= 0.9 &&
      costPer < 1.8 &&
      samples.length >= 40;
    const score = Math.round(
      Math.max(0, P99_BUDGET_MS - p99) * 1.05 +
        goodput * 280 +
        Math.max(0, 2 - costPer) * 130 +
        Math.max(0, 40 - Math.abs(controls.concurrency - 28)) * 2 +
        (won ? 170 : 30),
    );
    const debrief = `p50 ${p50.toFixed(0)}ms · p99 ${p99.toFixed(0)}ms · goodput ${(goodput * 100).toFixed(0)}% · cost ${costPer.toFixed(2)}× · workers ${workers}${controls.hedge ? `, hedge after ${controls.hedgeAfterMs}ms` : ", no hedge"}. Queueing from an undersized pool lifts the whole tail; hedges only help when duplicate work still fits.`;

    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Tail inside budget without torching capacity on hedges."
          : p99 > P99_BUDGET_MS
            ? "p99 still too high. The average lied."
            : costPer >= 1.8
              ? "Hedge storm. Duplicate work ate the pool."
              : "Too many timeouts; goodput fell apart.",
        chapterHref: "/system-design/chapter-2",
        chapterLabel: "Ch.2. Modeling requests, latency, and throughput",
        takeaway:
          "The slowest requests shape the customer experience. Hedging helps only when the duplicate work fits.",
        debrief,
        before:
          "Stragglers plus an undersized pool. P50 stays calm while p99 walks off the SLO.",
        after: `p50 ${p50.toFixed(0)}ms, p99 ${p99.toFixed(0)}ms, goodput ${(goodput * 100).toFixed(0)}%, cost ${costPer.toFixed(2)}×, workers ${workers}${controls.hedge ? `, hedge after ${controls.hedgeAfterMs}ms` : ", no hedge"}.`,
        changed:
          controls.hedge && costPer < 1.8 && won
            ? "Hedges cut the tail while duplicate work still fit. Cost stayed under the storm line."
            : controls.hedge && costPer >= 1.8
              ? "Hedge copies ate the pool. P99 may improve briefly while goodput and cost collapse."
              : "Right-sized concurrency dropped queue wait; without a fitting hedge budget, stragglers still own p99.",
        metrics: [
          {
            label: "p50",
            value: `${p50.toFixed(0)}ms`,
            tone: "ok",
          },
          {
            label: "p99",
            value: `${p99.toFixed(0)}ms`,
            tone: p99 <= P99_BUDGET_MS ? "ok" : p99 <= P99_BUDGET_MS * 1.4 ? "warn" : "bad",
          },
          {
            label: "Goodput",
            value: `${(goodput * 100).toFixed(0)}%`,
            tone: goodput >= 0.9 ? "ok" : goodput >= 0.75 ? "warn" : "bad",
          },
          {
            label: "Cost",
            value: `${costPer.toFixed(2)}×`,
            tone: costPer < 1.3 ? "ok" : costPer < 1.8 ? "warn" : "bad",
          },
        ],
      },
    };
  }

  return { state: next, snap, done: null };
}
