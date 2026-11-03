import { readStored, writeStored } from "@/lib/storage";
import type { DecisionKind, GuidedStepId, LabMode } from "@/lib/experience/types";

const KEY = "baodium-experience-ch1-v2";

export type Chapter1Progress = {
  stepId: GuidedStepId;
  decision: DecisionKind | null;
  completed: boolean;
  previewToggled: boolean;
  deployedZero: boolean;
  mode: LabMode;
  updatedAt: number;
};

export const defaultProgress = (): Chapter1Progress => ({
  stepId: "inspect",
  decision: null,
  completed: false,
  previewToggled: false,
  deployedZero: false,
  mode: "guided",
  updatedAt: Date.now(),
});

export function loadProgress(): Chapter1Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = readStored(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<Chapter1Progress>;
    const defaults = defaultProgress();
    return {
      stepId: ["inspect", "deploy", "trace", "exposure", "saturation", "investigate", "mitigate", "review"].includes(parsed.stepId ?? "") ? parsed.stepId! : defaults.stepId,
      decision: ["pause_exposure", "disable_feature", "investigate"].includes(parsed.decision ?? "") ? parsed.decision! : null,
      mode: ["guided", "practice", "challenge"].includes(parsed.mode ?? "") ? parsed.mode! : defaults.mode,
      completed: parsed.completed === true,
      previewToggled: parsed.previewToggled === true,
      deployedZero: parsed.deployedZero === true,
      updatedAt: typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : defaults.updatedAt,
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(patch: Partial<Chapter1Progress>) {
  if (typeof window === "undefined") return;
  const next = { ...loadProgress(), ...patch, updatedAt: Date.now() };
  writeStored(KEY, JSON.stringify(next));
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  writeStored(KEY, null);
}
