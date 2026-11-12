"use client";

import { motion, useReducedMotion } from "motion/react";
import type { SreMode } from "@/lib/sre/catalog";

const MODES: { id: SreMode; label: string }[] = [
  { id: "guided", label: "Guided" },
  { id: "practice", label: "Practice" },
  { id: "challenge", label: "Challenge" },
];

/** Three modes, marked only after a passing run is stored on this device. */
export function ModeTrack({
  completed,
  current,
  compact = false,
}: {
  completed: SreMode[];
  current?: SreMode;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const doneCount = MODES.filter((mode) => completed.includes(mode.id)).length;

  return (
    <div className="mode-track">
      {compact ? null : (
        <p className="mode-track-count">
          {doneCount} of 3 modes saved from a passing run
        </p>
      )}
      <ol aria-label="Guided, Practice, and Challenge">
        {MODES.map((mode) => {
          const done = completed.includes(mode.id);
          const now = current === mode.id;
          return (
            <li
              key={mode.id}
              data-done={done ? "true" : "false"}
              data-current={now ? "true" : "false"}
            >
              <motion.span
                aria-hidden="true"
                className="mode-track-mark"
                initial={false}
                animate={{ scale: done && !reduce ? 1 : 0.72 }}
                transition={{ duration: reduce ? 0 : 0.22 }}
              />
              {mode.label}
              {done ? <span className="sr-only">, passed</span> : null}
              {now && !done ? <span className="sr-only">, current</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
