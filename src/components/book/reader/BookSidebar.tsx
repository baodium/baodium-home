"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookPageOutline } from "@/components/book/reader/BookPageOutline";
import { chapterNumberLabel } from "@/lib/book/chapter-label";
import { flipTransitionTypes } from "@/lib/book/flip-navigate";

function subscribeLg(onChange: () => void) {
  const media = window.matchMedia("(min-width: 1024px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function lgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function useIsLgUp() {
  return useSyncExternalStore(subscribeLg, lgSnapshot, () => true);
}

export function BookSidebar({ chapters }: { chapters: BookChapterMeta[] }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, prefs, setPrefs } = useReader();
  const collapsed = Boolean(prefs.tocCollapsed);
  const isLgUp = useIsLgUp();
  /** Off-canvas drawer on small screens must not stay in the tab order. */
  const drawerInert = !isLgUp && !sidebarOpen;
  const activeChapter = chapters.find((c) => pathname === `/system-design/${c.slug}`);
  const activeIndex = activeChapter
    ? chapters.findIndex((c) => c.slug === activeChapter.slug)
    : -1;
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  const toggleCollapsed = () => {
    setPrefs({ tocCollapsed: !collapsed });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-ink/35 backdrop-blur-[2px] transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`book-sidebar fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-[color-mix(in_srgb,var(--reader-fg)_7%,transparent)] bg-[color-mix(in_srgb,var(--reader-chrome)_88%,transparent)] text-[var(--reader-fg)] backdrop-blur-md transition-[transform,width] duration-300 lg:static lg:z-0 lg:h-full lg:translate-x-0 lg:shrink-0 lg:bg-transparent lg:backdrop-blur-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsed
            ? "w-[min(100%,18.5rem)] lg:w-[3.25rem]"
            : "w-[min(100%,18.5rem)] lg:w-[15.75rem]"
        }`}
        aria-label="Table of contents"
        aria-hidden={drawerInert ? true : undefined}
        inert={drawerInert ? true : undefined}
        data-open={sidebarOpen ? "true" : "false"}
        data-collapsed={collapsed ? "true" : "false"}
        style={{ viewTransitionName: "reader-sidebar" }}
      >
        <div
          className={`flex items-center gap-2 px-2 pb-2 pt-4 lg:pt-5 ${
            collapsed ? "lg:justify-center lg:px-1" : "justify-between px-4"
          }`}
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <p
            className={`font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[var(--reader-muted)] ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Contents
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="icon-btn hidden h-8 w-8 lg:inline-flex"
              onClick={toggleCollapsed}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand table of contents" : "Collapse table of contents"}
              title={collapsed ? "Expand contents" : "Collapse contents"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="icon-btn h-8 w-8 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close contents"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          className={`flex flex-wrap gap-x-3 gap-y-1 border-b border-[color-mix(in_srgb,var(--reader-fg)_7%,transparent)] px-4 pb-3 text-xs sm:hidden ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          <Link href="/" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Home
          </Link>
          <Link href="/system-design" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Book
          </Link>
          <Link href="/system-design/experience" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Labs
          </Link>
          <Link href="/play" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Drills
          </Link>
          <Link href="/projects" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Projects
          </Link>
          <Link href="/about" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            About
          </Link>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]"
            onClick={() => setSidebarOpen(false)}
          >
            Amazon
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <nav
          data-lenis-prevent
          data-lenis-prevent-wheel
          className={`flex-1 overflow-y-auto pb-4 pt-1 ${collapsed ? "px-1" : "px-2"}`}
        >
          <ol className="space-y-0.5 text-[0.8125rem]">
            <li>
              <Link
                href="/system-design"
                title="Overview"
                className={`flex items-baseline gap-2.5 rounded-lg py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                  collapsed ? "justify-center px-1" : "px-2.5"
                } ${
                  pathname === "/system-design"
                    ? "bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] font-medium text-[var(--reader-fg)]"
                    : "text-[var(--reader-muted)]"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-center font-mono text-[0.62rem] tracking-[0.08em] text-[var(--reader-muted)]"
                >
                  ··
                </span>
                <span className={collapsed ? "sr-only" : ""}>Overview</span>
              </Link>
            </li>
            {chapters.map((chapter, to) => {
              const href = `/system-design/${chapter.slug}`;
              const active = pathname === href;
              const number = chapterNumberLabel(chapter.slug);
              const direction: 1 | -1 =
                activeIndex < 0 ? 1 : to >= activeIndex ? 1 : -1;
              return (
                <li key={chapter.slug}>
                  <Link
                    ref={active ? activeRef : undefined}
                    href={href}
                    prefetch
                    title={chapter.title}
                    transitionTypes={active ? undefined : flipTransitionTypes(direction)}
                    className={`flex items-baseline gap-2.5 rounded-lg py-1.5 leading-snug transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                      collapsed ? "justify-center px-1" : "px-2.5"
                    } ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--cinnabar)_9%,transparent)] font-medium text-[var(--reader-fg)]"
                        : "text-[var(--reader-muted)]"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-6 shrink-0 text-center font-mono text-[0.62rem] tracking-[0.08em] ${
                        active ? "text-cinnabar" : "text-[var(--reader-muted)]"
                      }`}
                    >
                      {number}
                    </span>
                    <span className={`min-w-0 ${collapsed ? "sr-only" : ""}`}>
                      {chapter.title}
                    </span>
                  </Link>
                  {!collapsed &&
                  active &&
                  activeChapter &&
                  activeChapter.sections.length > 1 ? (
                    <div className="mb-1 mt-0.5 pl-1">
                      <BookPageOutline sections={activeChapter.sections} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
    </>
  );
}
