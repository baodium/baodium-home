"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BookChapterMeta } from "@/lib/book/types";
import { ReaderProvider, useReader } from "@/components/book/reader/ReaderProvider";
import { BookSidebar } from "@/components/book/reader/BookSidebar";
import { BookToolbar } from "@/components/book/reader/BookToolbar";
import { BookSearch } from "@/components/book/reader/BookSearch";
import { BookSettings } from "@/components/book/reader/BookSettings";

function ShellBody({
  chapters,
  children,
}: {
  chapters: BookChapterMeta[];
  children: ReactNode;
}) {
  const { prefs } = useReader();
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

  return (
    <div className="book-reader min-h-[100dvh] bg-[var(--reader-bg)] text-[var(--reader-fg)]">
      <BookToolbar onOpenSearch={() => setSearchOpen(true)} />
      <BookSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="mx-auto flex w-full max-w-6xl lg:min-h-[calc(100dvh-3.25rem)]">
        <BookSidebar chapters={chapters} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-4 py-8 md:px-8 md:py-12">{children}</div>
          <div className="border-t border-ink/10 px-4 md:px-8">
            <BookSettings />
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
