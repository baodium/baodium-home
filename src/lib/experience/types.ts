export type RequestPhase =
  | "arriving"
  | "waiting"
  | "holding"
  | "done"
  | "rejected_new"
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
};

export type SlotState = {
  index: number;
  requestId: string | null;
  exposed: boolean;
};

export type FlagLogEntry = {
  t: number;
  kind: "enable" | "disable" | "exposure" | "pause";
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
};

export type EngineSnapshot = {
  t: number;
  poolSize: number;
  slots: SlotState[];
  waiting: SimRequest[];
  active: SimRequest[];
  activeCount: number;
  waitingCount: number;
  completedCount: number;
  rejectedNewCount: number;
  controls: EngineControls;
  littles: LittlesSnapshot;
  latencyP50: number;
  latencyP99: number;
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
