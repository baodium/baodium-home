"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
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

const SWIPE_OFFSET = 88;
const SWIPE_VELOCITY = 520;
/** Max hinge rotation while dragging — page stays covering the stage. */
const MAX_FLIP_DEG = 58;
const AXIS_LOCK_PX = 10;

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
  const committingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const axisRef = useRef<"undecided" | "x" | "y">("undecided");
  const activeRef = useRef(false);

  const { setChromeVisible, settingsOpen, sidebarOpen, exploreOpen } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const [flipHintOpen, setFlipHintOpen] = useState(false);
  /** +1 next (hinge left), −1 prev (hinge right), 0 idle */
  const [dragDir, setDragDir] = useState<0 | 1 | -1>(0);
  const [stageWidth, setStageWidth] = useState(720);

  const dragX = useMotionValue(0);
  const flipAngle = useTransform(dragX, (x) => {
    if (stageWidth <= 0) return 0;
    const t = Math.max(-1, Math.min(1, x / (stageWidth * 0.55)));
    return -t * MAX_FLIP_DEG;
  });
  const pageShade = useTransform(dragX, (x) => {
    if (stageWidth <= 0) return 0;
    return Math.min(0.55, (Math.abs(x) / (stageWidth * 0.55)) * 0.55);
  });
  const underlayLift = useTransform(dragX, (x) => {
    if (stageWidth <= 0) return 0.94;
    const t = Math.min(1, Math.abs(x) / (stageWidth * 0.55));
    return 0.94 + t * 0.06;
  });

  const commitFlip = useCallback(
    (href: string, direction: 1 | -1) => {
      if (committingRef.current) return;
      committingRef.current = true;
      setDragDir(direction);
      /* Settle the hinge so ViewTransition captures a full page — never fling off-stage. */
      dragX.set(0);
      flipNavigate(router, href, direction);
    },
    [dragX, router],
  );

  const settleDrag = useCallback(() => {
    setDragDir(0);
    if (reduceMotion) {
      dragX.set(0);
      return;
    }
    void animate(dragX, 0, { type: "spring", stiffness: 420, damping: 36, mass: 0.7 });
  }, [dragX, reduceMotion]);

  const endPointer = useCallback(
    (clientX: number) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      pointerIdRef.current = null;

      if (axisRef.current !== "x") {
        dragX.set(0);
        setDragDir(0);
        axisRef.current = "undecided";
        return;
      }

      const dx = dragX.get();
      const dt = Math.max(0.016, (performance.now() - lastTRef.current) / 1000);
      const vx = (clientX - lastXRef.current) / dt;
      axisRef.current = "undecided";

      if ((dx < -SWIPE_OFFSET || vx < -SWIPE_VELOCITY) && next) {
        commitFlip(`/system-design/${next.slug}`, 1);
        return;
      }
      if ((dx > SWIPE_OFFSET || vx > SWIPE_VELOCITY) && prev) {
        commitFlip(`/system-design/${prev.slug}`, -1);
        return;
      }
      settleDrag();
    },
    [commitFlip, dragX, next, prev, settleDrag],
  );

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
    committingRef.current = false;
    activeRef.current = false;
    pointerIdRef.current = null;
    axisRef.current = "undecided";
    dragX.set(0);
    queueMicrotask(() => setDragDir(0));
  }, [chapter.slug, dragX, setChromeVisible]);

  useEffect(() => {
    if (settingsOpen || sidebarOpen || exploreOpen) setChromeVisible(true);
  }, [settingsOpen, sidebarOpen, exploreOpen, setChromeVisible]);

  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (el) setStageWidth(el.offsetWidth);
      else setStageWidth(window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [chapter.slug]);

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
      if (settingsOpen || sidebarOpen || exploreOpen) {
        setChromeVisible(true);
      } else {
        setChromeVisible(delta < 0 || y < 48);
      }
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chapter.slug, setChromeVisible, settingsOpen, sidebarOpen, exploreOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" && next) {
        commitFlip(`/system-design/${next.slug}`, 1);
      }
      if (event.key === "ArrowLeft" && prev) {
        commitFlip(`/system-design/${prev.slug}`, -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitFlip, next, prev]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduceMotion || committingRef.current) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, textarea, pre, .book-listing, [data-no-flip]")) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;

    activeRef.current = true;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    lastXRef.current = event.clientX;
    lastTRef.current = performance.now();
    axisRef.current = "undecided";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeRef.current || pointerIdRef.current !== event.pointerId) return;

    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    if (axisRef.current === "undecided") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        axisRef.current = "y";
        dragX.set(0);
        setDragDir(0);
        return;
      }
      axisRef.current = "x";
    }

    if (axisRef.current !== "x") return;

    event.preventDefault();
    const maxTravel = Math.max(160, Math.round(stageWidth * 0.42));
    const clamped = Math.max(-maxTravel, Math.min(maxTravel, dx));
    dragX.set(clamped);
    if (Math.abs(clamped) >= 8) {
      setDragDir(clamped < 0 ? 1 : -1);
    }
    lastXRef.current = event.clientX;
    lastTRef.current = performance.now();
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    endPointer(event.clientX);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    activeRef.current = false;
    pointerIdRef.current = null;
    axisRef.current = "undecided";
    settleDrag();
  };

  const prevHref = prev ? `/system-design/${prev.slug}` : null;
  const nextHref = next ? `/system-design/${next.slug}` : null;
  const hingeLeft = dragDir !== -1;
  const preview = hingeLeft ? next : prev;

  return (
    <div
      ref={scrollRef}
      className="book-chapter-scroll group/stage relative mx-auto w-full max-w-[calc(var(--reader-measure)+4.5rem)] pb-16 pt-2 md:pt-3"
    >
      <BookEdgeCues prevHref={prevHref} nextHref={nextHref} />
      <div
        ref={stageRef}
        className="book-page-stage relative touch-pan-y [perspective:1800px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Paper underlay — always fills the stage so the desk never shows through a flip. */}
        <motion.div
          aria-hidden="true"
          className="book-page-underlay pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.15rem]"
          style={{ scale: reduceMotion ? 1 : underlayLift }}
        >
          <div className="book-page absolute inset-0 rounded-[1.15rem]">
            <div className="book-page-gutter" />
            <div className="book-page-grain" />
            {preview && dragDir !== 0 ? (
              <div
                className={`relative z-[1] flex h-full min-h-[14rem] flex-col justify-center px-8 py-10 sm:px-12 ${
                  hingeLeft ? "items-start text-left" : "items-end text-right"
                }`}
              >
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-cinnabar">
                  <span className="mr-2 inline-block min-w-[1.6rem]">
                    {chapterNumberLabel(preview.slug)}
                  </span>
                  {chapterKicker(preview.slug, preview.title)}
                </p>
                <p className="mt-3 max-w-[18rem] font-serif text-xl leading-snug tracking-[-0.02em] text-[var(--reader-fg)] sm:text-2xl">
                  {preview.title}
                </p>
              </div>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          className="book-page-leaf relative z-[1] will-change-transform"
          style={{
            rotateY: reduceMotion ? 0 : flipAngle,
            transformOrigin: hingeLeft ? "left center" : "right center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        >
          {!reduceMotion ? (
            <motion.div
              aria-hidden="true"
              className={`book-page-hinge-shade pointer-events-none absolute inset-y-0 z-[2] w-[42%] ${
                hingeLeft ? "right-0" : "left-0 [transform:scaleX(-1)]"
              }`}
              style={{ opacity: pageShade }}
            />
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
              <BookFeedback
                chapterTitle={chapter.title}
                chapterSlug={chapter.slug}
                suppressToast={flipHintOpen}
              />
              <BookChapterNav prev={prev} next={next} />
            </div>
          </article>
        </motion.div>
      </div>
      <BookFlipHint onOpenChange={setFlipHintOpen} />
    </div>
  );
}
