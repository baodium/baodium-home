"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import type { BookChapter } from "@/lib/book/types";
import { ChapterContent } from "@/components/book/reader/ChapterContent";
import { BookChapterNav } from "@/components/book/reader/BookChapterNav";
import { BookFeedback } from "@/components/book/reader/BookFeedback";
import { BookEdgeCues } from "@/components/book/reader/BookEdgeCues";
import { BookFlipHint } from "@/components/book/reader/BookFlipHint";
import { useReader } from "@/components/book/reader/ReaderProvider";
import { loadReaderPrefs, saveReaderPrefs } from "@/lib/book/reader-styles";
import { chapterKicker, chapterNumberLabel } from "@/lib/book/chapter-label";
import { flipNavigate } from "@/lib/book/flip-navigate";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const SWIPE_OFFSET = 72;
const SWIPE_VELOCITY = 520;

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
  const dragControls = useDragControls();
  const { setChromeVisible } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const dragX = useMotionValue(0);
  const pageShade = useTransform(dragX, [-200, 0, 200], [0.32, 0, 0.32]);
  const pageRotate = useTransform(dragX, [-260, 0, 260], [12, 0, -12]);
  const pageScale = useTransform(dragX, [-260, 0, 260], [0.978, 1, 0.978]);
  const liftY = useTransform(dragX, [-260, 0, 260], [-5, 0, -5]);
  const peelOpacity = useTransform(dragX, [-160, -40, 0, 40, 160], [0.5, 0.1, 0, 0.1, 0.5]);

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
    dragX.set(0);
  }, [chapter.slug, dragX, setChromeVisible]);

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
        flipNavigate(router, `/system-design/${next.slug}`, 1);
      }
      if (event.key === "ArrowLeft" && prev) {
        flipNavigate(router, `/system-design/${prev.slug}`, -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  const settleDrag = () => {
    if (reduceMotion) {
      dragX.set(0);
      return;
    }
    animate(dragX, 0, { type: "spring", stiffness: 420, damping: 36, mass: 0.7 });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    if ((dx < -SWIPE_OFFSET || vx < -SWIPE_VELOCITY) && next) {
      flipNavigate(router, `/system-design/${next.slug}`, 1);
      return;
    }
    if ((dx > SWIPE_OFFSET || vx > SWIPE_VELOCITY) && prev) {
      flipNavigate(router, `/system-design/${prev.slug}`, -1);
      return;
    }
    settleDrag();
  };

  const startDrag = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, textarea, pre, .book-listing, [data-no-flip]")) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragControls.start(event);
  };

  const prevHref = prev ? `/system-design/${prev.slug}` : null;
  const nextHref = next ? `/system-design/${next.slug}` : null;

  return (
    <div
      ref={scrollRef}
      className="book-chapter-scroll group/stage relative mx-auto w-full max-w-[calc(var(--reader-measure)+4.5rem)] pb-16 pt-2 md:pt-3"
    >
      <BookEdgeCues prevHref={prevHref} nextHref={nextHref} />
      <motion.div
        className="book-page-stage relative touch-pan-y [perspective:1800px]"
        style={{ x: reduceMotion ? 0 : dragX }}
        drag={reduceMotion ? false : "x"}
        dragControls={dragControls}
        dragListener={false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.22}
        dragMomentum={false}
        onPointerDown={startDrag}
        onDragEnd={onDragEnd}
      >
        <motion.div
          className="relative"
          style={{
            y: reduceMotion ? 0 : liftY,
            rotateY: reduceMotion ? 0 : pageRotate,
            scale: reduceMotion ? 1 : pageScale,
            transformStyle: "preserve-3d",
          }}
        >
          {!reduceMotion ? (
            <>
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-2 -left-3 z-0 w-4 rounded-l-lg bg-[color-mix(in_srgb,var(--reader-fg)_22%,transparent)] blur-[1.5px]"
                style={{ opacity: pageShade }}
              />
              <motion.div
                aria-hidden="true"
                className="book-page-curl pointer-events-none absolute inset-0 z-[2] rounded-[1.15rem]"
                style={{ opacity: pageShade }}
              />
              <motion.div
                aria-hidden="true"
                className="book-page-peel pointer-events-none absolute inset-y-0 right-0 z-[3] w-[42%] rounded-r-[1.15rem]"
                style={{ opacity: peelOpacity }}
              />
            </>
          ) : null}
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
      <BookFlipHint />
    </div>
  );
}
