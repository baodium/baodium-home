export type RequestPhase =
  | "arriving"
  | "waiting"
  | "holding"
  | "done"
  | "rejected_new"
  | "timed_out"
  | "draining";

export type SimRequest = {
  id: string;
  userId: string;
  exposed: boolean;
  /** Feature was on for this request at arrival (for disable semantics). */
  featureOnAtArrival: boolean;
  arrivalTime: number;
  waitStart: number | null;
  acquireTime: number | null;
  releaseTime: number | null;
  doneTime: number | null;
  slotIndex: number | null;
  phase: RequestPhase;
  /** Connection hold duration (seconds). */
  holdSec: number;
  /** Highlighted code line while active. */
  codeLine: number;
  /** Path through the product handler. */
  path: "baseline" | "recs";
  /** Recs path skipped via load-shed (pool util gate). */
  shed: boolean;
  /** Recs path short-circuited by cache hit. */
  cacheHit: boolean;
  /** Acquire wait exceeded connectionTimeout. */
  timedOut: boolean;
};

export type SlotState = {
  index: number;
  requestId: string | null;
  exposed: boolean;
};

export type FlagLogEntry = {
  t: number;
  kind: "enable" | "disable" | "exposure" | "pause" | "mitigation";
  detail: string;
};

export type DecisionKind = "pause_exposure" | "disable_feature" | "investigate";

export type EngineControls = {
  arrivalRate: number;
  /** Extra DB lookup seconds when recommendations path runs. */
  recLookupSec: number;
  /** Baseline product-page hold without recs. */
  baselineHoldSec: number;
  exposurePct: number;
  featureEnabled: boolean;
  /** When true, new exposed traffic stops; in-flight continues. */
  featureDisabledForNew: boolean;
  paused: boolean;
  /**
   * Max seconds a request may wait to acquire a connection.
   * `null` = wait forever (common teaching default).
   * Maps to HikariCP `connectionTimeout` / similar.
   */
  acquireTimeoutSec: number | null;
  /**
   * When pool utilization ≥ this fraction, skip the recs lookup for new
   * arrivals (load shed). `null` = never shed.
   */
  shedAtUtil: number | null;
  /**
   * Fraction of exposed recs requests that hit a warm cache and skip the
   * long hold (0–1). Shortens mean W without changing the flag cohort.
   */
  cacheHitRate: number;
  /** SLO target for end-to-end latency p99 (seconds). */
  sloP99Sec: number;
};

export type LittlesSnapshot = {
  lambda: number;
  W: number;
  L: number;
  demand: number;
  poolSize: number;
  overDemand: boolean;
};

export type LatencySample = {
  t: number;
  totalSec: number;
  waitSec: number;
  holdSec: number;
  exposed: boolean;
  path: "baseline" | "recs";
  timedOut: boolean;
  shed: boolean;
  cacheHit: boolean;
};

export type PathLatency = {
  p50: number;
  p99: number;
  count: number;
};

export type SloSnapshot = {
  targetP99Sec: number;
  observedP99Sec: number;
  breached: boolean;
  /** observed / target — >1 means burning the error budget on latency. */
  burnRatio: number;
};

export type EngineSnapshot = {
  t: number;
  poolSize: number;
  slots: SlotState[];
  waiting: SimRequest[];
  active: SimRequest[];
  activeCount: number;
  idleCount: number;
  waitingCount: number;
  completedCount: number;
  rejectedNewCount: number;
  timeoutCount: number;
  shedCount: number;
  cacheHitCount: number;
  controls: EngineControls;
  littles: LittlesSnapshot;
  latencyP50: number;
  latencyP99: number;
  acquireWaitP50: number;
  acquireWaitP99: number;
  meanWaitSec: number;
  throughputRps: number;
  utilization: number;
  latencyBaseline: PathLatency;
  latencyRecs: PathLatency;
  slo: SloSnapshot;
  recentLatency: LatencySample[];
  flagLog: FlagLogEntry[];
  tracedId: string | null;
  tracedRequest: SimRequest | null;
  /** Mean occupancy demand λ×W — may exceed poolSize; activeCount never does. */
  demandOccupancy: number;
};

export type GuidedStepId =
  | "inspect"
  | "review"
  | "trace"
  | "rollout"
  | "inspect_prod"
  | "pressure"
  | "decide"
  | "debrief"
  | "sandbox";
