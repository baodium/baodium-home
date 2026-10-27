"use client";

import { useEffect, useState } from "react";
import { MessageCircleHeart, Flag, Share2, Check, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  amazonReviewUrl,
  buildCorrectionMailto,
} from "@/lib/book/feedback";
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    const dismissed = prefs.feedbackDismissedAt ?? 0;
    if (Date.now() - dismissed < DISMISS_MS) return;
    const timer = window.setTimeout(() => setPrompt(true), 45000);
    return () => window.clearTimeout(timer);
  }, [chapterSlug]);

  const url = `https://baodium.com/system-design/${chapterSlug}`;
  const reviewHref = amazonReviewUrl();
  const correctionHref = buildCorrectionMailto({
    chapterTitle,
    chapterSlug,
    url,
  });

  const dismissPrompt = () => {
    setPrompt(false);
    const prefs = loadReaderPrefs();
    saveReaderPrefs({ ...prefs, feedbackDismissedAt: Date.now() });
  };

  const shareChapter = async () => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : url;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: chapterTitle, url: shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy chapter link", shareUrl);
    }
  };

  return (
    <>
      <div className="mt-12 border-t border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] pt-7">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
          After this chapter
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={reviewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-2 text-sm text-[var(--reader-fg)] transition-colors hover:text-cinnabar"
          >
            <MessageCircleHeart className="h-4 w-4 text-cinnabar" aria-hidden="true" />
            Enjoying this?
            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--reader-muted)]" aria-hidden="true" />
            <span className="sr-only"> Rate on Amazon (opens in a new tab)</span>
          </a>
          <a
            href={correctionHref}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            Report a correction
          </a>
          <button
            type="button"
            onClick={shareChapter}
            className="inline-flex min-h-9 items-center gap-1.5 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
            aria-label={copied ? "Chapter link copied" : "Share chapter"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-cinnabar" aria-hidden="true" />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
        <p className="mt-4 text-[0.7rem] leading-relaxed text-[color-mix(in_srgb,var(--reader-muted)_88%,transparent)]">
          ← → flip chapters · ⌘/Ctrl K search
        </p>
      </div>

      <AnimatePresence>
        {prompt ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease }}
            className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[55] w-[min(100vw-1.5rem,18.5rem)] rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] p-3.5 shadow-[0_22px_48px_-24px_rgba(28,22,16,0.5)]"
            role="dialog"
            aria-label="Enjoying this chapter?"
          >
            <p className="font-serif text-base leading-snug text-[var(--reader-fg)]">
              Enjoying this?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--reader-muted)]">
              A quick Amazon rating helps the book reach more readers. Corrections still go by email.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={reviewHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismissPrompt}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3 text-sm text-[var(--reader-page)]"
              >
                Rate on Amazon
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
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
