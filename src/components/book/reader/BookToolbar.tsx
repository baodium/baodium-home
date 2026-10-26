"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowUpRight, List, Search, Type } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookSettings } from "@/components/book/reader/BookSettings";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

export function BookToolbar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const {
    setSidebarOpen,
    chromeVisible,
    settingsOpen,
    setSettingsOpen,
  } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-5 md:pt-4">
      <AnimatePresence initial={false}>
        {chromeVisible ? (
          <motion.header
            key="reader-hud"
            initial={reduceMotion ? false : { y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: -24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease }}
            className="pointer-events-auto relative mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--reader-chrome)_88%,transparent)] p-1.5 pl-3 shadow-[0_16px_40px_-22px_rgba(40,24,12,0.55)] backdrop-blur-xl"
            style={{ viewTransitionName: "reader-hud" }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open table of contents"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/#book"
                className="group inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-medium text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                />
                <span className="font-mono text-[0.68rem] tracking-[0.22em]">BAODIUM</span>
              </Link>
            </div>

            <p className="hidden min-w-0 truncate font-serif text-sm italic text-[var(--reader-muted)] sm:block">
              {book.title}
            </p>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenSearch}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
                aria-label="Search book"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                ref={settingsBtnRef}
                type="button"
                data-reader-settings-trigger
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  settingsOpen
                    ? "border-cinnabar/40 bg-[color-mix(in_srgb,var(--cinnabar)_12%,transparent)] text-[var(--reader-fg)]"
                    : "border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] text-[var(--reader-muted)] hover:text-[var(--reader-fg)]"
                }`}
                aria-label="Reading settings"
                aria-expanded={settingsOpen}
                aria-controls="reader-settings-panel"
              >
                <Type className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href={book.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)] sm:inline-flex"
              >
                Amazon
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </motion.header>
        ) : null}
      </AnimatePresence>
      <BookSettings anchorRef={settingsBtnRef} />
    </div>
  );
}
