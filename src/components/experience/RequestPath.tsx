"use client";

import { motion } from "motion/react";
import type { EngineSnapshot } from "@/lib/experience/types";

const STAGES = [
  { id: "client", label: "Client", tip: "Arrivals" },
  { id: "flag", label: "Flag", tip: "Cohort gate" },
  { id: "pool", label: "Pool", tip: "Shared 40" },
  { id: "db", label: "DB", tip: "Hold W" },
] as const;

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
  const activeStage =
    snap.tracedRequest?.phase === "waiting"
      ? "pool"
      : snap.tracedRequest?.phase === "holding"
        ? snap.tracedRequest.path === "recs"
          ? "db"
          : "pool"
        : snap.tracedRequest?.phase === "done"
          ? "client"
          : flagLive
            ? "flag"
            : "client";

  return (
    <div className="exp-panel-flat !py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="exp-kicker">Request path</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          {c.featureDisabledForNew
            ? "New → baseline · in-flight may still hold"
            : flagLive
              ? `Exposure ${c.exposurePct}%`
              : "Flag off · baseline only"}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-1 sm:gap-2">
        {STAGES.map((stage, i) => {
          const on = stage.id === activeStage;
          const dim =
            stage.id === "flag" && !flagLive
              ? true
              : stage.id === "db" && !flagLive && snap.active.every((r) => r.path !== "recs");
          const congested = pressure && (stage.id === "pool" || stage.id === "db");
          return (
            <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div
                className={`relative flex min-h-12 w-full flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors ${
                  on
                    ? "border-[color:var(--exp-accent)] bg-[color-mix(in_srgb,var(--exp-accent)_10%,#fffefb)]"
                    : congested
                      ? "border-[color-mix(in_srgb,var(--exp-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_5%,#fffefb)]"
                      : "border-[color:var(--exp-line)] bg-[color:var(--exp-panel)]"
                } ${dim ? "opacity-55" : ""}`}
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
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-[color:var(--exp-fg)] sm:text-sm">
                  {stage.label}
                </span>
                <span className="hidden font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[color:var(--exp-faint)] sm:inline">
                  {stage.tip}
                </span>
              </div>
              {i < STAGES.length - 1 ? (
                <div className="relative hidden h-3 w-[18px] shrink-0 sm:block">
                  <svg
                    width="18"
                    height="12"
                    viewBox="0 0 18 12"
                    className="absolute inset-0 text-[color:var(--exp-amber)]"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 6h14M11 2l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      className={
                        pressure && !reducedMotion && (stage.id === "pool" || stage.id === "flag")
                          ? "exp-flow-path"
                          : undefined
                      }
                    />
                  </svg>
                  {!reducedMotion && flagLive ? (
                    <motion.span
                      aria-hidden="true"
                      className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[color:var(--exp-accent)]"
                      initial={{ left: 0, opacity: 0 }}
                      animate={{ left: 14, opacity: [0, 1, 0] }}
                      transition={{
                        duration: pressure ? 0.7 : 1.4,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 0.18,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {pressure ? (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-accent)]">
          Pool saturated — arrivals wait beside the grid. Busy slots stay ≤ {snap.poolSize}.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
          Follow the path: flag chooses the cohort, pool serializes shared connections, DB is the
          hold that sets W.
        </p>
      )}
    </div>
  );
}
