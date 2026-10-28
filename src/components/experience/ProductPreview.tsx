"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export function ProductPreview({
  showRecs,
  onToggle,
}: {
  showRecs: boolean;
  onToggle: () => void;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="exp-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-[color:var(--exp-fg)]">Product page</h3>
          <p className="mt-0.5 text-xs text-[color:var(--exp-muted)]">
            {showRecs
              ? "Proposed · Catalog + Recommendation rail"
              : "Current · Product Page → Catalog only"}
          </p>
        </div>
        <button type="button" onClick={onToggle} className="exp-btn exp-btn-ghost">
          Show {showRecs ? "current" : "proposed"}
        </button>
      </div>
      <div className="exp-storefront mt-4">
        <div className="border-b border-[color:var(--exp-line)] px-4 py-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--exp-faint)]">
            storefront · simulated
          </p>
          <p className="mt-1 font-serif text-xl text-[color:var(--exp-fg)]">
            Ceramic pour-over kettle
          </p>
          <p className="mt-1 text-sm text-[color:var(--exp-muted)]">$68 · in stock</p>
        </div>
        <div className="px-4 py-3 text-sm leading-relaxed text-[color:var(--exp-muted)]">
          Matte copper finish. Holds heat for a slow pour. Ships in recycled fiber.
        </div>
        <AnimatePresence initial={false} mode="wait">
          {showRecs ? (
            <motion.div
              key="recs"
              className="exp-recs-rail px-4 py-3"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="exp-kicker">Recommended with this</p>
              <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--exp-fg)]">
                <li>Paper filters · 100 pack</li>
                <li>Gooseneck scale mat</li>
                <li>Single-origin sampler</li>
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="none"
              className="border-t border-[color:var(--exp-line)] px-4 py-3 text-sm text-[color:var(--exp-faint)]"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
            >
              No recommendation rail on the current page.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
