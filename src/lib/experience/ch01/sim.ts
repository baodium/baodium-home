import modelJson from "../../../../content/experience/ch01/sim/model.json";

/** Book figures for Chapter 1. Render time is the reference experience's page tail, not a book measurement. */
export const CHAPTER1_MODEL = {
  pool: modelJson.parameters.pool_connections,
  otherRate: modelJson.parameters.other_callers_per_s,
  pageRate: modelJson.parameters.product_page_lookups_per_s_at_100pct,
  holdMean: modelJson.parameters.occupancy_mean_ms / 1000,
  sqlMean: modelJson.parameters.sql_mean_ms / 1000,
  catalog: modelJson.parameters.catalog_median_ms / 1000,
  render: 0.006,
  acquireTimeout: modelJson.parameters.acquire_timeout_ms / 1000,
  flagPoll: modelJson.parameters.flag_refresh_s,
  ppInstances: modelJson.parameters.product_page_instances,
  pageObjectiveMs: modelJson.parameters.page_objective_p99_ms,
  drawEvery: 12,
} as const;

const M = CHAPTER1_MODEL;

export type ReqKind = "page" | "home" | "checkout";
export type ReqState = "travel" | "queue" | "hold" | "done";

export type SimRequest = {
  id: number;
  kind: ReqKind;
  arr: number;
  hold: number;
  sql: number;
  catalog: number;
  state: ReqState;
  maya: boolean;
  product: number;
  reachRec: number;
  qAt: number;
  wait: number;
  release: number;
  slot: number;
  end: number;
  outcome: "ok" | "timeout" | "";
  total: number;
};

export type DoneSample = {
  t: number;
  kind: ReqKind;
  wait: number;
  sql: number | null;
  total: number;
};

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: Rng) {
  let u = 0;
  let v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function lognorm(rnd: Rng, mean: number, s: number) {
  return Math.exp(Math.log(mean) - (s * s) / 2 + s * gauss(rnd));
}

function poisson(rnd: Rng, lambda: number) {
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(rnd)));
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rnd();
  } while (p > limit);
  return k - 1;
}

function p99(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(0.99 * sorted.length))] ?? null;
}

export class ChapterSimEngine {
  requestMaya() { this.mayaWanted = true; }

  rnd: Rng = mulberry32(42);
  t = 0;
  target = 0;
  inst: { exp: number; next: number }[] = [];
  busy: SimRequest[] = [];
  queue: SimRequest[] = [];
  done: DoneSample[] = [];
  sprites: SimRequest[] = [];
  seq = 0;
  maya: SimRequest | null = null;
  mayaWanted = false;
  flagOffAt: number | null = null;
  pending: SimRequest[] = [];

  reset(target: number) {
    this.rnd = mulberry32(42);
    this.t = 0;
    this.target = target;
    this.busy = [];
    this.queue = [];
    this.done = [];
    this.sprites = [];
    this.seq = 0;
    this.maya = null;
    this.mayaWanted = false;
    this.flagOffAt = null;
    this.pending = [];
    this.inst = Array.from({ length: M.ppInstances }, (_, i) => ({
      exp: target,
      next: ((i + 0.5) * M.flagPoll) / M.ppInstances,
    }));
  }

  setTarget(value: number) {
    this.target = value;
  }

  turnFlagOff() {
    this.setTarget(0);
    this.flagOffAt = this.t;
  }

  exposure() {
    if (!this.inst.length) return 0;
    return this.inst.reduce((sum, item) => sum + item.exp, 0) / this.inst.length;
  }

  instancesSeen() {
    return this.inst.filter((item) => item.exp === 0).length;
  }

  private makeReq(kind: ReqKind, maya = false) {
    const hold = lognorm(this.rnd, M.holdMean, 0.35);
    const sql = Math.min(hold * 0.9, lognorm(this.rnd, M.sqlMean, 0.45));
    const request: SimRequest = {
      id: ++this.seq,
      kind,
      arr: this.t,
      hold,
      sql,
      catalog: kind === "page" ? lognorm(this.rnd, M.catalog, 0.45) : 0,
      state: "travel",
      maya,
      product: Math.floor(this.rnd() * 12),
      reachRec: 0,
      qAt: 0,
      wait: 0,
      release: 0,
      slot: 0,
      end: 0,
      outcome: "",
      total: 0,
    };
    request.reachRec = this.t + request.catalog + 0.001;
    if (maya || this.seq % M.drawEvery === 0) this.sprites.push(request);
    return request;
  }

