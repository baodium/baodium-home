import type { EngineSnapshot } from "@/lib/experience/types";

export type NarratorTone = "calm" | "warn" | "recover";

export type NarratorFrame = {
  /** Plain-English chain: Flag at 25% → … → waiters growing */
  chain: string;
  /** Short segments for richer UI (optional rendering). */
  segments: string[];
  tone: NarratorTone;
  /** What “good” looks like right now. */
  goodLooksLike: string;
};

/**
 * Always-on live state for Chapter 1. so a real engineer never wonders
 * “what am I looking at?” while the sim runs.
 */
export function narrateChapter1(snap: EngineSnapshot): NarratorFrame {
  const { controls } = snap;
  const segments: string[] = [];
  let tone: NarratorTone = "calm";

  if (controls.featureDisabledForNew) {
    segments.push("Flag disabled for new traffic");
    tone = snap.activeCount > 0 ? "recover" : "calm";
  } else if (!controls.featureEnabled) {
    segments.push("Flag off");
  } else if (controls.paused) {
    segments.push(`Exposure frozen at ${controls.exposurePct}%`);
    tone = "warn";
  } else if (controls.exposurePct === 0) {
    segments.push("Flag on at 0% (deployed, not enabled)");
  } else {
    segments.push(`Flag at ${controls.exposurePct}%`);
  }

  const exposedFrac =
    controls.featureEnabled && !controls.featureDisabledForNew
      ? controls.exposurePct / 100
      : 0;
  const recLookups = Math.round(controls.arrivalRate * exposedFrac);
  if (controls.arrivalRate <= 0) {
    segments.push("no arrivals yet");
  } else if (exposedFrac > 0) {
    segments.push(`~${recLookups} recommendation lookups/s`);
  } else {
    segments.push(`~${Math.round(controls.arrivalRate)} baseline req/s`);
  }

  if (snap.activeCount >= snap.poolSize) {
    segments.push(`pool full (${snap.activeCount}/${snap.poolSize})`);
    tone = "warn";
  } else if (snap.utilization >= 0.85) {
    segments.push(
      `pool nearly full (${snap.activeCount}/${snap.poolSize}, ${Math.round(snap.utilization * 100)}%)`,
    );
    tone = "warn";
  } else {
    segments.push(`pool ${snap.activeCount}/${snap.poolSize} busy`);
  }

  if (snap.waitingCount > 0) {
    const growing =
      snap.littles.overDemand || snap.utilization >= 0.95
        ? "waiters growing"
        : "waiters queued";
    segments.push(`${growing} (${snap.waitingCount})`);
    tone = "warn";
  } else if (snap.littles.overDemand) {
    segments.push(`demand ≈ ${snap.littles.L.toFixed(0)} over capacity. waiters next`);
    tone = "warn";
  } else {
    segments.push("no waiters");
  }

  if (controls.featureDisabledForNew && snap.activeCount === 0 && snap.waitingCount === 0) {
    tone = "recover";
  }

  let goodLooksLike: string;
  if (controls.featureDisabledForNew) {
    goodLooksLike =
      "Good: busy and waiters fall as in-flight holds finish; new traffic stays on the fast baseline path.";
  } else if (snap.waitingCount > 0) {
    goodLooksLike =
      "Good: busy stays ≤ 40 while you cut demand (disable / shed) or shorten holds (cache). Waiters then drain.";
  } else if (snap.utilization >= 0.85) {
    goodLooksLike =
      "Good: keep headroom under ~70–80% util so a small traffic bump does not create waiters.";
  } else if (controls.exposurePct === 0 && controls.featureEnabled) {
    goodLooksLike =
      "Good: code is live at 0%. Raise exposure only when you are ready to watch the pool.";
  } else {
    goodLooksLike =
      "Good: estimated demand (arrivals × hold time) stays under 40, busy has headroom, and the slowest 1% of requests stay near the baseline hold.";
  }

  return {
    chain: segments.join(" → "),
    segments,
    tone,
    goodLooksLike,
  };
}
