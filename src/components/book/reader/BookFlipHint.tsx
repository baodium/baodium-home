"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const DISMISS_MS = 1000 * 60 * 60 * 24 * 90;

/** Single first-visit coach: swipe / arrows — slim, no junior CTA stack. */
export function BookFlipHint({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    const dismissed = prefs.flipHintDismissedAt ?? 0;
    if (Date.now() - dismissed < DISMISS_MS) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      onOpenChange?.(true);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [onOpenChange]);

  const dismiss = () => {
    setOpen(false);
    onOpenChange?.(false);
    const prefs = loadReaderPrefs();
    saveReaderPrefs({ ...prefs, flipHintDismissedAt: Date.now() });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.28, ease }}
          className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[54] flex w-[min(100vw-1.5rem,22rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] py-2 pl-4 pr-2 shadow-[0_18px_40px_-22px_rgba(28,22,16,0.45)]"
        >
          <p className="min-w-0 flex-1 text-[0.8rem] leading-snug text-[var(--reader-fg)]">
            {reduceMotion ? (
              <>
                Press{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1 py-0.5 font-mono text-[0.65rem]">
                  ←
                </kbd>{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1 py-0.5 font-mono text-[0.65rem]">
                  →
                </kbd>{" "}
                to turn chapters.
              </>
            ) : (
              <>
                Swipe the page, or{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1 py-0.5 font-mono text-[0.65rem]">
                  ←
                </kbd>{" "}
                <kbd className="rounded border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--reader-fg)_4%,transparent)] px-1 py-0.5 font-mono text-[0.65rem]">
                  →
                </kbd>
                , to turn.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-[var(--reader-fg)]"
            aria-label="Dismiss flip hint"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
