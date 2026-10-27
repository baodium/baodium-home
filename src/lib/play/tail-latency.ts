/** Pure engine — Tail Latency: p50 vs p99, hedging tradeoffs. */

export type TailControls = {
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
  message: string;
};

export type TailResult = {
  outcome: "won" | "lost";
  score: number;
  reason: string;
  chapterHref: string;
  chapterLabel: string;
  takeaway: string;
};

export const TAIL_TICK_MS = 200;
export const TAIL_DURATION_S = 32;
export const P99_BUDGET_MS = 420;

export type TailState = {
  t: number;
  samples: number[];
  cost: number;
  completed: number;
  timedOut: number;
  lastMessage: string;
};

export function createTail(): TailState {
  return {
    t: 0,
    samples: [],
    cost: 0,
    completed: 0,
    timedOut: 0,
    lastMessage: "Quiet lane. Stragglers appear after 10s.",
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
  const baseRps = 60;
  const stragglerBias = t > 10 && t < 24 ? 0.18 : 0.04;
  const utilPressure = Math.max(0, controls.concurrency / 40 - 0.5);

  const batch = Math.max(1, Math.round(baseRps * dt));
  const samples = state.samples.slice(-400);
  let cost = state.cost;
  let completed = state.completed;
  let timedOut = state.timedOut;

  for (let i = 0; i < batch; i++) {
    const u = Math.random();
    let latency =
      35 +
      Math.pow(u, 1.8) * 90 +
      (Math.random() < stragglerBias ? 280 + Math.random() * 500 : 0) +
      utilPressure * 120 * Math.random();

    let work = 1;
    if (controls.hedge && latency > controls.hedgeAfterMs) {
      work += 1;
      // Hedge often wins the race on stragglers
      const hedgeLat =
        40 + Math.pow(Math.random(), 1.5) * 100 + utilPressure * 80;
      latency = Math.min(latency, hedgeLat + controls.hedgeAfterMs * 0.35);
      // Extra load from hedges raises everyone's latency slightly
      latency += work * 8 * utilPressure;
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

  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const goodput = completed / Math.max(1, completed + timedOut);

  let message = state.lastMessage;
  if (t > 10 && t < 14) message = "Stragglers landing — watch p99, not p50.";
  else if (controls.hedge && cost / Math.max(1, completed + timedOut) > 1.6)
    message = "Hedges helping the tail — and taxing capacity.";
  else if (p99 > P99_BUDGET_MS)
    message = "p99 over budget. Mean still looks fine.";
  else if (p50 < 80 && p99 < P99_BUDGET_MS)
    message = "Tail tamed. Mean and p99 both respectable.";

  const next: TailState = {
    t,
    samples,
    cost,
    completed,
    timedOut,
    lastMessage: message,
  };

  const snap: TailSnap = {
    t,
    p50,
    p95,
    p99,
    cost: cost / Math.max(1, completed + timedOut),
    goodput,
    message,
  };

  if (t >= TAIL_DURATION_S) {
    const won = p99 <= P99_BUDGET_MS && goodput >= 0.92 && snap.cost < 1.85;
    const score = Math.round(
      Math.max(0, P99_BUDGET_MS - p99) * 1.1 +
        goodput * 300 +
        Math.max(0, 2 - snap.cost) * 120 +
        (won ? 180 : 35),
    );
    return {
      state: next,
      snap,
      done: {
        outcome: won ? "won" : "lost",
        score,
        reason: won
          ? "Tail inside budget without torching capacity on hedges."
          : p99 > P99_BUDGET_MS
            ? "p99 still too high — the average lied."
            : snap.cost >= 1.85
              ? "Hedge storm — duplicate work ate the pool."
              : "Too many timeouts; goodput fell apart.",
        chapterHref: "/system-design/chapter-2",
        chapterLabel: "Ch.2 — Modeling requests, latency, and throughput",
        takeaway:
          "Users notice the tail, not the mean — hedging helps only when the duplicate work fits.",
      },
    };
  }

  return { state: next, snap, done: null };
}
