import { readChapter1 } from "@/lib/experience/readout";
import type { ChallengeCriteria, EngineSnapshot } from "@/lib/experience/types";

export type ChallengeStatus = "idle" | "running" | "passed" | "failed";

export function evaluateChallenge(
  snap: EngineSnapshot,
  criteria: ChallengeCriteria,
  startedAtSimT: number,
): ChallengeStatus {
  const read = readChapter1(snap);
  const elapsed = snap.t - startedAtSimT;
  const waitingOk = !criteria.requireWaitingZero || read.waiting === 0;
  const p99Ok =
    !criteria.requireP99UnderSlo ||
    (snap.completedCount >= 8 && read.p99Sec <= snap.slo.targetP99Sec);
  const utilOk = read.utilization <= criteria.maxUtilization;
  // Need some completions so metrics are meaningful after mitigations.
  const samplesOk = snap.completedCount >= 12;

  if (waitingOk && p99Ok && utilOk && samplesOk && elapsed >= 2) {
    return "passed";
  }
  if (elapsed >= criteria.maxSimSec) {
    return "failed";
  }
  return "running";
}

export function challengeStatusCopy(status: ChallengeStatus): string {
  switch (status) {
    case "passed":
      return "Pending cleared and acquire time came off the queue.";
    case "failed":
      return "Time ran out with acquisitions still pending. Reset and change one control.";
    case "running":
      return "Live. Adjust the flag and exposure. Watch pending acquisitions and acquire time.";
    default:
      return "Start when you are ready.";
  }
}
