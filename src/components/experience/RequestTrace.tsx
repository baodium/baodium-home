"use client";

import type { SimRequest } from "@/lib/experience/types";

export function RequestTrace({
  req,
  now,
}: {
  req: SimRequest | null;
  now: number;
}) {
  if (!req) {
    return (
      <div className="exp-panel">
        <h3 className="font-serif text-lg text-cream">Request trace</h3>
        <p className="mt-2 text-sm text-cream/55">
          Send or select a request to see wait / lookup / rest timing.
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

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-cream">Request {req.id}</h3>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cream/45">
          {req.phase} · {req.path}
        </p>
      </div>
      <p className="mt-1 text-sm text-cream/55">
        User {req.userId}
        {req.exposed ? " · exposed to recommendations" : " · baseline path"}
        {req.slotIndex !== null ? ` · slot ${req.slotIndex + 1}` : ""}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Wait" value={`${(waitSec * 1000).toFixed(0)} ms`} />
        <Metric label="Lookup hold" value={`${(holdSec * 1000).toFixed(0)} ms`} />
        <Metric label="Rest" value={`${(restSec * 1000).toFixed(0)} ms`} />
        <Metric label="Total" value={`${(total * 1000).toFixed(0)} ms`} />
      </dl>
      <TimingBar wait={waitSec} hold={holdSec} rest={restSec} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-cream/40">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-cream">{value}</dd>
    </div>
  );
}

function TimingBar({
  wait,
  hold,
  rest,
}: {
  wait: number;
  hold: number;
  rest: number;
}) {
  const sum = wait + hold + rest || 1;
  return (
    <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-cream/10" aria-hidden="true">
      <div className="bg-amber/80" style={{ width: `${(wait / sum) * 100}%` }} />
      <div className="bg-cinnabar" style={{ width: `${(hold / sum) * 100}%` }} />
      <div className="bg-cream/35" style={{ width: `${(rest / sum) * 100}%` }} />
    </div>
  );
}
