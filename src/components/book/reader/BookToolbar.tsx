"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  List,
  MessageCircleHeart,
  Search,
  Type,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookSettings } from "@/components/book/reader/BookSettings";
import { buildReaderMailto } from "@/lib/book/feedback";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/#products", label: "Products" },
  { href: "/system-design", label: "Book overview" },
  { href: "/play", label: "Play" },
] as const;

export function BookToolbar({
  onOpenSearch,
  chapterTitle,
  chapterSlug,
}: {
  onOpenSearch: () => void;
  chapterTitle?: string;
  chapterSlug?: string;
}) {
  const {
    setSidebarOpen,
    chromeVisible,
    settingsOpen,
    setSettingsOpen,
  } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const [exploreOpen, setExploreOpen] = useState(false);

  useEffect(() => {
    if (!exploreOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!exploreRef.current?.contains(event.target as Node)) setExploreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExploreOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [exploreOpen]);

  const feedbackHref =
    chapterTitle && chapterSlug
      ? buildReaderMailto({
          kind: "enjoy",
          chapterTitle,
          chapterSlug,
          url:
            typeof window !== "undefined"
              ? window.location.href
              : `https://baodium.com/system-design/${chapterSlug}`,
        })
      : `mailto:baodium@gmail.com?subject=${encodeURIComponent("Book feedback")}`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40"
      style={{
        paddingTop: "max(0.65rem, env(safe-area-inset-top))",
        paddingLeft: "max(0.65rem, env(safe-area-inset-left))",
        paddingRight: "max(0.65rem, env(safe-area-inset-right))",
      }}
    >
      <AnimatePresence initial={false}>
        {chromeVisible ? (
          <motion.header
            key="reader-hud"
            initial={reduceMotion ? false : { y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: -24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease }}
            className="pointer-events-auto relative mx-auto flex w-full max-w-5xl items-center gap-2 overflow-visible rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--reader-chrome)_92%,transparent)] px-2.5 py-1.5 shadow-[0_16px_40px_-22px_rgba(40,24,12,0.55)] backdrop-blur-xl sm:rounded-full sm:px-3"
            style={{ viewTransitionName: "reader-hud" }}
          >
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open table of contents"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/"
                className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-2.5 text-[var(--reader-fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)]"
                aria-label="Baodium home"
              >
                <span
                  aria-hidden="true"
                  className="relative h-2.5 w-2.5 shrink-0"
                >
                  <span className="absolute inset-0 rounded-[3px] bg-gradient-to-br from-amber to-crimson transition-transform duration-500 group-hover:rotate-45" />
                </span>
                <span className="font-mono text-[0.72rem] font-medium tracking-[0.22em]">
                  BAODIUM
                </span>
              </Link>
              <div ref={exploreRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setExploreOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
                  aria-expanded={exploreOpen}
                  aria-haspopup="menu"
                >
                  Explore
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {exploreOpen ? (
                    <motion.div
                      role="menu"
                      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease }}
                      className="absolute left-0 top-[calc(100%+0.4rem)] z-50 min-w-[11rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] bg-[var(--reader-page)] py-1 shadow-[0_18px_40px_-24px_rgba(40,24,12,0.55)]"
                    >
                      {exploreLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          role="menuitem"
                          onClick={() => setExploreOpen(false)}
                          className="block px-3.5 py-2.5 text-sm text-[var(--reader-fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)]"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <p className="hidden min-w-0 flex-1 truncate text-center font-serif text-sm italic text-[var(--reader-muted)] md:block">
              {book.title}
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <a
                href={feedbackHref}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] text-[var(--reader-muted)] transition-colors hover:text-cinnabar sm:w-auto sm:gap-1.5 sm:px-3"
                aria-label="Send feedback to baodium@gmail.com"
                title="Feedback"
              >
                <MessageCircleHeart className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-sm sm:inline">Feedback</span>
              </a>
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
              >
                <Type className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href={book.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)] lg:inline-flex"
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
