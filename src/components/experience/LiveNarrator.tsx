"use client";

import { AnimatePresence, motion } from "motion/react";
import { narrateChapter1 } from "@/lib/experience/narrator";
import type { EngineSnapshot } from "@/lib/experience/types";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/**
 * Always-visible plain-English chain of the live lab state.
 * Updates whenever the sim changes — not a static tip.
 */
export function LiveNarrator({ snap }: { snap: EngineSnapshot }) {
  const reduced = usePrefersReducedMotion();
  const frame = narrateChapter1(snap);

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={frame.chain}
        role="status"
        aria-live="polite"
        aria-label="Live system state"
        data-tone={frame.tone === "warn" ? "warn" : undefined}
        className="exp-narrator"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-[color:var(--exp-amber)]"
            style={
              reduced
                ? undefined
                : { animation: "exp-ops-pulse 2.2s ease-in-out infinite" }
            }
          />
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--exp-amber)]">
            Now
          </p>
        </div>
        <p className="mt-2 text-[0.98rem] leading-snug text-[color:var(--exp-fg)] tabular-nums">
          {frame.segments.map((seg, i) => (
            <span key={`${i}-${seg}`}>
              {i > 0 ? (
                <span className="text-[color:var(--exp-faint)]" aria-hidden="true">
                  {" "}
                  →{" "}
                </span>
              ) : null}
              {seg}
            </span>
          ))}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--exp-muted)]">
          {frame.goodLooksLike}
        </p>
      </motion.aside>
    </AnimatePresence>
  );
}
