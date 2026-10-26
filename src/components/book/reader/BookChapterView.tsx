"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import type { BookChapter } from "@/lib/book/types";
import { ChapterContent } from "@/components/book/reader/ChapterContent";
import { BookChapterNav } from "@/components/book/reader/BookChapterNav";
import { BookFeedback } from "@/components/book/reader/BookFeedback";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { chapterKicker, chapterNumberLabel } from "@/lib/book/chapter-label";
import { flipNavigate } from "@/lib/book/flip-navigate";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;
const SWIPE_THRESHOLD = 64;

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
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const { flipDirection, setFlipDirection, setChromeVisible } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const dragX = useMotionValue(0);
  const pageShade = useTransform(dragX, [-160, 0, 160], [0.18, 0, 0.18]);
  const pageRotate = useTransform(dragX, [-220, 0, 220], [9, 0, -9]);
  const pageScale = useTransform(dragX, [-220, 0, 220], [0.985, 1, 0.985]);

  useEffect(() => {
    const scroller =
      (document.getElementById("book-reader-scroll") as HTMLElement | null) ??
      scrollRef.current;
    const prefs = loadReaderPrefs();
    const top = prefs.scrollTops?.[chapter.slug];
    if (scroller) {
      scroller.scrollTop = typeof top === "number" ? top : 0;
    }
    saveReaderPrefs({ ...prefs, lastSlug: chapter.slug });
    setChromeVisible(true);
  }, [chapter.slug, setChromeVisible]);

  useEffect(() => {
    const el =
      (document.getElementById("book-reader-scroll") as HTMLElement | null) ??
      scrollRef.current;
    if (!el) return;
    let last = el.scrollTop;
    const onScroll = () => {
      const prefs = loadReaderPrefs();
      saveReaderPrefs({
        ...prefs,
        scrollTops: { ...prefs.scrollTops, [chapter.slug]: el.scrollTop },
      });
      const y = el.scrollTop;
      const delta = y - last;
      if (Math.abs(delta) < 8) return;
      setChromeVisible(delta < 0 || y < 48);
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chapter.slug, setChromeVisible]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" && next) {
        setFlipDirection(1);
        flipNavigate(router, `/system-design/${next.slug}`, 1);
      }
      if (event.key === "ArrowLeft" && prev) {
        setFlipDirection(-1);
        flipNavigate(router, `/system-design/${prev.slug}`, -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router, setFlipDirection]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, pre, .book-listing")) return;
      pointerStart.current = { x: event.clientX, y: event.clientY, t: Date.now() };
    };

    const onPointerMove = (event: PointerEvent) => {
      const start = pointerStart.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < Math.abs(dy)) {
        dragX.set(0);
        return;
      }
      if (!reduceMotion) dragX.set(Math.max(-180, Math.min(180, dx * 0.55)));
    };

    const finishPointer = (event: PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      const dx = start ? event.clientX - start.x : 0;
      const dy = start ? event.clientY - start.y : 0;
      const dt = start ? Date.now() - start.t : 0;
      dragX.set(0);
      if (!start) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (dt > 1000) return;
      if (dx < 0 && next) {
        setFlipDirection(1);
        flipNavigate(router, `/system-design/${next.slug}`, 1);
      } else if (dx > 0 && prev) {
        setFlipDirection(-1);
        flipNavigate(router, `/system-design/${prev.slug}`, -1);
      }
    };

    stage.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);
    return () => {
      stage.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishPointer);
      window.removeEventListener("pointercancel", finishPointer);
    };
  }, [dragX, next, prev, reduceMotion, router, setFlipDirection]);

  const enterX = reduceMotion ? 0 : flipDirection >= 0 ? 72 : -72;
  const enterRotate = reduceMotion ? 0 : flipDirection >= 0 ? -12 : 12;

  return (
    <div
      ref={scrollRef}
      className="book-chapter-scroll relative mx-auto w-full max-w-[calc(var(--reader-measure)+4.5rem)] pb-16 pt-2 md:pt-3"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={chapter.slug}
          className="book-page-stage relative touch-pan-y [perspective:1600px]"
          initial={
            reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 0,
                  x: enterX,
                  rotateY: enterRotate,
                  scale: 0.97,
                  filter: "blur(3px)",
                }
          }
          animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1, filter: "blur(0px)" }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  x: flipDirection >= 0 ? -48 : 48,
                  rotateY: flipDirection >= 0 ? 8 : -8,
                  scale: 0.98,
                  filter: "blur(2px)",
                }
          }
          transition={{ duration: reduceMotion ? 0.01 : 0.58, ease }}
        >
          <motion.div
            ref={stageRef}
            className="relative"
            style={{
              x: dragX,
              rotateY: pageRotate,
              scale: pageScale,
              transformStyle: "preserve-3d",
            }}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-3 -left-2 z-0 w-3 rounded-l-lg bg-[color-mix(in_srgb,var(--reader-fg)_18%,transparent)] blur-[1px]"
              style={{ opacity: pageShade }}
            />
            <motion.div
              aria-hidden="true"
              className="book-page-curl pointer-events-none absolute inset-0 z-[2] rounded-[1.15rem]"
              style={{ opacity: pageShade }}
            />
            <article className="book-page relative overflow-hidden rounded-[1.15rem]">
              <div aria-hidden="true" className="book-page-gutter" />
              <div aria-hidden="true" className="book-page-grain" />
              <div className="relative z-[1] px-5 py-8 sm:px-9 sm:py-11 md:px-12 md:py-12">
                <header className="mb-8 border-b border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] pb-6">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-cinnabar">
                    <span className="mr-2 inline-block min-w-[1.6rem]">
                      {chapterNumberLabel(chapter.slug)}
                    </span>
                    {chapterKicker(chapter.slug, chapter.title)}
                  </p>
                  <h1 className="mt-3 font-serif text-[clamp(1.75rem,3.5vw,2.45rem)] leading-[1.08] tracking-[-0.02em]">
                    {chapter.title}
                  </h1>
                  {chapter.slug === "chapter-1" ? (
                    <Link
                      href="/system-design/experience/chapter-1"
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--cinnabar)_45%,transparent)] bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] px-4 text-sm font-medium text-cinnabar transition-colors hover:bg-[color-mix(in_srgb,var(--cinnabar)_18%,transparent)]"
                    >
                      Operate this incident
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </header>
                <ChapterContent html={chapter.html} />
                <BookFeedback chapterTitle={chapter.title} chapterSlug={chapter.slug} />
                <BookChapterNav prev={prev} next={next} />
              </div>
            </article>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
