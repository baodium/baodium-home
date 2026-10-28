"use client";

import { motion } from "motion/react";
import type { GuidedStepId, LabMode } from "@/lib/experience/types";
import { CH1_GUIDED_STAGE_COUNT } from "@/lib/learning/registry";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export function GuidedProgress({
  steps,
  stepId,
  mode,
}: {
  steps: { id: GuidedStepId; title: string; letter: string }[];
  stepId: GuidedStepId;
  mode: LabMode;
}) {
  const reduced = usePrefersReducedMotion();
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
            />
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
          {mode === "practice"
            ? "Practice"
            : mode === "challenge"
              ? "Challenge"
              : `Step ${activeIdx + 1} of ${total} · ${guided[activeIdx]?.letter ?? ""}. ${guided[activeIdx]?.title ?? ""}`}
        </p>
        {mode === "guided" && !reduced ? (
          <motion.p
            key={stepId}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hidden text-[0.75rem] text-[color:var(--exp-amber)] sm:block"
          >
            Complete this step, then continue
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
