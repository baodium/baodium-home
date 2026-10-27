"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, Keyboard, X } from "lucide-react";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const DISMISS_MS = 1000 * 60 * 60 * 24 * 90;

/** First-visit coach mark: swipe and arrow keys flip chapters. */
export function BookFlipHint() {
  const reduceMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    const dismissed = prefs.flipHintDismissedAt ?? 0;
    if (Date.now() - dismissed < DISMISS_MS) return;
    const timer = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    const prefs = loadReaderPrefs();
    saveReaderPrefs({ ...prefs, flipHintDismissedAt: Date.now() });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.32, ease }}
          className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[54] w-[min(100vw-1.5rem,20rem)] -translate-x-1/2 rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] p-3.5 shadow-[0_22px_48px_-24px_rgba(28,22,16,0.5)]"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cinnabar)_12%,transparent)] text-cinnabar"
            >
              <Hand className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[0.95rem] leading-snug text-[var(--reader-fg)]">
                Flip like a book
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--reader-muted)]">
                Swipe the page, or use{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1.5 py-0.5 font-mono text-[0.65rem]">
                  ←
                </kbd>{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1.5 py-0.5 font-mono text-[0.65rem]">
                  →
                </kbd>{" "}
                to turn chapters.
              </p>
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[var(--reader-muted)]">
                <Keyboard className="h-3 w-3" aria-hidden="true" />
                Swipe · arrows
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-[var(--reader-fg)]"
              aria-label="Dismiss flip hint"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-ink px-3 text-sm text-[var(--reader-page)]"
          >
            Got it
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