  private freeSlot() {
    const used = new Set(this.busy.map((request) => request.slot));
    for (let i = 0; i < M.pool; i += 1) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  private finish(request: SimRequest, outcome: "ok" | "timeout") {
    request.state = "done";
    request.outcome = outcome;
    request.end = this.t;
    request.total =
      (request.kind === "page" ? request.catalog : 0) +
      request.wait +
      (outcome === "ok" ? request.hold : 0) +
      M.render +
      0.002;
    this.done.push({
      t: this.t,
      kind: request.kind,
      wait: request.wait,
      sql: outcome === "ok" ? request.sql : null,
      total: request.total,
    });
    if (this.done.length > 20000) this.done.splice(0, 5000);
  }

  step(dt: number) {
    this.t += dt;
    for (const instance of this.inst) {
      if (this.t >= instance.next) {
        instance.exp = this.target;
        instance.next += M.flagPoll;
      }
    }
    const pageArrivals = poisson(this.rnd, M.pageRate * this.exposure() * dt);
    const otherArrivals = poisson(this.rnd, M.otherRate * dt);
    for (let i = 0; i < pageArrivals; i += 1) this.pending.push(this.makeReq("page"));
    for (let i = 0; i < otherArrivals; i += 1) {
      this.pending.push(this.makeReq(this.rnd() < 0.82 ? "home" : "checkout"));
    }
    if (this.mayaWanted && (this.queue.length >= 60 || this.target < 1)) {
      this.mayaWanted = false;
      const maya = this.makeReq("page", true);
      this.maya = maya;
      this.pending.push(maya);
    }
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const request = this.pending[i];
      if (!request || this.t < request.reachRec) continue;
      this.pending.splice(i, 1);
      request.state = "queue";
      request.qAt = this.t;
      this.queue.push(request);
    }
    for (let i = this.busy.length - 1; i >= 0; i -= 1) {
      const request = this.busy[i];
      if (!request || this.t < request.release) continue;
      this.busy.splice(i, 1);
      this.finish(request, "ok");
    }
    for (let i = this.queue.length - 1; i >= 0; i -= 1) {
      const request = this.queue[i];
      if (!request || this.t - request.qAt <= M.acquireTimeout) continue;
      this.queue.splice(i, 1);
      request.wait = M.acquireTimeout;
      this.finish(request, "timeout");
    }
    while (this.busy.length < M.pool && this.queue.length) {
      const request = this.queue.shift();
      if (!request) break;
      request.wait = this.t - request.qAt;
      request.state = "hold";
      request.release = this.t + request.hold;
      request.slot = this.freeSlot();
      this.busy.push(request);
    }
    this.sprites = this.sprites.filter(
      (request) => request.state !== "done" || this.t - request.end < 1 || request.maya,
    );
  }

  run(seconds: number, dt = 0.002) {
    let left = seconds;
    while (left > 0) {
      const hop = Math.min(left, dt);
      this.step(hop);
      left -= hop;
    }
  }

  windowStats(windowSeconds = 4) {
    const recent = this.done.filter((sample) => sample.t > this.t - windowSeconds);
    return {
      page: p99(recent.filter((sample) => sample.kind === "page").map((sample) => sample.total * 1000)),
      acq: p99(recent.map((sample) => sample.wait * 1000)),
      sql: p99(
        recent
          .filter((sample) => sample.sql != null)
          .map((sample) => (sample.sql ?? 0) * 1000),
      ),
      busy: this.busy.length,
      waiting: this.queue.length,
    };
  }
}

export function assessChapter1() {
  const quiet = new ChapterSimEngine();
  quiet.reset(0);
  quiet.run(8);
  const atZero = quiet.windowStats();

  const half = new ChapterSimEngine();
  half.reset(0);
  half.setTarget(0.5);
  half.run(20);
  const atHalf = half.windowStats();

  const full = new ChapterSimEngine();
  full.reset(0);
  full.setTarget(1);
  full.mayaWanted = true;
  let peakPage = 0;
  let peakWait = 0;
  let peakAcq = 0;
  for (let second = 0; second < 24; second += 1) {
    full.run(1);
    const sample = full.windowStats();
    peakPage = Math.max(peakPage, sample.page ?? 0);
    peakWait = Math.max(peakWait, sample.waiting);
    peakAcq = Math.max(peakAcq, sample.acq ?? 0);
  }
  const atFull = { ...full.windowStats(), peakPage, peakWait, peakAcq };
  const sqlBaseline = atZero.sql;
  full.turnFlagOff();
  full.run(15);
  const seen = full.instancesSeen();
  const after = full.windowStats();

  return {
    atZero,
    atHalf,
    atFull,
    sqlBaseline,
    seen,
    waitingAfter: after.waiting,
    mayaWaitMs: full.maya ? Math.round(full.maya.wait * 1000) : null,
  };
}
