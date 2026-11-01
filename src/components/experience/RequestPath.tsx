"use client";

import type { EngineSnapshot } from "@/lib/experience/types";
import { ServiceFlowGraph } from "@/components/experience/ServiceFlowGraph";

/**
 * Live service graph.
 * Baseline: Client → Product Page → Catalog.
 * Personalized: Product Page → Recommendation → shared 40-conn pool → DB.
 */
export function RequestPath({
  snap,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  reducedMotion: boolean;
}) {
  const c = snap.controls;
  const flagLive = c.featureEnabled && !c.featureDisabledForNew;
  const pressure = snap.waitingCount > 0 || snap.littles.overDemand;

  return (
    <div className="exp-panel-flat !p-0 overflow-hidden">
      <div className="border-b border-[color:var(--exp-line)] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="exp-kicker">Service path</p>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            {c.featureDisabledForNew
              ? "New callers stay on Catalog"
              : flagLive
                ? snap.flagPropagationRemainingSec > 0.02
                  ? `Exposure ${c.exposurePct}% propagating`
                  : `Exposure ${snap.appliedExposurePct}%`
                : "Flag off"}
          </p>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
          {pressure ? (
            <>
              Recommendation’s pool is full. New personalized calls wait for a free connection, and
              busy slots stay at {snap.poolSize}. Product Page does not hold those connections.
            </>
          ) : (
            <>
              Product Page calls Catalog for the ordinary page. Personalized traffic leaves Product
              Page, enters Recommendation, and only then borrows a connection from the shared{" "}
              {snap.poolSize}-slot pool on the way to the database.
            </>
          )}
        </p>
      </div>
      <ServiceFlowGraph snap={snap} reducedMotion={reducedMotion} />
    </div>
  );
}
