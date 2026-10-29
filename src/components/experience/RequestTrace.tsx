"use client";

import { motion } from "motion/react";
import type { SimRequest } from "@/lib/experience/types";

export function RequestTrace({
  req,
  now,
  reducedMotion,
}: {
  req: SimRequest | null;
  now: number;
  reducedMotion?: boolean;
}) {
  if (!req) {
    return (
      <div className="exp-panel">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Request trace</h3>
        <p className="mt-2 text-sm text-[color:var(--exp-muted)]">
          Send or select a request to see wait, lookup, and the rest of the time, and why total latency grows
          under contention.
        </p>
      </div>
    );
  }

  const waitSec =
    req.acquireTime !== null && req.waitStart !== null
      ? req.acquireTime - req.waitStart
      : req.phase === "waiting" && req.waitStart !== null
        ? now - req.waitStart
        : 0;
  const holdSec =
    req.acquireTime !== null
      ? (req.releaseTime ?? now) - req.acquireTime
      : 0;
  const restSec = Math.max(0, 0.004);
  const total =
    req.doneTime !== null ? req.doneTime - req.arrivalTime : now - req.arrivalTime;
  const waitMs = waitSec * 1000;
  const teaching = req.timedOut
    ? "This request hit connectionTimeout while waiting to acquire. saturation became an error instead of an unbounded wait."
    : req.shed
      ? "Load shed skipped the recs lookup because pool util was over the gate. The page stayed on the baseline hold."
      : req.cacheHit
        ? "Cache hit: still on the recs cohort path, but hold ≈ baseline. That is how caching cuts W in L = λ × W."
        : waitMs > 5
          ? "Most of this request’s extra latency is queueing. waiting for a free slot, not the SQL itself."
          : req.exposed
            ? "Hold time is the recommendation lookup on a shared connection. Multiply by concurrency and you get Little’s Law demand."
            : "Baseline path: short hold, no recommendation query. Compare with an exposed request under the same traffic.";

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Request {req.id}</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-muted)]">
          {req.phase} · {req.path}
          {req.timedOut ? " · timeout" : ""}
          {req.shed ? " · shed" : ""}
          {req.cacheHit ? " · cache" : ""}
        </p>
      </div>
      <p className="mt-1 text-sm text-[color:var(--exp-muted)]">
        User {req.userId}
        {req.exposed ? " · exposed to recommendations" : " · baseline path"}
        {req.slotIndex !== null ? ` · slot ${req.slotIndex + 1}` : ""}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Wait" value={`${waitMs.toFixed(0)} ms`} hot={waitMs > 20} />
        <Metric label="Lookup hold" value={`${(holdSec * 1000).toFixed(0)} ms`} />
        <Metric label="Rest" value={`${(restSec * 1000).toFixed(0)} ms`} />
        <Metric label="Total" value={`${(total * 1000).toFixed(0)} ms`} />
      </dl>
      <TimingBar wait={waitSec} hold={holdSec} rest={restSec} reducedMotion={reducedMotion} />
      <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[color:var(--exp-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color:var(--exp-amber)]" /> Wait
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color:var(--exp-accent)]" /> Hold
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color-mix(in_srgb,var(--exp-fg)_28%,transparent)]" />{" "}
          Rest
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[color:var(--exp-muted)]">{teaching}</p>
    </div>
  );
}

function Metric({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
        {label}
      </dt>
      <dd
        className={`mt-1 font-mono text-sm tabular-nums ${
          hot ? "text-[color:var(--exp-accent)]" : "text-[color:var(--exp-fg)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TimingBar({
  wait,
  hold,
  rest,
  reducedMotion,
}: {
  wait: number;
  hold: number;
  rest: number;
  reducedMotion?: boolean;
}) {
  const sum = wait + hold + rest || 1;
  const parts = [
    { key: "wait", pct: (wait / sum) * 100, className: "bg-[color:var(--exp-amber)]" },
    { key: "hold", pct: (hold / sum) * 100, className: "bg-[color:var(--exp-accent)]" },
    {
      key: "rest",
      pct: (rest / sum) * 100,
      className: "bg-[color-mix(in_srgb,var(--exp-fg)_28%,transparent)]",
    },
  ];
  return (
    <div
      className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[color:var(--exp-slot-free)]"
      aria-hidden="true"
    >
      {parts.map((p) => (
        <motion.div
          key={p.key}
          className={p.className}
          initial={false}
          animate={{ width: `${p.pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
