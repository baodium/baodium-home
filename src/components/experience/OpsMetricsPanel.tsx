"use client";

import { AnimatePresence, motion } from "motion/react";
import type { EngineSnapshot } from "@/lib/experience/types";

/**
 * Production-shaped gauges so the lab feels like reading a real pool dashboard . 
 * not a toy counter strip.
 */
export function OpsMetricsPanel({
  snap,
  reducedMotion,
}: {
  snap: EngineSnapshot;
  reducedMotion?: boolean;
}) {
  const utilPct = snap.utilization * 100;
  const acqP50 = snap.acquireWaitP50 * 1000;
  const acqP99 = snap.acquireWaitP99 * 1000;
  const timeoutArmed = snap.controls.acquireTimeoutSec !== null;
  const timeoutMs = (snap.controls.acquireTimeoutSec ?? 0) * 1000;
  const nearTimeout =
    timeoutArmed && acqP99 > 0 && timeoutMs > 0 && acqP99 / timeoutMs > 0.6;

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Ops metrics</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          Simulated · pool.* shaped
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Gauge
          name="pool.active"
          value={`${snap.activeCount}`}
          hint={`/ ${snap.poolSize}`}
          tip="Connections currently held. Never exceeds pool size. Overflow waits instead of inventing a 41st slot."
          good="Headroom under the cap (often aim ~60–70% busy under load)."
          hot={snap.activeCount >= snap.poolSize}
        />
        <Gauge
          name="pool.idle"
          value={`${snap.idleCount}`}
          hint="free"
          tip="Slots available to acquire right now."
          good="Some idle left so the next arrival does not queue."
        />
        <Gauge
          name="pool.pending"
          value={`${snap.waitingCount}`}
          hint="waiters"
          tip="Requests waiting for a free connection. Appears when demand (λ×W) exceeds the pool."
          good="Near zero. Sustained pending = saturation, not a slow SQL string alone."
          hot={snap.waitingCount > 0}
        />
        <Gauge
          name="pool.util"
          value={`${utilPct.toFixed(0)}%`}
          hint="ρ"
          tip="Busy ÷ pool size. Thin headroom means the next traffic bump creates waiters."
          good="Usually keep under ~80% for bursty arrivals."
          hot={utilPct >= 85}
        />
        <Gauge
          name="acquire.wait.p50"
          value={`${acqP50.toFixed(0)}`}
          hint="ms"
          tip="Median time spent waiting for a connection before the hold starts."
          good="Near 0 ms when the pool has headroom."
        />
        <Gauge
          name="acquire.wait.p99"
          value={`${acqP99.toFixed(0)}`}
          hint="ms"
          tip="Worst-case acquire wait. This stretches p99 latency first under contention."
          good="Well below connectionTimeout; climbing toward it is the error cliff."
          hot={nearTimeout || acqP99 > 40}
        />
        <Gauge
          name="acquire.timeouts"
          value={`${snap.timeoutCount}`}
          hint={timeoutArmed ? `to ${timeoutMs.toFixed(0)}ms` : "disarmed"}
          tip="Requests that exceeded connectionTimeout while waiting for a slot. Hard failures."
          good="Zero. Prefer shed/disable before relying on timeouts."
          hot={snap.timeoutCount > 0}
        />
        <Gauge
          name="throughput"
          value={snap.throughputRps.toFixed(0)}
          hint="rps"
          tip="Completions per second right now (simulated)."
          good="Stable under load; a drop with rising pending means the pool is the bottleneck."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PathCard
          label="baseline path"
          p50={snap.latencyBaseline.p50 * 1000}
          p99={snap.latencyBaseline.p99 * 1000}
          count={snap.latencyBaseline.count}
        />
        <PathCard
          label="recs path"
          p50={snap.latencyRecs.p50 * 1000}
          p99={snap.latencyRecs.p99 * 1000}
          count={snap.latencyRecs.count}
          accent
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={snap.slo.breached ? "burn" : "ok"}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-xl border px-3 py-2.5 ${
            snap.slo.breached
              ? "border-[color-mix(in_srgb,var(--exp-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--exp-accent)_8%,transparent)]"
              : "border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fff_50%,transparent)]"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
              Latency SLO · p99 &lt; {(snap.slo.targetP99Sec * 1000).toFixed(0)} ms
            </p>
            <p
              className={`font-mono text-sm tabular-nums ${
                snap.slo.breached
                  ? "text-[color:var(--exp-accent)]"
                  : "text-[color:var(--exp-fg)]"
              }`}
            >
              {(snap.slo.observedP99Sec * 1000).toFixed(0)} ms
              {snap.completedCount > 8 ? (
                <span className="ml-2 text-[0.65rem] text-[color:var(--exp-faint)]">
                  burn {snap.slo.burnRatio.toFixed(1)}×
                </span>
              ) : null}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]">
            <motion.div
              className={`h-full rounded-full ${
                snap.slo.breached
                  ? "bg-[color:var(--exp-accent)]"
                  : "bg-[color:var(--exp-slot-base)]"
              }`}
              initial={false}
              animate={{
                width: `${Math.min(100, (snap.slo.burnRatio / 2) * 100)}%`,
              }}
              transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
            {snap.slo.breached
              ? "Tail is past budget. Check acquire.wait.p99 and pool.pending before blaming the query text. Queueing often dominates."
              : "When util climbs, watch acquire.wait.p99 approach connectionTimeout. That is the error cliff."}
          </p>
        </motion.div>
      </AnimatePresence>

      {(snap.shedCount > 0 || snap.cacheHitCount > 0) && (
        <p className="mt-3 font-mono text-[0.65rem] text-[color:var(--exp-faint)]">
          mitigations · shed {snap.shedCount} · cache hits {snap.cacheHitCount}
        </p>
      )}
    </div>
  );
}

