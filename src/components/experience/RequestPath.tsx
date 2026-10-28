"use client";

import { motion } from "motion/react";
import type { EngineSnapshot } from "@/lib/experience/types";

/**
 * Correct service boundaries for Chapter 1:
 * Baseline: Client → Product Page → Catalog
 * Personalized: Product Page → Recommendation → shared 40-conn pool → DB
 * The pool never lives inside Product Page.
 */
type NodeId =
  | "client"
  | "product"
  | "catalog"
  | "recommendation"
  | "pool"
  | "db";

type NodeDef = {
  id: NodeId;
  label: string;
  tip: string;
  branch?: "baseline" | "recs" | "shared";
};

const ROW_TOP: NodeDef[] = [
  { id: "client", label: "Client", tip: "Arrivals", branch: "shared" },
  { id: "product", label: "Product Page", tip: "Orchestrates", branch: "shared" },
];

const ROW_BASELINE: NodeDef[] = [
  { id: "catalog", label: "Catalog", tip: "~12 ms", branch: "baseline" },
];

const ROW_RECS: NodeDef[] = [
  { id: "recommendation", label: "Recommendation", tip: "Service", branch: "recs" },
  { id: "pool", label: "Pool", tip: "Shared 40", branch: "recs" },
  { id: "db", label: "DB", tip: "Hold W", branch: "recs" },
];

function activeNode(snap: EngineSnapshot): NodeId {
  const c = snap.controls;
  const flagLive = c.featureEnabled && !c.featureDisabledForNew;
  const tr = snap.tracedRequest;
  if (!tr) {
    if (flagLive && c.exposurePct > 0) return "recommendation";
    if (flagLive) return "product";
    return "client";
  }
  if (tr.phase === "waiting") return "pool";
  if (tr.phase === "holding") {
    if (tr.path === "recs") {
      if (tr.codeLine >= 15) return "db";
      if (tr.codeLine >= 13) return "pool";
      return "recommendation";
    }
    return "catalog";
  }
  if (tr.phase === "done") return "product";
  return flagLive ? "recommendation" : "client";
}

function NodeCard({
  node,
  on,
  dim,
  congested,
  reducedMotion,
}: {
  node: NodeDef;
  on: boolean;
  dim: boolean;
  congested: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-center transition-colors ${
        on
          ? "border-[color:var(--exp-accent)] bg-[color-mix(in_srgb,var(--exp-accent)_10%,#fffefb)]"
          : congested
            ? "border-[color-mix(in_srgb,var(--exp-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_5%,#fffefb)]"
            : "border-[color:var(--exp-line)] bg-[color:var(--exp-panel)]"
      } ${dim ? "opacity-50" : ""}`}
    >
      {on && !reducedMotion ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-xl border border-[color:var(--exp-accent)]"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
      <span className="text-xs font-medium text-[color:var(--exp-fg)] sm:text-sm">
        {node.label}
      </span>
      <span className="hidden font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[color:var(--exp-faint)] sm:inline">
        {node.tip}
      </span>
    </div>
  );
}

function Arrow({ live, reducedMotion }: { live: boolean; reducedMotion: boolean }) {
  return (
    <div className="relative hidden h-3 w-[14px] shrink-0 sm:block">
      <svg
        width="14"
        height="12"
        viewBox="0 0 14 12"
        className="absolute inset-0 text-[color:var(--exp-amber)]"
        aria-hidden="true"
      >
        <path
          d="M1 6h10M8 2l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className={live && !reducedMotion ? "exp-flow-path" : undefined}
        />
      </svg>
    </div>
  );
}

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
  const active = activeNode(snap);
  const recsDim = !flagLive && snap.active.every((r) => r.path !== "recs");

  return (
    <div className="exp-panel-flat !py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="exp-kicker">Service path</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          {c.featureDisabledForNew
            ? "New → Product → Catalog · in-flight may still hold pool"
            : flagLive
              ? `Exposure ${c.exposurePct}% · pool on Recommendation`
              : "Flag off · Product → Catalog only"}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {ROW_TOP.map((node, i) => (
            <div key={node.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <NodeCard
                node={node}
                on={active === node.id}
                dim={false}
                congested={false}
                reducedMotion={reducedMotion}
              />
              {i < ROW_TOP.length - 1 ? (
                <Arrow live={flagLive || pressure} reducedMotion={reducedMotion} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_40%,transparent)] p-2">
            <p className="mb-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
              Baseline
            </p>
            <div className="flex items-center gap-1">
              {ROW_BASELINE.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  on={active === node.id}
                  dim={false}
                  congested={false}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_40%,transparent)] p-2">
            <p className="mb-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
              Personalized · shared pool
            </p>
            <div className="flex items-center gap-1">
              {ROW_RECS.map((node, i) => (
                <div key={node.id} className="flex min-w-0 flex-1 items-center gap-1">
                  <NodeCard
                    node={node}
                    on={active === node.id}
                    dim={recsDim}
                    congested={pressure && (node.id === "pool" || node.id === "db")}
                    reducedMotion={reducedMotion}
                  />
                  {i < ROW_RECS.length - 1 ? (
                    <Arrow live={flagLive && !recsDim} reducedMotion={reducedMotion} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {pressure ? (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-accent)]">
          Recommendation’s pool is saturated. Arrivals wait beside the grid. Busy slots stay ≤{" "}
          {snap.poolSize}. Product Page itself does not hold those connections.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
          Baseline stays on Product Page → Catalog. Personalized traffic calls Recommendation, which
          alone acquires from the shared 40-connection pool before hitting the DB.
        </p>
      )}
    </div>
  );
}
