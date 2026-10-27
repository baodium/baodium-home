"use client";

import { AnimatePresence, motion } from "motion/react";
import type { EngineSnapshot, GuidedStepId } from "@/lib/experience/types";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

/** Step-level “what you’re seeing” — teaches the scene, not just the next button. */
const STEP_SEEING: Partial<Record<GuidedStepId, { title: string; body: string }>> = {
  inspect: {
    title: "What you’re seeing",
    body: "Two product pages, same request path. Recommendations are still behind a flag — toggling preview only changes the mock UI, not production traffic.",
  },
  review: {
    title: "What you’re seeing",
    body: "Deploy at 0% means the code is live but nobody is hashed into the cohort. Ship ≠ enable. The pool stays quiet until exposure rises.",
  },
  trace: {
    title: "What you’re seeing",
    body: "One request acquires a shared pool slot, holds it for the lookup, then releases. Correct code still consumes a finite connection.",
  },
  rollout: {
    title: "What you’re seeing",
    body: "Exposure grows the cohort of users who take the slow path. Stable hashing keeps the same people in or out as you move the dial.",
  },
  inspect_prod: {
    title: "What you’re seeing",
    body: "Busy slots never exceed 40. Little’s Law estimates demand as λ × W. When demand > 40, overflow waits — it does not invent a 41st busy slot.",
  },
  pressure: {
    title: "What you’re seeing",
    body: "Traffic or hold time climbs. Slots fill; waiters appear beside the grid. The incident is resource contention, not a bug in the query text.",
  },
  decide: {
    title: "What you’re seeing",
    body: "Pause slows new cohort growth. Disable stops new recommendation work while in-flight holds finish. Investigate leaves pressure running.",
  },
  debrief: {
    title: "What you learned",
    body: "Name the shared resource (the 40-slot pool), explain why waiting appeared, and state what disable did to new vs in-flight requests.",
  },
  sandbox: {
    title: "What you’re seeing",
    body: "Same invariants as guided mode. Pressure the pool, then disable — watch new arrivals skip the long path while in-flight holds drain.",
  },
};

function liveInsight(snap: EngineSnapshot): { title: string; body: string } | null {
  if (snap.waitingCount > 0) {
    return {
      title: "Live reading",
      body: `${snap.activeCount} busy (capped at ${snap.poolSize}) · ${snap.waitingCount} waiting. Overflow queues — the pool does not grow past capacity.`,
    };
  }
  if (snap.littles.overDemand) {
    return {
      title: "Live reading",
      body: `Demand ≈ λ × W is above ${snap.poolSize}. Expect waiters next; busy count will still stay ≤ ${snap.poolSize}.`,
    };
  }
  if (snap.controls.featureDisabledForNew) {
    return {
      title: "Live reading",
      body: "New traffic takes the baseline path. In-flight recommendation holds keep their slots until they finish — disable is not a kill switch.",
    };
  }
  if (snap.controls.paused) {
    return {
      title: "Live reading",
      body: `Exposure frozen at ${snap.controls.exposurePct}% — traffic continues at that mix. Pausing does not drain the pool; disable or shed to cut recommendation demand.`,
    };
  }
  return null;
}

export function SeeingCallout({
  stepId,
  mode,
  snap,
}: {
  stepId: GuidedStepId;
  mode: "guided" | "sandbox";
  snap: EngineSnapshot;
}) {
  const reduced = usePrefersReducedMotion();
  const step = mode === "sandbox" ? STEP_SEEING.sandbox : STEP_SEEING[stepId];
  const live = liveInsight(snap);
  const shown = live ?? step;
  if (!shown) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={`${shown.title}-${shown.body.slice(0, 24)}`}
        role="note"
        aria-label={shown.title}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.35, ease }}
        className="rounded-2xl border border-[color-mix(in_srgb,var(--exp-amber)_30%,transparent)] bg-[color-mix(in_srgb,#fff_78%,var(--exp-amber)_6%)] px-4 py-3.5 shadow-[0_12px_32px_-20px_rgba(26,35,48,0.28)]"
      >
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-amber)]">
          {shown.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--exp-fg)]/88">
          {shown.body}
        </p>
        {live && step && live.body !== step.body ? (
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
            {step.body}
          </p>
        ) : null}
      </motion.aside>
    </AnimatePresence>
  );
}