function Gauge({
  name,
  value,
  hint,
  tip,
  good,
  hot,
}: {
  name: string;
  value: string;
  hint: string;
  tip?: string;
  good?: string;
  hot?: boolean;
}) {
  const detail = [tip, good ? `Good: ${good}` : null].filter(Boolean).join(" · ");
  return (
    <div
      className="instrument group/gauge relative"
      data-hot={hot ? "true" : undefined}
      tabIndex={detail ? 0 : undefined}
    >
      <p className="instrument-label truncate">
        {name}
      </p>
      <p
        className={`instrument-value instrument-value-sm mt-2 ${
          hot ? "text-[color:var(--exp-accent)]" : "text-[color:var(--exp-fg)]"
        }`}
      >
        {value}
        <span className="ml-1 text-[0.6rem] text-[color:var(--exp-faint)]">{hint}</span>
      </p>
      {hot && good ? (
        <p className="mt-1.5 line-clamp-1 text-[0.62rem] leading-snug text-[color:var(--exp-accent)]">
          {good}
        </p>
      ) : null}
      {detail ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-20 hidden w-[min(16rem,70vw)] rounded-lg border border-[color:var(--exp-line-strong)] bg-[color:var(--exp-panel)] px-2.5 py-2 text-left text-[0.68rem] leading-snug text-[color:var(--exp-fg)] shadow-[0_14px_32px_-18px_rgba(26,35,48,0.4)] group-focus-within/gauge:block group-hover/gauge:block"
        >
          {detail}
        </span>
      ) : null}
    </div>
  );
}

function PathCard({
  label,
  p50,
  p99,
  count,
  accent,
}: {
  label: string;
  p50: number;
  p99: number;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--exp-line)] px-3 py-2.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
        {label}
        <span className="ml-2 normal-case tracking-normal text-[color:var(--exp-faint)]">
          n={count}
        </span>
      </p>
      <div className="mt-2 flex gap-4">
        <div>
          <p className="font-mono text-[0.55rem] uppercase text-[color:var(--exp-faint)]">p50</p>
          <p className="font-mono text-sm tabular-nums text-[color:var(--exp-fg)]">
            {count ? `${p50.toFixed(0)} ms` : "—"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[0.55rem] uppercase text-[color:var(--exp-faint)]">p99</p>
          <p
            className={`font-mono text-sm tabular-nums ${
              accent ? "text-[color:var(--exp-accent)]" : "text-[color:var(--exp-fg)]"
            }`}
          >
            {count ? `${p99.toFixed(0)} ms` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
