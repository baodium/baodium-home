"use client";

import dynamic from "next/dynamic";
import type { NodeId } from "@/lib/play/cascade";

const CascadeFlowGraph = dynamic(
  () => import("./CascadeFlowGraph").then((mod) => mod.CascadeFlowGraph),
  {
    ssr: false,
    loading: () => <div className="service-flow service-flow-short" aria-hidden />,
  },
);

type CircuitMap = Record<"auth" | "pay" | "db", boolean>;
type HealthMap = Record<NodeId, number>;
type UtilMap = Record<"auth" | "pay" | "db", number>;

/**
 * Checkout topology with circuit breakers. Isolation only — no auth bypass.
 */
export function CascadeTopologyViz({
  health,
  circuitOpen,
  util,
  bulkheadAuth,
  bulkheadPay,
  cascadeRisk,
}: {
  health: HealthMap;
  circuitOpen: CircuitMap;
  util: UtilMap;
  bulkheadAuth: boolean;
  bulkheadPay: boolean;
  cascadeRisk: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Topology · breakers
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[color:var(--drill-muted)]">
            Checkout calls Auth, Pay, and the database. A dashed edge means that breaker is open
            and the call fails fast. There is no path that skips Auth.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          Cascade risk {(cascadeRisk * 100).toFixed(0)}%
        </p>
      </div>
      <CascadeFlowGraph
        health={health}
        circuitOpen={circuitOpen}
        util={util}
        bulkheadAuth={bulkheadAuth}
        bulkheadPay={bulkheadPay}
        cascadeRisk={cascadeRisk}
      />
    </div>
  );
}
