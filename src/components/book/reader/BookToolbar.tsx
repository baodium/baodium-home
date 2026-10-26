"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
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
  { href: "/system-design/experience", label: "Experience lab" },
  { href: "/play", label: "Play" },
] as const;

function subscribeNowhere() {
  return () => {};
}

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
  const exploreBtnRef = useRef<HTMLButtonElement>(null);
  const exploreMenuRef = useRef<HTMLDivElement>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [explorePos, setExplorePos] = useState({ top: 64, left: 16 });
  const mounted = useSyncExternalStore(subscribeNowhere, () => true, () => false);

  useLayoutEffect(() => {
    if (!exploreOpen) return;
    const update = () => {
      const rect = exploreBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setExplorePos({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [exploreOpen]);

  useEffect(() => {
    if (!exploreOpen) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (exploreBtnRef.current?.contains(target)) return;
      if (exploreMenuRef.current?.contains(target)) return;
      setExploreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExploreOpen(false);
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
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
          url: `https://baodium.com/system-design/${chapterSlug}`,
        })
      : `mailto:baodium@gmail.com?subject=${encodeURIComponent("Book feedback")}`;

  const exploreMenu =
    mounted &&
    createPortal(
      <AnimatePresence>
        {exploreOpen ? (
          <motion.div
            ref={exploreMenuRef}
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease }}
            className="fixed z-[90] min-w-[12rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] py-1 shadow-[0_18px_40px_-24px_rgba(28,22,16,0.5)]"
            style={{ top: explorePos.top, left: explorePos.left }}
          >
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setExploreOpen(false)}
                className="block px-3.5 py-2.5 text-sm text-[var(--reader-fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--cinnabar)_8%,transparent)]"
              >
                {link.label}
              </Link>
            ))}
            <div
              aria-hidden="true"
              className="my-1 border-t border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)]"
            />
            <a
              href={book.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setExploreOpen(false)}
              className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--cinnabar)_8%,transparent)] hover:text-[var(--reader-fg)]"
            >
              Amazon
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>,
      document.body,
    );

  return (
    <div
      className="relative"
      style={{
        paddingTop: "max(0.55rem, env(safe-area-inset-top))",
        paddingLeft: "max(0.55rem, env(safe-area-inset-left))",
        paddingRight: "max(0.55rem, env(safe-area-inset-right))",
        paddingBottom: "0.35rem",
      }}
    >
      <AnimatePresence initial={false}>
        {chromeVisible ? (
          <motion.header
            key="reader-hud"
            initial={reduceMotion ? false : { y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: -10, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease }}
            className="book-reader-hud relative mx-auto flex w-full max-w-[calc(var(--reader-measure)+3.5rem)] items-center gap-1.5 overflow-visible rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_7%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_78%,transparent)] px-2 py-1 shadow-[0_10px_28px_-20px_rgba(18,17,16,0.4)] backdrop-blur-xl sm:rounded-full sm:px-2.5 sm:gap-2"
            style={{ viewTransitionName: "reader-hud" }}
          >
            <div className="flex min-w-0 shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-[var(--reader-fg)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open table of contents"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/"
                className="group inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-2 text-[var(--reader-fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)]"
                aria-label="Baodium home"
              >
                <span
                  aria-hidden="true"
                  className="relative h-2.5 w-2.5 shrink-0"
                >
                  <span className="absolute inset-0 rounded-[3px] bg-gradient-to-br from-amber to-crimson transition-transform duration-500 group-hover:rotate-45" />
                </span>
                <span className="whitespace-nowrap font-mono text-[0.7rem] font-medium tracking-[0.2em]">
                  BAODIUM
                </span>
              </Link>
              <div className="relative hidden sm:block">
                <button
                  ref={exploreBtnRef}
                  type="button"
                  onClick={() => setExploreOpen((v) => !v)}
                  className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-fg)]"
                  aria-expanded={exploreOpen}
                  aria-haspopup="menu"
                >
                  Explore
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="hidden min-w-0 flex-1 truncate px-2 text-center font-serif text-[0.8125rem] italic text-[var(--reader-muted)] md:block">
              {book.title}
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onOpenSearch}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-[var(--reader-fg)]"
                aria-label="Search book"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                ref={settingsBtnRef}
                type="button"
                data-reader-settings-trigger
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  settingsOpen
                    ? "bg-[color-mix(in_srgb,var(--cinnabar)_12%,transparent)] text-[var(--reader-fg)]"
                    : "text-[var(--reader-muted)] hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-[var(--reader-fg)]"
                }`}
                aria-label="Reading settings"
                aria-expanded={settingsOpen}
              >
                <Type className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href={feedbackHref}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--reader-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] hover:text-cinnabar"
                aria-label="Send feedback to baodium@gmail.com"
                title="Feedback"
              >
                <MessageCircleHeart className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </motion.header>
        ) : (
          <div className="h-2" aria-hidden="true" />
        )}
      </AnimatePresence>
      {exploreMenu}
      <BookSettings anchorRef={settingsBtnRef} />
    </div>
  );
}
