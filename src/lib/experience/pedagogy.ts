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
      title: "Holds already taken still finish",
      seeing:
        snap.flagPropagationRemainingSec > 0.02
          ? `${snap.activeCount} busy slots still hold in-flight recommendation work. The disable reaches new arrivals in ${snap.flagPropagationRemainingSec.toFixed(1)}s.`
          : `${snap.activeCount} busy slot${snap.activeCount === 1 ? "" : "s"} still hold in-flight recommendation work. New arrivals skip the extra lookup.`,
      why: "Disable stops new demand on the shared pool. Holds already acquired keep their connection until release. Waiters clear as those finish.",
      next: "Watch busy drop toward baseline as releases free slots.",
      prod: "In prod: turn the flag off. Requests already holding a connection still finish or time out. Watch pool.pending fall. It does not hit zero in the same instant.",
      tone: "recover",
    };
  }

  if (controls.featureDisabledForNew && snap.waitingCount === 0 && snap.activeCount === 0) {
    return {
      id: "disable-cleared",
      eyebrow: "What’s happening",
      title: "New pages stay on Catalog",
      seeing: "Busy and waiters are near zero. New product pages take the catalog path and do not acquire a connection.",
      why: "Removing the long hold from the request path collapses λ×W under the 40-slot cap.",
      prod: "Confirm pool.active and pool.pending stay low; p99 should fall toward baseline hold.",
      tone: "recover",
    };
  }

  if (controls.paused && !controls.featureDisabledForNew) {
    return {
      id: "rollout-paused",
      eyebrow: "What’s happening",
      title: "Pausing exposure leaves the current calls running",
      seeing: `Rollout paused at ${controls.exposurePct}%. Busy ${snap.activeCount}/${snap.poolSize}, pending ${snap.waitingCount}. Traffic still arrives; the cohort just cannot grow.`,
      why: "Pause stops raising exposure. It does not cut λ or kill in-flight holds. Waiters clear only if demand (λ×W) falls under 40.",
      next: "Compare with Disable: disable routes new traffic to the baseline path and drains recommendation demand.",
      prod: "Pause a progressive rollout at the current percent. pool.pending falls only if the hold time or the arrival rate changes.",
      tone: "insight",
    };
  }

  // Prefer live saturation signals over sticky counters (timeouts/sheds persist forever).
  if (snap.waitingCount > 0) {
    return {
      id: "waiters-wall",
      eyebrow: "What’s happening",
      title: "All 40 connections are assigned",
      seeing: `${snap.activeCount}/${snap.poolSize} busy · ${snap.waitingCount} waiting · acquire.wait.p99 ≈ ${acqP99ms.toFixed(0)} ms. No 41st slot; excess sits in the waiter queue.`,
      why: `Little’s Law estimates demand ≈ ${littles.L.toFixed(0)} (= λ × W). When that exceeds 40, correct code still waits because the pool is shared and finite.`,
      next:
        mode === "guided" && stepId === "saturation"
          ? "Predict: disable vs pause. Then investigate and mitigate."
          : "Try disabling the flag, or lowering exposure. Compare new calls with holds already taken.",
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
      title: "A timeout ends a wait that already started",
      seeing: `${snap.timeoutCount} request${snap.timeoutCount === 1 ? "" : "s"} exceeded the ${(controls.acquireTimeoutSec * 1000).toFixed(0)}ms connectionTimeout while waiting for a free slot.`,
      why: "A timeout ends a wait. It does not stop new recommendation calls. Turning the flag off does.",
      next: "Compare a timeout with the flag. One ends a wait already in progress. The other stops new calls.",
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
      title: "Some arrivals skipped the recommendation call",
      seeing: `${snap.shedCount} arrivals skipped Recommendation because utilization hit ${Math.round(controls.shedAtUtil * 100)} percent.`,
      why: "That is not the incident response. The flag stops new recommendation calls. Holds already taken still finish.",
      prod: "In this incident, turn the flag off. Do not add a second gate in front of acquire.",
      tone: "insight",
    };
  }

  if (controls.cacheHitRate > 0.2 && snap.cacheHitCount > 8 && !littles.overDemand) {
    return {
      id: "cache-cuts-w",
      eyebrow: "What’s happening",
      title: "A cache is not how this incident was cleared",
      seeing: `${Math.round(controls.cacheHitRate * 100)}% cache hits · ${snap.cacheHitCount} hits so far. Mean hold drops; arrival rate is unchanged.`,
      why: "A cache is not the response in this incident. The flag stops new recommendation calls. The query was already near its baseline.",
      prod: "Measure checkout hold time (usage histogram), not only query duration. Cache wins show up as shorter holds.",
      tone: "insight",
    };
  }

  if (snap.slo.breached && snap.completedCount > 12) {
    return {
      id: "slo-burn",
      eyebrow: "What’s happening",
      title: "The tail is the wait for a connection",
      seeing: `End-to-end p99 is about ${p99ms.toFixed(0)} ms. Acquire p99 is about ${acqP99ms.toFixed(0)} ms. The query is not what moved.`,
      why: "In this incident the query stays near baseline. Acquire wait is the line that stretches.",
      next: "Open Ops metrics. Check acquire.wait.p99 and pool.pending before blaming the SQL text.",
      prod: "Page on latency burn + pool.pending, not only CPU. ConnectionTimeout approaching = imminent errors.",
      tone: "warn",
    };
  }

  if (littles.overDemand && snap.waitingCount === 0) {
    return {
      id: "demand-rising",
      eyebrow: "What’s happening",
      title: "Estimated demand is already past 40 connections",
      seeing: `λ×W is about ${littles.L.toFixed(0)} while the pool is only ${snap.poolSize}. Pending acquisitions appear once every slot stays full.`,
      why: "Occupancy demand can exceed the pool. Active connections never can. The surplus becomes queueing delay.",
      prod: "Watch pending rise before timeouts. Utilization near 1 comes first. The wait is what the caller feels.",
      tone: "warn",
    };
  }

  if (spread > 40 && snap.completedCount > 12) {
    return {
      id: "tail-spread",
      eyebrow: "What’s happening",
      title: "The query stays near baseline while acquire wait stretches",
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
      title: "Almost every connection is already assigned",
      seeing: `${snap.activeCount} of ${snap.poolSize} slots are busy (${(fill * 100).toFixed(0)}% utilization). A small rise in traffic creates pending acquisitions.`,
      why: "The next arrival waits when there is no spare connection. Average idle time does not tell you that.",
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
          ? `${r.id} arrived when all ${snap.poolSize} connections were busy. It waits beside the grid.`
          : `${r.id} holds a Recommendation pool slot for the database lookup.`,
      why: "Correct code still consumes a shared resource. The highlight in the code panel is the line that owns the hold.",
      prod: "Instrument checkout→checkin as hold time. Query duration alone understates W.",
      tone: "insight",
    };
  }

  if (controls.featureEnabled && controls.exposurePct === 0) {
    return {
      id: "deploy-zero",
      eyebrow: "What’s happening",
      title: "The code is live and the cohort is empty",
      seeing: "Flag is ON at 0% exposure. Code is live, but no user is hashed into the cohort.",
      why: "The code can be deployed while nobody is in the cohort. Exposure, not a new build, decides who calls Recommendation.",
      next: "Trace one forced request, then raise exposure.",
      prod: "The binary is present and the cohort is empty. Move exposure forward or back without shipping another build.",
      tone: "calm",
    };
  }

  if (controls.featureEnabled && controls.exposurePct > 0 && controls.exposurePct < 40 && !littles.overDemand) {
    return {
      id: "partial-rollout",
      eyebrow: "What’s happening",
      title: "A small cohort still shares the same 40 connections",
      seeing: `${controls.exposurePct}% of arrivals call Recommendation and share one ${snap.poolSize}-slot pool. Catalog traffic does not take a slot.`,
      why: `A small exposed share can still fill the pool when the hold is long. Pool demand here is λ≈${littles.lambda.toFixed(0)}/s · W≈${(littles.W * 1000).toFixed(0)}ms → L≈${littles.L.toFixed(0)}.`,
      prod: "pool_floor ≈ ceil(λ × W × 1.25). Raising exposure raises effective W for the mix. Recalculate before 100%.",
      tone: "calm",
    };
  }

  switch (stepId) {
    case "inspect":
      return {
        id: "step-inspect",
        eyebrow: "",
        title: "Same page, one extra lookup",
        seeing: "Toggle the storefront. Recommendations appear only on the proposed path.",
        why: "The product change looks small in the UI. The cost lives in an extra synchronous DB hold on the request path.",
        next: "Toggle the preview, then continue.",
        tone: "calm",
      };
    case "deploy":
      return {
        id: "step-deploy",
        eyebrow: "",
        title: "Deploy the flag before anyone calls Recommendation",
        seeing:
          "Product Page can call Recommendation only when the flag exposes the user. The shared pool lives in Recommendation, not on Product Page.",
        why: "Feature flags separate deploy from enable so you can stop new demand without rolling back code.",
        next: "Deploy at 0% exposure.",
        tone: "calm",
      };
    case "trace":
      return {
        id: "step-trace",
        eyebrow: "",
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
        eyebrow: "",
        title: "Exposure changes who calls Recommendation",
        seeing: "Stable hashing keeps the same users in or out as you move the percentage.",
        why: "Raising exposure raises the fraction of arrivals that take the long hold on Recommendation’s pool. L = λ × W climbs with that mix.",
        next: "Predict before 25%, then set exposure.",
        tone: "calm",
      };
    case "saturation":
      return {
        id: "step-saturation",
        eyebrow: "",
        title: "All 40 connections are assigned",
        seeing: `Busy ${snap.activeCount}/${snap.poolSize} · pending ${snap.waitingCount} · util ${(snap.utilization * 100).toFixed(0)}% · demand ≈ ${snap.demandOccupancy.toFixed(0)}.`,
        why: "Active never exceeds the pool. If λ×W > 40, the overflow is waiting. Not fake extra busy slots. Product Page itself is not holding those connections.",
        next: "Surge if needed, then predict disable semantics.",
        prod: "Map: pool.active · pool.idle · pool.pending · acquire.wait.{p50,p99} · acquire.timeouts · throughput.",
        tone: "warn",
      };
    case "investigate":
      return {
        id: "step-investigate",
        eyebrow: "",
        title: "Read the pool before you change the flag",
        seeing: `p50 ≈ ${(snap.latencyP50 * 1000).toFixed(0)} ms · p99 ≈ ${(snap.latencyP99 * 1000).toFixed(0)} ms · acquire.wait.p99 ≈ ${(snap.acquireWaitP99 * 1000).toFixed(0)} ms.`,
        why: "Saturation shows in the tail and in pending first. Form a hypothesis from Ops metrics before you mitigate.",
        next: "Continue when you can name what you would change and why.",
        tone: "insight",
      };
    case "mitigate":
      return {
        id: "step-mitigate",
        eyebrow: "",
        title: "Choose a response",
        seeing:
          "Pause freezes exposure. Disable stops new recommendation calls. Holds already taken finish or time out.",
        why: "Your choice changes this same system. Next you will see what actually happened to new calls versus work already holding a connection.",
        prod: "Stop new recommendation calls, then watch pending fall. The query was already near baseline.",
        tone: "insight",
      };
    case "review":
      return {
        id: "step-review-outcome",
        eyebrow: "",
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
            ? "Clear pending acquisitions before the clock runs out"
            : "Watch the 40-connection pool fill",
        seeing:
          "Change exposure, the flag, and the acquire timeout. Busy stays at or under 40. Overflow waits.",
        why: "If you can explain pending acquisitions, the 40-connection pool, and what the flag does to new calls versus holds already taken, the chapter landed.",
        prod: "Treat this panel like a runbook rehearsal: change one lever, read pool.* and path latency, then decide.",
        tone: "calm",
      };
  }
}
