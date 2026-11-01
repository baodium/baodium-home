"use client";

import { motion } from "motion/react";
import { requestTiming } from "@/lib/experience/readout";
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

  const timing = requestTiming(req, now);
  const waitMs = timing.waitSec * 1000;
  const holdMs = timing.holdSec * 1000;
  const callerMs = timing.callerSec * 1000;
  const totalMs = timing.totalSec * 1000;
  const teaching = req.timedOut
    ? "This request hit connectionTimeout while waiting to acquire. Saturation became an error instead of an unbounded wait."
    : req.shed
      ? "Load shed skipped the recommendation lookup because pool util was over the gate. The page stayed on Catalog and did not take a pool slot."
      : req.cacheHit
        ? "Cache hit on the recommendation path. The lookup never acquired a pool slot, so it does not add to W."
        : waitMs > 5
          ? "Most of this request’s extra latency is acquire wait, time spent beside the pool, not inside the query."
          : req.exposed
            ? "The database hold is the recommendation lookup on a shared connection. Catalog time is separate and does not occupy a slot."
            : "Baseline path: Product Page calls Catalog and releases. No recommendation query, no pool slot.";

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
        <Metric label="Caller" value={`${callerMs.toFixed(0)} ms`} />
        <Metric label="Acquire wait" value={`${waitMs.toFixed(0)} ms`} hot={waitMs > 20} />
        <Metric label="DB hold" value={`${holdMs.toFixed(0)} ms`} />
        <Metric label="Total" value={`${totalMs.toFixed(0)} ms`} />
      </dl>
      <TimingBar caller={timing.callerSec} wait={timing.waitSec} hold={timing.holdSec} reducedMotion={reducedMotion} />
      <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[color:var(--exp-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color-mix(in_srgb,var(--exp-fg)_28%,transparent)]" />{" "}
          Caller
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color:var(--exp-amber)]" /> Wait
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-[color:var(--exp-accent)]" /> Hold
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
          hot ? "text-[color:var(--exp-accent-text)]" : "text-[color:var(--exp-fg)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TimingBar({
  caller,
  wait,
  hold,
  reducedMotion,
}: {
  caller: number;
  wait: number;
  hold: number;
  reducedMotion?: boolean;
}) {
  const sum = caller + wait + hold || 1;
  const parts = [
    {
      key: "caller",
      pct: (caller / sum) * 100,
      className: "bg-[color-mix(in_srgb,var(--exp-fg)_28%,transparent)]",
    },
    { key: "wait", pct: (wait / sum) * 100, className: "bg-[color:var(--exp-amber)]" },
    { key: "hold", pct: (hold / sum) * 100, className: "bg-[color:var(--exp-accent)]" },
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
