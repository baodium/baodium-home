"use client";

import { AnimatePresence, motion } from "motion/react";
import type { DrillNarratorFrame } from "@/lib/play/narrator";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/** Always-on live state chain for a Play drill. */
export function DrillNarrator({ frame }: { frame: DrillNarratorFrame }) {
  const reduced = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={frame.chain}
        role="status"
        aria-live="polite"
        aria-label="Live drill state"
        data-tone={frame.tone === "warn" ? "warn" : undefined}
        className="drill-narrator mt-6"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="drill-live-dot" />
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--drill-signal)]">
            Now
          </p>
        </div>
        <p className="drill-narrator-chain mt-2">
          {frame.segments.map((seg, i) => (
            <span key={`${i}-${seg}`}>
              {i > 0 ? (
                <span className="drill-narrator-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
              {seg}
            </span>
          ))}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--drill-muted)]">
          {frame.goodLooksLike}
        </p>
      </motion.aside>
    </AnimatePresence>
  );
}
