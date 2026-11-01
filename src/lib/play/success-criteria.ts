/**
 * Pass lines for the Play drills. They follow the chapter's own bars.
 */

import { DURATION_S as SLO_DURATION_S, ACQUIRE_BAR_MS, POOL, QUERY_MS } from "@/lib/slo-watch";
import { MIN_SERVED_RATE, P95_LIMIT_MS, SURGE_DURATION_S, CAPACITY } from "@/lib/play/traffic-surge";
import { CASCADE_DURATION_S } from "@/lib/play/cascade";
import { CACHE_DURATION_S } from "@/lib/play/cache-roulette";
import { P99_BUDGET_MS, QUERY_MS as TAIL_QUERY_MS, TAIL_DURATION_S } from "@/lib/play/tail-latency";

export type CriterionTone = "idle" | "ok" | "warn" | "bad";

export type CriterionDef = {
  id: string;
  label: string;
  rule: string;
};

export type CriterionLive = CriterionDef & {
  value: string;
  tone: CriterionTone;
  met: boolean | null;
};

export const SLO_CRITERIA: CriterionDef[] = [
  {
    id: "acquire",
    label: "Acquire wait",
    rule: `Finish with acquire wait under ${ACQUIRE_BAR_MS} ms. The query stays at ${QUERY_MS} ms.`,
  },
  {
    id: "pending",
    label: "Pending acquisitions",
    rule: "Finish with no pending acquisitions.",
  },
  {
    id: "pool",
    label: "Pool size",
    rule: `The pool stays at ${POOL} connections. A larger pool is not the response.`,
  },
];

export const SURGE_CRITERIA: CriterionDef[] = [
  {
    id: "p95",
    label: "Acquire p95",
    rule: `Acquire p95 stays under ${P95_LIMIT_MS} ms.`,
  },
  {
    id: "rejected",
    label: "Rejections",
    rule: `Rejections stay under ${((1 - MIN_SERVED_RATE) * 100).toFixed(0)} percent.`,
  },
  {
    id: "stage",
    label: "Passing stage",
    rule: `The admission limit sits on the ${CAPACITY}/s stage, the last one that passes both bars.`,
  },
];

export const CASCADE_CRITERIA: CriterionDef[] = [
  {
    id: "orphan",
    label: "Provider still running",
    rule: "Leftover provider work finishes at 0 ms.",
  },
  {
    id: "caller",
    label: "Caller",
    rule: "Checkout returns inside the time it had left.",
  },
  {
    id: "deadline",
    label: "Child deadline",
    rule: `The child deadline is min(1000, time left minus the reserve) for the ${CASCADE_DURATION_S}s run.`,
  },
];

export const CACHE_CRITERIA: CriterionDef[] = [
  {
    id: "origin",
    label: "Catalog reads",
    rule: "One missed key produces one catalog read.",
  },
  {
    id: "permit",
    label: "Source permit",
    rule: "The loader holds a source permit, so readers are not turned away with source_read_limit.",
  },
  {
    id: "ttl",
    label: "Freshness",
    rule: `The entry's TTL is 300 seconds. This run is the miss, for ${CACHE_DURATION_S}s.`,
  },
];

export const TAIL_CRITERIA: CriterionDef[] = [
  {
    id: "p95",
    label: "Acquire p95",
    rule: `Acquire p95 stays under ${P99_BUDGET_MS} ms.`,
  },
  {
    id: "query",
    label: "Query",
    rule: `The query stays at ${TAIL_QUERY_MS} ms for the ${TAIL_DURATION_S}s run.`,
  },
  {
    id: "samples",
    label: "Samples",
    rule: "Collect at least 40 acquire samples.",
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
