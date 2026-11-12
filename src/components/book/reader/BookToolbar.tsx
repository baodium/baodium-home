"use client";

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
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookSettings } from "@/components/book/reader/BookSettings";
import { amazonReviewUrl, buildCorrectionMailto } from "@/lib/book/feedback";

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
    settingsOpen,
    setSettingsOpen,
  } = useReader();
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
    <div className="relative">
      <header
        className="book-reader-hud relative flex w-full items-center gap-2 overflow-visible border-b border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] bg-[var(--reader-page)] px-4 py-2 sm:px-5"
        data-no-flip
      >
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open table of contents"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="min-w-0 flex-1 truncate font-serif text-base italic text-[var(--reader-muted)]">
              {chapterTitle ?? book.title}
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
      </header>
      <BookSettings anchorRef={settingsBtnRef} />
    </div>
  );
}
