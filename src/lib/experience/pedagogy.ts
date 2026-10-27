import type { EngineSnapshot, GuidedStepId } from "@/lib/experience/types";

export type PedagogyLesson = {
  id: string;
  eyebrow: string;
  title: string;
  /** What the learner is seeing right now. */
  seeing: string;
  /** Why it matters / the teaching point. */
  why: string;
  /** Optional next action hint. */
  next?: string;
  tone: "calm" | "warn" | "insight" | "recover";
};

/**
 * Pick the most relevant teaching overlay from live sim state + guided step.
 * Prefer concrete observations (waiters, disable drain, p99 spread) over step prose.
 */
export function selectPedagogyLesson(
  snap: EngineSnapshot,
  stepId: GuidedStepId,
  mode: "guided" | "sandbox",
): PedagogyLesson {
  const { littles, controls } = snap;
  const fill = snap.activeCount / snap.poolSize;
  const p99ms = snap.latencyP99 * 1000;
  const p50ms = snap.latencyP50 * 1000;
  const spread = p99ms - p50ms;

  if (controls.featureDisabledForNew && snap.activeCount > 0) {
    return {
      id: "disable-inflight",
      eyebrow: "What’s happening",
      title: "Disable drains — it doesn’t kill",
      seeing: `${snap.activeCount} copper slots still hold in-flight recommendation work. New arrivals skip the extra lookup.`,
      why: "A kill switch stops new demand on the shared pool. Holds already acquired keep their connection until release — waiters clear as those finish.",
      next: "Watch busy drop toward baseline as releases free slots.",
      tone: "recover",
    };
  }

  if (controls.featureDisabledForNew && snap.waitingCount === 0 && snap.activeCount === 0) {
    return {
      id: "disable-cleared",
      eyebrow: "What’s happening",
      title: "Pool quiet after disable",
      seeing: "Busy and waiters are near zero. New traffic takes the ~12ms baseline path.",
      why: "Removing the long hold from the request path collapses λ×W under the 40-slot cap.",
      tone: "recover",
    };
  }

  if (snap.waitingCount > 0) {
    return {
      id: "waiters-wall",
      eyebrow: "What’s happening",
      title: "Demand hit the capacity wall",
      seeing: `${snap.activeCount}/${snap.poolSize} busy · ${snap.waitingCount} waiting. No 41st slot — excess sits in the waiter queue.`,
      why: `Little’s Law estimates demand ≈ ${littles.L.toFixed(0)} (= λ × W). When that exceeds 40, correct code still waits because the pool is shared and finite.`,
      next:
        mode === "guided" && stepId === "pressure"
          ? "Predict: disable vs pause — then decide in the next step."
          : "Try disable for new traffic and compare new vs in-flight.",
      tone: "warn",
    };
  }

  if (littles.overDemand && snap.waitingCount === 0) {
    return {
      id: "demand-rising",
      eyebrow: "What’s happening",
      title: "Demand is over capacity",
      seeing: `λ×W ≈ ${littles.L.toFixed(0)} while the pool is only ${snap.poolSize}. Waiters should appear as slots stay full.`,
      why: "Occupancy demand can exceed the pool; active connections never can. The surplus becomes queueing delay.",
      tone: "warn",
    };
  }

  if (spread > 40 && snap.completedCount > 12) {
    return {
      id: "tail-spread",
      eyebrow: "What’s happening",
      title: "p50 holds · p99 stretches",
      seeing: `p50 ≈ ${p50ms.toFixed(0)} ms while p99 ≈ ${p99ms.toFixed(0)} ms — a ${spread.toFixed(0)} ms spread from wait + long holds.`,
      why: "Queueing delay hits a fraction of requests hardest. The median can look fine while the tail already shows contention.",
      next: "Select a waiting request to see wait vs hold timing.",
      tone: "insight",
    };
  }

  if (fill > 0.85 && snap.waitingCount === 0) {
    return {
      id: "near-full",
      eyebrow: "What’s happening",
      title: "Pool nearly saturated",
      seeing: `${snap.activeCount} of ${snap.poolSize} slots busy. Headroom is thin — a small traffic bump creates waiters.`,
      why: "Shared resources fail at the margin. Headroom, not average idle, decides whether the next arrival waits.",
      tone: "warn",
    };
  }

  if (snap.tracedRequest && (snap.tracedRequest.phase === "holding" || snap.tracedRequest.phase === "waiting")) {
    const r = snap.tracedRequest;
    return {
      id: "trace-live",
      eyebrow: "What’s happening",
      title: r.phase === "waiting" ? "This request is queued" : "This request holds a slot",
      seeing:
        r.phase === "waiting"
          ? `${r.id} arrived when all ${snap.poolSize} connections were busy — it waits beside the grid.`
          : `${r.id} acquired a connection${r.exposed ? " for the recommendation lookup" : " on the baseline path"}.`,
      why: "Correct code still consumes a shared resource. The highlight in the code panel is the line that owns the hold.",
      tone: "insight",
    };
  }

  if (controls.featureEnabled && controls.exposurePct === 0) {
    return {
      id: "deploy-zero",
      eyebrow: "What’s happening",
      title: "Deployed, not enabled",
      seeing: "Flag is ON at 0% exposure — code is live, but no user is hashed into the cohort.",
      why: "Deploy ≠ enable. You ship dark, then raise exposure so risk is controlled by the flag, not by a redeploy.",
      next: "Trace one forced request, then raise exposure.",
      tone: "calm",
    };
  }

  if (controls.featureEnabled && controls.exposurePct > 0 && controls.exposurePct < 40 && !littles.overDemand) {
    return {
      id: "partial-rollout",
      eyebrow: "What’s happening",
      title: "Partial cohort, shared pool",
      seeing: `${controls.exposurePct}% of users take the longer hold; everyone still shares the same 40 connections.`,
      why: `Even a minority path can dominate occupancy when W is larger. Here λ≈${littles.lambda.toFixed(0)}/s · W≈${(littles.W * 1000).toFixed(0)}ms → L≈${littles.L.toFixed(0)}.`,
      tone: "calm",
    };
  }

  // Step-aware defaults when the sim is quiet
  switch (stepId) {
    case "inspect":
      return {
        id: "step-inspect",
        eyebrow: "Learn this",
        title: "Same page, one extra lookup",
        seeing: "Toggle the storefront. Recommendations appear only on the proposed path.",
        why: "The product change looks small in the UI — the cost lives in an extra synchronous DB hold on the request path.",
        next: "Toggle the preview, then continue.",
        tone: "calm",
      };
    case "review":
      return {
        id: "step-review",
        eyebrow: "Learn this",
        title: "Ship dark first",
        seeing: "The flagged branch acquires from a shared pool only when enabled for the user.",
        why: "Feature flags separate deploy from enable so you can stop new demand without rolling back code.",
        next: "Deploy at 0% exposure.",
        tone: "calm",
      };
    case "trace":
      return {
        id: "step-trace",
        eyebrow: "Learn this",
        title: "Follow one request",
        seeing: "A single forced request will highlight the code line, acquire a slot, query, then release.",
        why: "One correct request is harmless. Many concurrent correct requests compete for the same 40 slots.",
        next: "Send one request and watch the pool.",
        tone: "calm",
      };
    case "rollout":
      return {
        id: "step-rollout",
        eyebrow: "Learn this",
        title: "Exposure changes who pays W",
        seeing: "Stable hashing keeps the same users in or out as you move the percentage.",
        why: "Raising exposure raises the fraction of arrivals that take the long hold — L = λ × W climbs with that mix.",
        next: "Predict before 25%, then set exposure.",
        tone: "calm",
      };
    case "inspect_prod":
      return {
        id: "step-inspect-prod",
        eyebrow: "Learn this",
        title: "Read the pool like production",
        seeing: `Busy ${snap.activeCount}/${snap.poolSize} · waiters ${snap.waitingCount} · demand ≈ ${snap.demandOccupancy.toFixed(0)}.`,
        why: "Active never exceeds the pool. If λ×W > 40, the overflow is waiting — not fake extra busy slots.",
        tone: "insight",
      };
    case "pressure":
      return {
        id: "step-pressure",
        eyebrow: "Learn this",
        title: "Surge until the wall",
        seeing: "Traffic and hold time will push demand past 40. Watch waiters appear beside the grid.",
        why: "Resource contention is a capacity story: correct code + shared finite pool + enough concurrency.",
        next: "Surge, then predict disable semantics.",
        tone: "warn",
      };
    case "decide":
      return {
        id: "step-decide",
        eyebrow: "Learn this",
        title: "Operate the incident",
        seeing: "Pause slows cohort growth. Disable stops new recommendation holds. Investigate leaves pressure running.",
        why: "Your choice changes this same system — then the debrief names what actually happened to new vs in-flight work.",
        tone: "insight",
      };
    case "debrief":
      return {
        id: "step-debrief",
        eyebrow: "Takeaway",
        title: "Name the shared resource",
        seeing: "Correct code waited because every exposed request held a connection from the same 40-slot pool.",
        why: "Disable stops new recommendation work; in-flight holds finish. The pool — not the feature idea — was the bottleneck.",
        tone: "insight",
      };
    default:
      return {
        id: "sandbox-default",
        eyebrow: "Sandbox",
        title: "Pressure the invariants",
        seeing: "Vary λ, exposure, and lookup duration. Busy stays ≤ 40; waiters absorb the rest.",
        why: "If you can explain waiters, Little’s Law, and disable-vs-inflight from what you see, the chapter stuck.",
        tone: "calm",
      };
  }
}
