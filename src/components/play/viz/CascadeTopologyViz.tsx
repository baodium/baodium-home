"use client";

import type { NodeId } from "@/lib/play/cascade";
import { CascadeFlowGraph } from "@/components/play/viz/CascadeFlowGraph";

type CircuitMap = Record<"auth" | "pay" | "db", boolean>;
type HealthMap = Record<NodeId, number>;
type UtilMap = Record<"auth" | "pay" | "db", number>;

/**
 * Checkout topology with circuit breakers. Isolation only. No auth bypass.
 */
export function CascadeTopologyViz({
  health,
  circuitOpen,
  util,
  cancel,
  permit,
  cascadeRisk,
}: {
  health: HealthMap;
  circuitOpen: CircuitMap;
  util: UtilMap;
  cancel: boolean;
  permit: boolean;
  cascadeRisk: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--drill-line)] bg-[color:var(--drill-panel)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--drill-line)] px-4 py-3 sm:px-5">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--drill-faint)]">
            Checkout, fraud, provider
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[color:var(--drill-muted)]">
            Checkout calls fraud with a child deadline. Fraud calls the provider only when a permit
            was acquired. Cancellation is what stops the provider when checkout is out of time.
          </p>
        </div>
        <p className="font-mono text-[0.72rem] tabular-nums text-[color:var(--drill-fg)]">
          {cascadeRisk > 0.5 ? "Provider still running" : "Provider stopped"}
        </p>
      </div>
      <CascadeFlowGraph
        health={health}
        circuitOpen={circuitOpen}
        util={util}
        cancel={cancel}
        permit={permit}
        cascadeRisk={cascadeRisk}
      />
    </div>
  );
}
