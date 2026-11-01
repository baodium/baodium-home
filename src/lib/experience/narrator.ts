import { readChapter1 } from "@/lib/experience/readout";
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
  const read = readChapter1(snap);
  const segments: string[] = [];
  let tone: NarratorTone = "calm";
  const appliedOn = snap.appliedFeatureEnabled && !snap.appliedFeatureDisabledForNew;

  if (snap.appliedFeatureDisabledForNew) {
    segments.push("Flag disabled for new traffic");
    tone = read.busy > 0 ? "recover" : "calm";
  } else if (!snap.appliedFeatureEnabled) {
    segments.push("Flag off");
  } else if (controls.paused) {
    segments.push(`Exposure frozen at ${snap.appliedExposurePct}%`);
    tone = "warn";
  } else if (snap.appliedExposurePct === 0) {
    segments.push("Flag on at 0% (deployed, not enabled)");
  } else {
    segments.push(`Flag at ${snap.appliedExposurePct}%`);
  }

  if (snap.flagPropagationRemainingSec > 0.02) {
    segments.push(`flag change in ${snap.flagPropagationRemainingSec.toFixed(1)}s`);
  }

  if (controls.arrivalRate <= 0) {
    segments.push("no arrivals yet");
  } else if (appliedOn && snap.appliedExposurePct > 0) {
    segments.push(`~${Math.round(read.offeredPoolRps)} recommendation lookups/s`);
  } else {
    segments.push(`~${Math.round(controls.arrivalRate)} baseline req/s`);
  }

  if (read.busy >= read.poolSize) {
    segments.push(`pool full (${read.busy}/${read.poolSize})`);
    tone = "warn";
  } else if (read.utilization >= 0.85) {
    segments.push(
      `pool nearly full (${read.busy}/${read.poolSize}, ${Math.round(read.utilization * 100)}%)`,
    );
    tone = "warn";
  } else {
    segments.push(`pool ${read.busy}/${read.poolSize} busy`);
  }

  if (read.waiting > 0) {
    const growing =
      read.demand > read.poolSize || read.utilization >= 0.95
        ? "waiters growing"
        : "waiters queued";
    segments.push(`${growing} (${read.waiting})`);
    tone = "warn";
  } else if (read.demand > read.poolSize) {
    segments.push(`demand ≈ ${read.demand.toFixed(0)} over capacity. waiters next`);
    tone = "warn";
  } else {
    segments.push("no waiters");
  }

  if (snap.appliedFeatureDisabledForNew && read.busy === 0 && read.waiting === 0) {
    tone = "recover";
  }

  let goodLooksLike: string;
  if (controls.featureDisabledForNew) {
    goodLooksLike =
      "Good: busy and waiters fall as in-flight holds finish; new traffic stays on the fast baseline path.";
  } else if (read.waiting > 0) {
    goodLooksLike =
      "Good: busy stays ≤ 40 while you cut demand (disable / shed) or shorten holds (cache). Waiters then drain.";
  } else if (read.utilization >= 0.85) {
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
