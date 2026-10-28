/**
 * Exact pass/fail criteria for Play drills (Adewale redesign v2 Phase 3).
 * Values mirror the engine win booleans — UI and verify scripts share this source.
 */

import { SLO_TARGET, DURATION_S as SLO_DURATION_S } from "@/lib/slo-watch";
import {
  MIN_SERVED_RATE,
  P95_LIMIT_MS,
  SURGE_DURATION_S,
} from "@/lib/play/traffic-surge";
import { CASCADE_DURATION_S } from "@/lib/play/cascade";
import { CACHE_DURATION_S } from "@/lib/play/cache-roulette";
import {
  P99_BUDGET_MS,
  TAIL_DURATION_S,
} from "@/lib/play/tail-latency";

export type CriterionTone = "idle" | "ok" | "warn" | "bad";

export type CriterionDef = {
  id: string;
  label: string;
  /** Exact threshold copy shown to the learner. */
  rule: string;
};

export type CriterionLive = CriterionDef & {
  value: string;
  tone: CriterionTone;
  met: boolean | null;
};

export const SLO_CRITERIA: CriterionDef[] = [
  {
    id: "budget",
    label: "Error budget",
    rule: "Stay above 0% for the full 48s shift (empty budget = immediate fail).",
  },
  {
    id: "success",
    label: "Success rate",
    rule: `Finish at ≥ ${((SLO_TARGET - 0.012) * 100).toFixed(1)}% (SLO ${(SLO_TARGET * 100).toFixed(1)}% with a 1.2pt end-of-run band).`,
  },
  {
    id: "cascade",
    label: "No cascade",
    rule: "Finish without a retry cascade.",
  },
  {
    id: "peakUtil",
    label: "Peak pool util",
    rule: "Peak pool util must stay under 120%.",
  },
];

export const SURGE_CRITERIA: CriterionDef[] = [
  {
    id: "served",
    label: "Served share",
    rule: `Serve ≥ ${(MIN_SERVED_RATE * 100).toFixed(0)}% of decided traffic.`,
  },
  {
    id: "underBudget",
    label: "Time under p95 budget",
    rule: `Spend ≥ 55% of ${SURGE_DURATION_S}s with p95 ≤ ${P95_LIMIT_MS}ms, and peak p95 < ${(P95_LIMIT_MS * 2.1).toFixed(0)}ms.`,
  },
  {
    id: "success",
    label: "Overall success",
    rule: "Overall success rate must stay above 48%.",
  },
  {
    id: "vip",
    label: "VIP success (if priority on)",
    rule: "When VIP priority is on, VIP success must be ≥ 72%.",
  },
];

export const CASCADE_CRITERIA: CriterionDef[] = [
  {
    id: "okRate",
    label: "Checkout ok",
    rule: "Checkout success ≥ 60% over the run.",
  },
  {
    id: "edge",
    label: "Edge health",
    rule: "Edge health must finish above 42%.",
  },
  {
    id: "peakRisk",
    label: "Peak cascade risk",
    rule: "Peak cascade risk must stay under 82%.",
  },
];

export const CACHE_CRITERIA: CriterionDef[] = [
  {
    id: "hitRate",
    label: "Hit rate",
    rule: "Hit rate ≥ 70% for the full run.",
  },
  {
    id: "stampede",
    label: "Stampede window",
    rule: "Stampede seconds must stay under 2.2s.",
  },
  {
    id: "peakOrigin",
    label: "Peak origin load",
    rule: "Peak origin load must stay under 1.45× workers.",
  },
];

export const TAIL_CRITERIA: CriterionDef[] = [
  {
    id: "p99",
    label: "p99 latency",
    rule: `p99 ≤ ${P99_BUDGET_MS} ms at the end of the run.`,
  },
  {
    id: "goodput",
    label: "Goodput",
    rule: "Goodput ≥ 90% (completed / completed+timed-out).",
  },
  {
    id: "cost",
    label: "Work cost",
    rule: "Work cost must stay under 1.8× (hedge amplification cap).",
  },
  {
    id: "samples",
    label: "Sample window",
    rule: "Collect at least 40 latency samples before judgment.",
  },
];

export const DRILL_WINDOWS = {
  "slo-watch": SLO_DURATION_S,
  "traffic-surge": SURGE_DURATION_S,
  cascade: CASCADE_DURATION_S,
  "cache-roulette": CACHE_DURATION_S,
  "tail-latency": TAIL_DURATION_S,
} as const;

export type DrillMode = "practice" | "challenge";
