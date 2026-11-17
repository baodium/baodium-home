"use client";

import type { GuidedStepId, LabMode } from "@/lib/experience/types";
import { CH1_GUIDED_STAGE_COUNT } from "@/lib/learning/registry";

export function GuidedProgress({
  steps,
  stepId,
  mode,
}: {
  steps: { id: GuidedStepId; title: string; letter: string }[];
  stepId: GuidedStepId;
  mode: LabMode;
}) {
  const guided = steps;
  const idx = guided.findIndex((s) => s.id === stepId);
  const activeIdx =
    mode !== "guided" ? guided.length : Math.max(0, idx);
  const total = guided.length || CH1_GUIDED_STAGE_COUNT;

  return (
    <div className="w-full">
      <div className="exp-progress-track" role="list" aria-label="Guided progress">
        {guided.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx && mode === "guided";
          return (
            <div
              key={s.id}
              role="listitem"
              className="exp-progress-dot"
              data-done={done ? "true" : "false"}
              data-active={active ? "true" : "false"}
              title={`${s.letter}. ${s.title}`}
              aria-label={`${s.letter}. ${s.title}${done ? ", done" : active ? ", current" : ""}`}
            />
          );
        })}
      </div>
      <p className="book-step-count">
        {mode === "practice"
          ? "Practice. The controls stay open."
          : mode === "challenge"
            ? "Challenge. The prompt does not name the fix."
            : `Step ${activeIdx + 1} of ${total}. ${guided[activeIdx]?.title ?? ""}`}
      </p>
    </div>
  );
}
