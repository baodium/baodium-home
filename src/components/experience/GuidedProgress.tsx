"use client";

import type { GuidedStepId } from "@/lib/experience/types";

export function GuidedProgress({
  steps,
  stepId,
  mode,
}: {
  steps: { id: GuidedStepId; title: string }[];
  stepId: GuidedStepId;
  mode: "guided" | "sandbox";
}) {
  const guided = steps.filter((s) => s.id !== "sandbox");
  const idx = guided.findIndex((s) => s.id === stepId);
  const activeIdx = mode === "sandbox" ? guided.length : Math.max(0, idx);

  return (
    <div className="w-full">
      <div className="exp-progress-track" role="list" aria-label="Guided progress">
        {guided.map((s, i) => (
          <div
            key={s.id}
            role="listitem"
            className="exp-progress-dot"
            data-done={i < activeIdx ? "true" : "false"}
            data-active={i === activeIdx && mode === "guided" ? "true" : "false"}
            title={s.title}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
        {mode === "sandbox"
          ? "Sandbox · free exploration"
          : `Step ${activeIdx + 1} of ${guided.length} · ${guided[activeIdx]?.title ?? ""}`}
      </p>
    </div>
  );
}
