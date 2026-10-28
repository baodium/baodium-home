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
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...(JSON.parse(raw) as Chapter1Progress) };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(patch: Partial<Chapter1Progress>) {
  if (typeof window === "undefined") return;
  const next = { ...loadProgress(), ...patch, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
