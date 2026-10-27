"use client";

import type { EngineSnapshot } from "@/lib/experience/types";

const STAGES = [
  { id: "client", label: "Client" },
  { id: "flag", label: "Flag" },
  { id: "pool", label: "Pool" },
  { id: "db", label: "DB" },
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
          return (
            <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div
                className={`flex min-h-10 w-full flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors ${
                  on
                    ? "border-[color:var(--exp-accent)] bg-[color-mix(in_srgb,var(--exp-accent)_10%,#fffefb)]"
                    : "border-[color:var(--exp-line)] bg-[color:var(--exp-panel)]"
                } ${dim ? "opacity-55" : ""}`}
              >
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--exp-faint)]">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-[color:var(--exp-fg)] sm:text-sm">
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 ? (
                <svg
                  width="18"
                  height="12"
                  viewBox="0 0 18 12"
                  className="hidden shrink-0 text-[color:var(--exp-amber)] xs:block sm:inline"
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
              ) : null}
            </div>
          );
        })}
      </div>
      {pressure ? (
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-accent)]">
          Pool saturated — arrivals wait beside the grid. Busy slots stay ≤ {snap.poolSize}.
        </p>
      ) : null}
    </div>
  );
}
