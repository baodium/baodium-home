import type { EngineSnapshot, GuidedStepId, LabMode } from "@/lib/experience/types";

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
  /** Optional production mapping. */
  prod?: string;
  tone: "calm" | "warn" | "insight" | "recover";
};

/**
 * Pick the most relevant teaching overlay from live sim state + guided step.
 * Prefer concrete observations (waiters, timeouts, shed, disable drain) over step prose.
 */
export function selectPedagogyLesson(
  snap: EngineSnapshot,
  stepId: GuidedStepId,
  mode: LabMode,
): PedagogyLesson {
  const { littles, controls } = snap;
  const fill = snap.utilization;
  const p99ms = snap.latencyP99 * 1000;
  const p50ms = snap.latencyP50 * 1000;
  const spread = p99ms - p50ms;
  const acqP99ms = snap.acquireWaitP99 * 1000;

  if (controls.featureDisabledForNew && snap.activeCount > 0) {
    return {
      id: "disable-inflight",
      eyebrow: "What’s happening",
      title: "Disable drains; it does not kill",
      seeing: `${snap.activeCount} busy slot${snap.activeCount === 1 ? "" : "s"} still hold in-flight recommendation work. New arrivals skip the extra lookup.`,
      why: "Disable stops new demand on the shared pool. Holds already acquired keep their connection until release. Waiters clear as those finish.",
      next: "Watch busy drop toward baseline as releases free slots.",
      prod: "In prod: flip the flag OFF (or 0% exposure). Expect in-flight checkouts to finish; alert on pool.pending decaying, not instantly zeroing.",
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
      prod: "Confirm pool.active and pool.pending stay low; p99 should fall toward baseline hold.",
      tone: "recover",
    };
  }

  if (controls.paused && !controls.featureDisabledForNew) {
    return {
      id: "rollout-paused",
      eyebrow: "What’s happening",
      title: "Exposure frozen; demand continues",
      seeing: `Rollout paused at ${controls.exposurePct}%. Busy ${snap.activeCount}/${snap.poolSize}, pending ${snap.waitingCount}. Traffic still arrives; the cohort just cannot grow.`,
      why: "Pause stops raising exposure. It does not cut λ or kill in-flight holds. Waiters clear only if demand (λ×W) falls under 40.",
      next: "Compare with Disable: disable routes new traffic to the baseline path and drains recommendation demand.",
      prod: "Pause/hold a progressive rollout at the current %. Watch pool.pending: it will not magically drop unless W or λ changes.",
      tone: "insight",
    };
  }

  // Prefer live saturation signals over sticky counters (timeouts/sheds persist forever).
  if (snap.waitingCount > 0) {
    return {
      id: "waiters-wall",
      eyebrow: "What’s happening",
      title: "Demand hit the capacity wall",
      seeing: `${snap.activeCount}/${snap.poolSize} busy · ${snap.waitingCount} waiting · acquire.wait.p99 ≈ ${acqP99ms.toFixed(0)} ms. No 41st slot; excess sits in the waiter queue.`,
      why: `Little’s Law estimates demand ≈ ${littles.L.toFixed(0)} (= λ × W). When that exceeds 40, correct code still waits because the pool is shared and finite.`,
      next:
        mode === "guided" && stepId === "saturation"
          ? "Predict: disable vs pause. Then investigate and mitigate."
          : "Try disable, shed-at-util, or acquire timeout. Compare new vs in-flight.",
      prod: "pool.active ≈ max · pool.pending > 0 sustained = saturation. Size from λ×W with headroom, or cut W.",
      tone: "warn",
    };
  }

  if (
    snap.timeoutCount > 0 &&
    controls.acquireTimeoutSec !== null &&
    snap.waitingCount === 0
  ) {
    return {
      id: "acquire-timeouts",
      eyebrow: "What’s happening",
      title: "Acquire timeouts are hard failures",
      seeing: `${snap.timeoutCount} request${snap.timeoutCount === 1 ? "" : "s"} exceeded the ${(controls.acquireTimeoutSec * 1000).toFixed(0)}ms connectionTimeout while waiting for a free slot.`,
      why: "Timeouts bound queueing delay but convert saturation into errors. Prefer shedding or disabling the expensive path before the timeout wall.",
      next: "Compare shed-at-util vs timeout: one drops work early; the other fails late.",
      prod: "Alert on pool.acquire.timeouts > 0. Pair with pool.pending and acquire.wait.p99 vs connectionTimeout.",
      tone: "warn",
    };
  }

  if (
    snap.shedCount > 8 &&
    controls.shedAtUtil !== null &&
    snap.utilization >= controls.shedAtUtil - 0.05
  ) {
    return {
      id: "load-shed",
      eyebrow: "What’s happening",
      title: "Shedding protects the pool",
      seeing: `${snap.shedCount} arrivals skipped recommendations because utilization hit ≥${Math.round(controls.shedAtUtil * 100)}%.`,
      why: "Graceful degradation: keep the page fast by dropping the optional lookup when the shared resource is saturated.",
      prod: "Implement as a util/pending gate before acquire. Same idea as adaptive concurrency or priority load shedding.",
      tone: "insight",
    };
  }

  if (controls.cacheHitRate > 0.2 && snap.cacheHitCount > 8 && !littles.overDemand) {
    return {
      id: "cache-cuts-w",
      eyebrow: "What’s happening",
      title: "Cache shortens W, not λ",
      seeing: `${Math.round(controls.cacheHitRate * 100)}% cache hits · ${snap.cacheHitCount} hits so far. Mean hold drops; arrival rate is unchanged.`,
      why: "Little’s Law: L = λ × W. Caching attacks W. Disabling the feature or shedding attacks the fraction of traffic that pays the long hold.",
      prod: "Measure checkout hold time (usage histogram), not only query duration. Cache wins show up as shorter holds.",
      tone: "insight",
    };
  }

  if (snap.slo.breached && snap.completedCount > 12) {
    return {
      id: "slo-burn",
      eyebrow: "What’s happening",
      title: "p99 is burning the latency SLO",
      seeing: `Observed p99 ≈ ${p99ms.toFixed(0)} ms vs ${(snap.slo.targetP99Sec * 1000).toFixed(0)} ms target (burn ${snap.slo.burnRatio.toFixed(1)}×).`,
      why: "Saturation shows up in the tail first. Median can look fine while acquire wait stretches p99 past the budget.",
      next: "Open Ops metrics. Check acquire.wait.p99 and pool.pending before blaming the SQL text.",
      prod: "Page on latency burn + pool.pending, not only CPU. ConnectionTimeout approaching = imminent errors.",
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
      prod: "Watch pending rise before timeouts. Utilization → 1 is the harbinger; wait time is the user impact.",
      tone: "warn",
    };
  }

  if (spread > 40 && snap.completedCount > 12) {
    return {
      id: "tail-spread",
      eyebrow: "What’s happening",
      title: "p50 holds · p99 stretches",
      seeing: `p50 ≈ ${p50ms.toFixed(0)} ms while p99 ≈ ${p99ms.toFixed(0)} ms. a ${spread.toFixed(0)} ms spread from wait + long holds.`,
      why: "Queueing delay hits a fraction of requests hardest. The median can look fine while the tail already shows contention.",
      next: "Select a waiting request to see wait vs hold timing. Compare baseline vs recs path latency.",
      prod: "Split latency by feature cohort. A minority path with large W can dominate pool occupancy.",
      tone: "insight",
    };
  }

  if (fill > 0.85 && snap.waitingCount === 0) {
    return {
      id: "near-full",
      eyebrow: "What’s happening",
      title: "Pool nearly saturated",
      seeing: `${snap.activeCount} of ${snap.poolSize} slots busy (${(fill * 100).toFixed(0)}% util). Headroom is thin. a small traffic bump creates waiters.`,
      why: "Shared resources fail at the margin. Headroom, not average idle, decides whether the next arrival waits.",
      prod: "Capacity targets often sit at 60–70% util for bursty arrivals. 85%+ leaves almost no queueing margin.",
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
          ? `${r.id} arrived when all ${snap.poolSize} connections were busy. it waits beside the grid.`
          : `${r.id} acquired a connection${r.exposed ? " for the recommendation lookup" : " on the baseline path"}${r.cacheHit ? " (cache hit. Short hold)" : ""}.`,
      why: "Correct code still consumes a shared resource. The highlight in the code panel is the line that owns the hold.",
      prod: "Instrument checkout→checkin as hold time. Query duration alone understates W.",
      tone: "insight",
    };
  }

  if (controls.featureEnabled && controls.exposurePct === 0) {
    return {
      id: "deploy-zero",
      eyebrow: "What’s happening",
      title: "Deployed, not enabled",
      seeing: "Flag is ON at 0% exposure. Code is live, but no user is hashed into the cohort.",
      why: "Shipping code is not the same as enabling it. You ship dark, then raise exposure so risk is controlled by the flag, not by a redeploy.",
      next: "Trace one forced request, then raise exposure.",
      prod: "Dark launch: binary present, cohort empty. Roll forward/back with exposure, not builds.",
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
      prod: "pool_floor ≈ ceil(λ × W × 1.25). Raising exposure raises effective W for the mix. Recalculate before 100%.",
      tone: "calm",
    };
  }

  switch (stepId) {
    case "inspect":
      return {
        id: "step-inspect",
        eyebrow: "Learn this",
        title: "Same page, one extra lookup",
        seeing: "Toggle the storefront. Recommendations appear only on the proposed path.",
        why: "The product change looks small in the UI. The cost lives in an extra synchronous DB hold on the request path.",
        next: "Toggle the preview, then continue.",
        tone: "calm",
      };
    case "deploy":
      return {
        id: "step-deploy",
        eyebrow: "Learn this",
        title: "Ship dark first",
        seeing:
          "Product Page can call Recommendation only when the flag exposes the user. The shared pool lives in Recommendation, not on Product Page.",
        why: "Feature flags separate deploy from enable so you can stop new demand without rolling back code.",
        next: "Deploy at 0% exposure.",
        tone: "calm",
      };
    case "trace":
      return {
        id: "step-trace",
        eyebrow: "Learn this",
        title: "Follow one request",
        seeing:
          "A single personalized request will call Recommendation, acquire a pool slot, query, then release.",
        why: "One correct request is harmless. Many concurrent correct requests compete for the same 40 slots.",
        next: "Send one request and watch the pool.",
        tone: "calm",
      };
    case "exposure":
      return {
        id: "step-exposure",
        eyebrow: "Learn this",
        title: "Exposure changes who pays W",
        seeing: "Stable hashing keeps the same users in or out as you move the percentage.",
        why: "Raising exposure raises the fraction of arrivals that take the long hold on Recommendation’s pool. L = λ × W climbs with that mix.",
        next: "Predict before 25%, then set exposure.",
        tone: "calm",
      };
    case "saturation":
      return {
        id: "step-saturation",
        eyebrow: "Learn this",
        title: "Demand hits the capacity wall",
        seeing: `Busy ${snap.activeCount}/${snap.poolSize} · pending ${snap.waitingCount} · util ${(snap.utilization * 100).toFixed(0)}% · demand ≈ ${snap.demandOccupancy.toFixed(0)}.`,
        why: "Active never exceeds the pool. If λ×W > 40, the overflow is waiting. Not fake extra busy slots. Product Page itself is not holding those connections.",
        next: "Surge if needed, then predict disable semantics.",
        prod: "Map: pool.active · pool.idle · pool.pending · acquire.wait.{p50,p99} · acquire.timeouts · throughput.",
        tone: "warn",
      };
    case "investigate":
      return {
        id: "step-investigate",
        eyebrow: "Learn this",
        title: "Read before you flip levers",
        seeing: `p50 ≈ ${(snap.latencyP50 * 1000).toFixed(0)} ms · p99 ≈ ${(snap.latencyP99 * 1000).toFixed(0)} ms · acquire.wait.p99 ≈ ${(snap.acquireWaitP99 * 1000).toFixed(0)} ms.`,
        why: "Saturation shows in the tail and in pending first. Form a hypothesis from Ops metrics before you mitigate.",
        next: "Continue when you can name what you would change and why.",
        tone: "insight",
      };
    case "mitigate":
      return {
        id: "step-mitigate",
        eyebrow: "Learn this",
        title: "Choose a response",
        seeing:
          "Pause freezes exposure %. Disable stops new recommendation holds. Leaving pressure on lets you try timeout, shed, or cache.",
        why: "Your choice changes this same system. Next you will see what actually happened to new vs in-flight work.",
        prod: "Incident order: stop the bleed (flag/shed) → confirm pending decays → then dig into W (slow query, missing index, cache).",
        tone: "insight",
      };
    case "review":
      return {
        id: "step-review-outcome",
        eyebrow: "Takeaway",
        title: "Name the shared resource",
        seeing:
          "Correct code waited because every exposed request held a connection from Recommendation’s 40-slot pool.",
        why: "Disable stops new recommendation work; in-flight holds finish. The pool, not the feature idea, was the bottleneck.",
        prod: "Leave with: λ×W sizing, acquire.wait alerts, deploy≠enable, disable≠kill in-flight.",
        tone: "insight",
      };
    default:
      return {
        id: mode === "challenge" ? "challenge-default" : "practice-default",
        eyebrow: mode === "challenge" ? "Challenge" : "Practice",
        title:
          mode === "challenge"
            ? "Clear saturation under the clock"
            : "Pressure the shared pool",
        seeing:
          "Vary λ, exposure, lookup duration, acquire timeout, shed, and cache. Busy stays ≤ 40; waiters / timeouts absorb the rest.",
        why: "If you can explain waiters, Little’s Law, disable-vs-inflight, and which mitigation cuts W vs demand, the chapter stuck.",
        prod: "Treat this panel like a runbook rehearsal: change one lever, read pool.* and path latency, then decide.",
        tone: "calm",
      };
  }
}
