"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { BookChapterMeta } from "@/lib/book/types";
import { ReaderProvider, useReader } from "@/components/book/reader/ReaderProvider";
import { BookSidebar } from "@/components/book/reader/BookSidebar";
import { BookToolbar } from "@/components/book/reader/BookToolbar";
import { BookSearch } from "@/components/book/reader/BookSearch";
import { BookProgress } from "@/components/book/reader/BookProgress";

function ShellBody({
  chapters,
  children,
}: {
  chapters: BookChapterMeta[];
  children: ReactNode;
}) {
  const { prefs, setChromeVisible } = useReader();
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const activeIndex = chapters.findIndex(
    (c) => pathname === `/system-design/${c.slug}`,
  );
  const active = activeIndex >= 0 ? chapters[activeIndex] : undefined;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.readerTheme = prefs.theme;
    root.dataset.readerScale = prefs.fontScale;
    root.dataset.readerMeasure = prefs.measure;
    return () => {
      delete root.dataset.readerTheme;
      delete root.dataset.readerScale;
      delete root.dataset.readerMeasure;
    };
  }, [prefs]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (event.clientY < 88) setChromeVisible(true);
    };
    const onTouch = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y != null && y < 96) setChromeVisible(true);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [setChromeVisible]);

  return (
    <div className="book-reader relative min-h-[100dvh] text-[var(--reader-fg)]">
      <div aria-hidden="true" className="book-reader-atmosphere" />
      <BookSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="relative z-[1] mx-auto flex h-[100dvh] w-full max-w-[92rem]">
        <BookSidebar chapters={chapters} />
        <div className="book-reader-stage relative z-0 flex min-w-0 flex-1 flex-col">
          <div className="relative z-50 shrink-0">
            <BookToolbar
              onOpenSearch={() => setSearchOpen(true)}
              chapterTitle={active?.title}
              chapterSlug={active?.slug}
            />
            {active ? (
              <BookProgress
                slug={active.slug}
                index={activeIndex}
                total={chapters.length}
              />
            ) : null}
          </div>
          <div
            id="book-reader-scroll"
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-10 pt-3 md:px-8 md:pb-14 lg:px-10"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookShell({
  chapters,
  children,
}: {
  chapters: BookChapterMeta[];
  children: ReactNode;
}) {
  return (
    <ReaderProvider>
      <ShellBody chapters={chapters}>{children}</ShellBody>
    </ReaderProvider>
  );
}
