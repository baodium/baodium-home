"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BookChapterMeta } from "@/lib/book/types";
import { ReaderProvider, useReader } from "@/components/book/reader/ReaderProvider";
import { BookSidebar } from "@/components/book/reader/BookSidebar";
import { BookToolbar } from "@/components/book/reader/BookToolbar";
import { BookSearch } from "@/components/book/reader/BookSearch";

function ShellBody({
  chapters,
  children,
}: {
  chapters: BookChapterMeta[];
  children: ReactNode;
}) {
  const { prefs, setChromeVisible } = useReader();
  const [searchOpen, setSearchOpen] = useState(false);

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
      if (event.clientY < 72) setChromeVisible(true);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [setChromeVisible]);

  return (
    <div className="book-reader relative min-h-[100dvh] text-[var(--reader-fg)]">
      <div aria-hidden="true" className="book-reader-atmosphere" />
      <BookSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <BookToolbar onOpenSearch={() => setSearchOpen(true)} />
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-6xl overflow-hidden">
        <BookSidebar chapters={chapters} />
        <div
          id="book-reader-scroll"
          className="book-reader-stage relative z-[1] min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-10 pt-2 md:px-6 md:pb-14"
        >
          {children}
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
