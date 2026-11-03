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
    segments.push("The flag is off for new recommendation calls");
    tone = read.busy > 0 ? "recover" : "calm";
  } else if (!snap.appliedFeatureEnabled) {
    segments.push("The flag is off");
  } else if (controls.paused) {
    segments.push(`Exposure is paused at ${snap.appliedExposurePct}%`);
    tone = "warn";
  } else if (snap.appliedExposurePct === 0) {
    segments.push("The flag is on and the cohort is empty");
  } else {
    segments.push(`Exposure is ${snap.appliedExposurePct}%`);
  }

  if (snap.flagPropagationRemainingSec > 0.02) {
    segments.push(`The flag change lands in ${snap.flagPropagationRemainingSec.toFixed(1)}s`);
  }

  if (controls.arrivalRate <= 0) {
    segments.push("No arrivals yet");
  } else if (appliedOn && snap.appliedExposurePct > 0) {
    segments.push(`About ${Math.round(read.offeredPoolRps)} recommendation lookups a second`);
  } else {
    segments.push(`About ${Math.round(controls.arrivalRate)} product-page requests a second`);
  }

  if (read.busy >= read.poolSize) {
    segments.push(`All ${read.poolSize} connections are assigned`);
    tone = "warn";
  } else if (read.utilization >= 0.85) {
    segments.push(
      `${read.busy} of ${read.poolSize} connections are busy (${Math.round(read.utilization * 100)}%)`,
    );
    tone = "warn";
  } else {
    segments.push(`${read.busy} of ${read.poolSize} connections are busy`);
  }

  if (read.waiting > 0) {
    const growing =
      read.demand > read.poolSize || read.utilization >= 0.95
        ? "Pending acquisitions are growing"
        : "Acquisitions are pending";
    segments.push(`${growing} (${read.waiting})`);
    tone = "warn";
  } else if (read.demand > read.poolSize) {
    segments.push(`Estimated demand is about ${read.demand.toFixed(0)}, past the pool`);
    tone = "warn";
  } else {
    segments.push("Nothing is waiting for a connection");
  }

  if (snap.appliedFeatureDisabledForNew && read.busy === 0 && read.waiting === 0) {
    tone = "recover";
  }

  let goodLooksLike: string;
  if (controls.featureDisabledForNew) {
    goodLooksLike =
      "New recommendation calls have stopped. Connections already held finish or time out. The query stays near 70 ms.";
  } else if (read.waiting > 0) {
    goodLooksLike =
      "Busy stays at 40. Pending is the queue for a connection. The flag stops new recommendation calls. A timeout only ends a wait that already started.";
  } else if (read.utilization >= 0.85) {
    goodLooksLike =
      "The pool is nearly full. The next rise in exposure is what creates pending acquisitions.";
  } else if (controls.exposurePct === 0 && controls.featureEnabled) {
    goodLooksLike =
      "The code is live and the cohort is empty. Raise exposure when you want product pages to call Recommendation.";
  } else {
    goodLooksLike =
      "Arrivals times the hold should stay under 40. The query stays near its baseline. Acquire wait is the line that moves when the pool fills.";
  }

  return {
    chain: segments.join(" → "),
    segments,
    tone,
    goodLooksLike,
  };
}
