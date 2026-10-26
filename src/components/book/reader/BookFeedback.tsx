"use client";

import { useEffect, useState } from "react";
import { MessageCircleHeart, Flag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { buildReaderMailto } from "@/lib/book/feedback";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function BookFeedback({
  chapterTitle,
  chapterSlug,
}: {
  chapterTitle: string;
  chapterSlug: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    const dismissed = prefs.feedbackDismissedAt ?? 0;
    if (Date.now() - dismissed < DISMISS_MS) return;
    const timer = window.setTimeout(() => setPrompt(true), 45000);
    return () => window.clearTimeout(timer);
  }, [chapterSlug]);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `https://baodium.com/system-design/${chapterSlug}`;

  const enjoyHref = buildReaderMailto({
    kind: "enjoy",
    chapterTitle,
    chapterSlug,
    url,
  });
  const correctionHref = buildReaderMailto({
    kind: "correction",
    chapterTitle,
    chapterSlug,
    url,
  });

  const dismissPrompt = () => {
    setPrompt(false);
    const prefs = loadReaderPrefs();
    saveReaderPrefs({ ...prefs, feedbackDismissedAt: Date.now() });
  };

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] pt-6">
        <p className="mr-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
          Feedback
        </p>
        <a
          href={enjoyHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] px-3.5 text-sm text-[var(--reader-fg)] transition-colors hover:border-cinnabar/40 hover:bg-[color-mix(in_srgb,var(--cinnabar)_8%,transparent)]"
        >
          <MessageCircleHeart className="h-4 w-4 text-cinnabar" aria-hidden="true" />
          Enjoying this?
        </a>
        <a
          href={correctionHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] px-3.5 text-sm text-[var(--reader-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--reader-fg)_28%,transparent)] hover:text-[var(--reader-fg)]"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Report a correction
        </a>
      </div>
      <p className="mt-3 text-xs text-[var(--reader-muted)]">
        ← → flip chapters · ⌘/Ctrl K search · notes go to baodium@gmail.com
      </p>

      <AnimatePresence>
        {prompt ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease }}
            className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[55] w-[min(100vw-1.5rem,18rem)] rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] bg-[var(--reader-page)] p-3.5 shadow-[0_22px_48px_-24px_rgba(40,24,12,0.55)]"
            role="dialog"
            aria-label="Enjoying this chapter?"
          >
            <p className="font-serif text-base leading-snug text-[var(--reader-fg)]">
              Enjoying this?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--reader-muted)]">
              A short note helps — opens your email to baodium@gmail.com with this chapter linked.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={enjoyHref}
                onClick={dismissPrompt}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-ink px-3 text-sm text-[var(--reader-page)]"
              >
                Leave feedback
              </a>
              <button
                type="button"
                onClick={dismissPrompt}
                className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-sm text-[var(--reader-muted)]"
              >
                Not now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
