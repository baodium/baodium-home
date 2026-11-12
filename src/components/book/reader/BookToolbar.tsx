"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Check,
  Flag,
  List,
  MessageCircleHeart,
  Search,
  Share2,
  Type,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookSettings } from "@/components/book/reader/BookSettings";
import { amazonReviewUrl, buildCorrectionMailto } from "@/lib/book/feedback";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

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
  const [copied, setCopied] = useState(false);

  const reviewHref = amazonReviewUrl();
  const problemHref = chapterTitle
    ? buildCorrectionMailto({
        chapterTitle,
        chapterSlug: chapterSlug ?? "book",
        url: chapterSlug
          ? `https://baodium.com/system-design/${chapterSlug}`
          : "https://baodium.com/system-design",
      })
    : null;

  const shareChapter = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : chapterSlug
          ? `https://baodium.com/system-design/${chapterSlug}`
          : "https://baodium.com/system-design";
    const title = chapterTitle ?? book.title;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
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
            className="book-reader-hud relative flex w-full items-center gap-2 overflow-visible rounded-none border-b border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] px-4 py-2.5 sm:px-5"
            style={{ viewTransitionName: "reader-hud" }}
          >
            <div className="flex min-w-0 shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="icon-btn lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open table of contents"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/"
                className="text-btn group !h-9 shrink-0 gap-2 !px-2 !text-[var(--reader-fg)]"
                aria-label="Baodium home"
              >
                <Image
                  src={book.cover}
                  alt=""
                  width={40}
                  height={60}
                  className="h-7 w-5 shrink-0 rounded-[1px] object-cover"
                />
                <span className="whitespace-nowrap font-mono text-[0.8rem] font-medium tracking-[0.18em]">
                  BAODIUM
                </span>
              </Link>
              <nav
                aria-label="Site"
                className="ml-1 hidden items-center gap-0.5 sm:flex"
              >
                {[
                  { href: "/", label: "Home" },
                  { href: "/system-design", label: "Book" },
                  { href: "/labs", label: "Labs" },
                  { href: "/projects", label: "Projects" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-btn !px-2.5 text-[0.95rem]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <p className="hidden min-w-0 flex-1 truncate px-3 text-center font-serif text-base italic text-[var(--reader-muted)] lg:block">
              {book.title}
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onOpenSearch}
                className="icon-btn"
                aria-label="Search book"
                title="Search · ⌘/Ctrl K"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                ref={settingsBtnRef}
                type="button"
                data-reader-settings-trigger
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="icon-btn"
                data-open={settingsOpen ? "true" : "false"}
                aria-label="Reading settings"
                aria-expanded={settingsOpen}
              >
                <Type className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={shareChapter}
                className="icon-btn"
                aria-label={copied ? "Chapter link copied" : "Share chapter"}
                title={copied ? "Copied" : "Share"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-cinnabar" aria-hidden="true" />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {problemHref ? (
                <a
                  href={problemHref}
                  className="icon-btn"
                  aria-label={`Report a problem in ${chapterTitle}`}
                  title="Report a problem"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
              <a
                href={reviewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                data-tone="cinnabar"
                aria-label="Rate Practical System Design on Amazon"
                title="Rate on Amazon"
              >
                <MessageCircleHeart className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </motion.header>
        ) : (
          <motion.div
            key="reader-home-dot"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.22, ease }}
            className="flex w-full items-center px-3 sm:px-4"
          >
            <Link
              href="/"
              className="group inline-flex h-9 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_82%,transparent)] px-2.5 text-[var(--reader-fg)] shadow-[0_8px_20px_-14px_rgba(18,17,16,0.4)] backdrop-blur-md"
              aria-label="Baodium home"
            >
              <span aria-hidden="true" className="relative h-2 w-2 shrink-0">
                <span className="absolute inset-0 rounded-[2px] bg-cinnabar" />
              </span>
              <span className="whitespace-nowrap font-mono text-[0.62rem] font-medium tracking-[0.18em]">
                BAODIUM
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <BookSettings anchorRef={settingsBtnRef} />
    </div>
  );
}
