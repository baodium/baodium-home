"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { BookChapter } from "@/lib/book/types";
import { ChapterContent } from "@/components/book/reader/ChapterContent";
import { BookChapterNav } from "@/components/book/reader/BookChapterNav";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";

export function BookChapterView({
  chapter,
  prev,
  next,
}: {
  chapter: BookChapter;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefs = loadReaderPrefs();
    const top = prefs.scrollTops?.[chapter.slug];
    if (scrollRef.current && typeof top === "number") {
      scrollRef.current.scrollTop = top;
    }
    saveReaderPrefs({ ...prefs, lastSlug: chapter.slug });
  }, [chapter.slug]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const prefs = loadReaderPrefs();
      saveReaderPrefs({
        ...prefs,
        scrollTops: { ...prefs.scrollTops, [chapter.slug]: el.scrollTop },
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chapter.slug]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" && next) router.push(`/system-design/${next.slug}`);
      if (event.key === "ArrowLeft" && prev) router.push(`/system-design/${prev.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  return (
    <div ref={scrollRef} className="book-chapter-scroll mx-auto w-full max-w-[var(--reader-measure)]">
      <header className="mb-8 border-b border-ink/10 pb-6">
        <h1 className="font-serif text-[clamp(1.75rem,3.5vw,2.35rem)] leading-[1.08] tracking-[-0.02em]">
          {chapter.title}
        </h1>
      </header>
      <ChapterContent html={chapter.html} />
      <BookChapterNav prev={prev} next={next} />
    </div>
  );
}
