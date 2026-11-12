"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { BookChapterMeta } from "@/lib/book/types";
import { book } from "@/data/writing";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { BookPageOutline } from "@/components/book/reader/BookPageOutline";
import { BookNotesList } from "@/components/book/reader/BookPassageNotes";
import { chapterNumberLabel } from "@/lib/book/chapter-label";
import { isFullEditionSlug } from "@/lib/book/edition";
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
        className={`book-sidebar fixed inset-y-0 left-0 z-[70] flex flex-col text-[var(--reader-fg)] transition-[transform,width] duration-300 lg:static lg:z-0 lg:h-full lg:translate-x-0 lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsed
            ? "w-[min(100%,18.5rem)] lg:w-[4.5rem]"
            : "w-[min(100%,20rem)] lg:w-[18rem]"
        }`}
        aria-label="Table of contents"
        aria-hidden={drawerInert ? true : undefined}
        inert={drawerInert ? true : undefined}
        data-open={sidebarOpen ? "true" : "false"}
        data-collapsed={collapsed ? "true" : "false"}
        style={{ viewTransitionName: "reader-sidebar" }}
      >
        <div
          className={`flex items-center gap-3 px-3 pb-3 pt-5 lg:pt-6 ${
            collapsed ? "lg:justify-center lg:px-1" : "justify-between px-5"
          }`}
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className={`flex min-w-0 items-center gap-2.5 ${collapsed ? "lg:hidden" : ""}`}>
            <Image
              src={book.cover}
              alt=""
              width={64}
              height={96}
              className="h-14 w-10 shrink-0 rounded-[2px] object-cover shadow-[0_8px_16px_-12px_rgba(40,24,12,0.7)]"
            />
            <p className="font-mono text-sm uppercase tracking-[0.16em] text-[var(--reader-muted)]">
              Contents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden text-[0.875rem] text-[var(--reader-muted)] hover:text-[var(--reader-fg)] lg:inline"
              onClick={toggleCollapsed}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand table of contents" : "Collapse table of contents"}
            >
              {collapsed ? "Show" : "Hide"}
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center px-1 text-[0.75rem] text-[var(--reader-muted)] lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close contents"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          className={`flex flex-wrap gap-x-5 gap-y-2 border-b border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] px-5 pb-5 text-base ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          <Link href="/" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Home
          </Link>
          <Link href="/system-design" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Book
          </Link>
          <Link href="/labs" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Labs
          </Link>
          <Link href="/projects" className="text-[var(--reader-muted)] hover:text-[var(--reader-fg)]" onClick={() => setSidebarOpen(false)}>
            Projects
          </Link>
        </div>
        <nav
          data-lenis-prevent
          data-lenis-prevent-wheel
          className={`flex-1 overflow-y-auto pb-6 pt-3 ${collapsed ? "px-1" : "px-3"}`}
        >
          <ol className="space-y-1.5 text-base">
            <li>
              <Link
                href="/system-design"
                title="Overview"
                className={`flex items-baseline gap-3 rounded-lg py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                  collapsed ? "justify-center px-1" : "px-3"
                } ${
                  pathname === "/system-design"
                    ? "bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] font-medium text-[var(--reader-fg)]"
                    : "text-[var(--reader-muted)]"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span
                  aria-hidden="true"
                  className="w-7 shrink-0 text-center font-mono text-[0.72rem] tracking-[0.06em] text-[var(--reader-muted)]"
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
              const locked = isFullEditionSlug(chapter.slug);
              const direction: 1 | -1 =
                activeIndex < 0 ? 1 : to >= activeIndex ? 1 : -1;
              return (
                <li key={chapter.slug}>
                  <Link
                    ref={active ? activeRef : undefined}
                    href={href}
                    prefetch
                    title={locked ? `${chapter.title}. Full edition` : chapter.title}
                    aria-label={locked ? `${chapter.title}, full edition` : undefined}
                    transitionTypes={active ? undefined : flipTransitionTypes(direction)}
                    data-active={active ? "true" : "false"}
                    className={`book-toc-link flex items-baseline gap-3 rounded-lg py-2.5 leading-snug transition-colors hover:bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] ${
                      collapsed ? "justify-center px-1" : "px-3"
                    } ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--reader-fg)_6%,transparent)] font-medium text-[var(--reader-fg)]"
                        : "text-[var(--reader-muted)]"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-7 shrink-0 text-center font-mono text-[0.72rem] tracking-[0.06em] ${
                        active ? "text-cinnabar" : "text-[var(--reader-muted)]"
                      }`}
                    >
                      {number}
                    </span>
                    <span className={`min-w-0 ${collapsed ? "sr-only" : ""}`}>
                      <span className="block">{chapter.title}</span>
                      {locked ? (
                        <span className="mt-1 block font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--reader-muted)]">
                          Full edition
                        </span>
                      ) : null}
                    </span>
                  </Link>
                  {!collapsed &&
                  !locked &&
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
        {!collapsed && activeChapter ? <BookNotesList slug={activeChapter.slug} /> : null}
      </aside>
    </>
  );
}
