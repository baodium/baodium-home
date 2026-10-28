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
import { consumeGestureFlip, flipNavigate } from "@/lib/book/flip-navigate";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const SWIPE_OFFSET = 72;
const SWIPE_VELOCITY = 420;
/** Constrained drag travel as a fraction of stage width. */
const DRAG_TRAVEL_VW = 0.42;

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
  const committingRef = useRef(false);
  const { setChromeVisible, settingsOpen, sidebarOpen } = useReader();
  const reduceMotion = usePrefersReducedMotion();
  const [flipHintOpen, setFlipHintOpen] = useState(false);
  const [dragDir, setDragDir] = useState<0 | 1 | -1>(0);
  const [committing, setCommitting] = useState(false);
  const [stageWidth, setStageWidth] = useState(720);
  const dragX = useMotionValue(0);
  const pageShade = useTransform(dragX, [-280, 0, 280], [0.42, 0, 0.42]);
  const pageRotate = useTransform(dragX, [-400, 0, 400], [22, 0, -22]);
  const pageScale = useTransform(dragX, [-400, 0, 400], [0.955, 1, 0.955]);
  const liftY = useTransform(dragX, [-400, 0, 400], [-10, 0, -10]);
  const peelOpacity = useTransform(dragX, [-220, -40, 0, 40, 220], [0.72, 0.18, 0, 0.18, 0.72]);
  const curlSkew = useTransform(dragX, [-300, 0, 300], [8, 0, -8]);

  const maxTravel = Math.max(200, Math.round(stageWidth * DRAG_TRAVEL_VW));

  const commitFlip = useCallback(
    async (href: string, direction: 1 | -1, gesture: boolean) => {
      if (committingRef.current) return;
      committingRef.current = true;
      setCommitting(true);
      setDragDir(direction);
      if (!reduceMotion && gesture) {
        const target =
          direction > 0
            ? -Math.max(maxTravel * 1.55, stageWidth * 0.72)
            : Math.max(maxTravel * 1.55, stageWidth * 0.72);
        try {
          await animate(dragX, target, {
            type: "spring",
            stiffness: 260,
            damping: 32,
            mass: 0.78,
            velocity: direction > 0 ? -1100 : 1100,
          });
        } catch {
          /* navigation still proceeds */
        }
      } else if (!reduceMotion && !gesture) {
        /* keyboard / chrome: short peel before VT takes over */
        const nudge = direction > 0 ? -Math.min(120, maxTravel * 0.35) : Math.min(120, maxTravel * 0.35);
        try {
          await animate(dragX, nudge, {
            type: "spring",
            stiffness: 380,
            damping: 36,
            mass: 0.6,
          });
        } catch {
          /* ignore */
        }
      }
      flipNavigate(router, href, direction, { gesture });
    },
    [dragX, maxTravel, reduceMotion, router, stageWidth],
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

    const gesture = consumeGestureFlip();
    if (gesture && !reduceMotion) {
      const from =
        gesture.direction > 0
          ? Math.max(maxTravel * 1.15, stageWidth * 0.55)
          : -Math.max(maxTravel * 1.15, stageWidth * 0.55);
      dragX.set(from);
      queueMicrotask(() => {
        setCommitting(false);
        setDragDir(0);
        void animate(dragX, 0, {
          type: "spring",
          stiffness: 240,
          damping: 30,
          mass: 0.85,
        });
      });
    } else {
      dragX.set(0);
      queueMicrotask(() => {
        setCommitting(false);
        setDragDir(0);
      });
    }
  }, [chapter.slug, dragX, maxTravel, reduceMotion, setChromeVisible, stageWidth]);

  useEffect(() => {
    if (settingsOpen || sidebarOpen) setChromeVisible(true);
  }, [settingsOpen, sidebarOpen, setChromeVisible]);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(".book-page-stage") as HTMLElement | null;
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
      if (settingsOpen || sidebarOpen) {
        setChromeVisible(true);
      } else {
        setChromeVisible(delta < 0 || y < 48);
      }
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chapter.slug, setChromeVisible, settingsOpen, sidebarOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" && next) {
        void commitFlip(`/system-design/${next.slug}`, 1, false);
      }
      if (event.key === "ArrowLeft" && prev) {
        void commitFlip(`/system-design/${prev.slug}`, -1, false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitFlip, next, prev]);

  const settleDrag = () => {
    setDragDir(0);
    if (reduceMotion) {
      dragX.set(0);
      return;
    }
    animate(dragX, 0, { type: "spring", stiffness: 420, damping: 36, mass: 0.7 });
  };

  const onDrag = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 8) return;
    setDragDir(info.offset.x < 0 ? 1 : -1);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    if ((dx < -SWIPE_OFFSET || vx < -SWIPE_VELOCITY) && next) {
      void commitFlip(`/system-design/${next.slug}`, 1, true);
      return;
    }
    if ((dx > SWIPE_OFFSET || vx > SWIPE_VELOCITY) && prev) {
      void commitFlip(`/system-design/${prev.slug}`, -1, true);
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
  const peelOnRight = dragDir !== -1;

  return (
    <div
      ref={scrollRef}
      className="book-chapter-scroll group/stage relative mx-auto w-full max-w-[calc(var(--reader-measure)+4.5rem)] pb-16 pt-2 md:pt-3"
    >
      <BookEdgeCues prevHref={prevHref} nextHref={nextHref} />
      <motion.div
        className="book-page-stage relative touch-pan-y [perspective:2000px]"
        style={{ x: reduceMotion ? 0 : dragX }}
        drag={reduceMotion || committing ? false : "x"}
        dragControls={dragControls}
        dragListener={false}
        dragDirectionLock
        dragConstraints={{ left: -maxTravel, right: maxTravel }}
        dragElastic={0.18}
        dragMomentum={false}
        onPointerDown={startDrag}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      >
        <motion.div
          className="relative"
          style={{
            y: reduceMotion ? 0 : liftY,
            rotateY: reduceMotion ? 0 : pageRotate,
            scale: reduceMotion ? 1 : pageScale,
            skewY: reduceMotion ? 0 : curlSkew,
            transformStyle: "preserve-3d",
          }}
        >
          {!reduceMotion ? (
            <>
              <motion.div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-1 z-0 w-5 rounded-lg bg-[color-mix(in_srgb,var(--reader-fg)_26%,transparent)] blur-[2px] ${
                  peelOnRight ? "-left-4 rounded-l-lg" : "-right-4 rounded-r-lg"
                }`}
                style={{ opacity: pageShade }}
              />
              <motion.div
                aria-hidden="true"
                className="book-page-curl pointer-events-none absolute inset-0 z-[2] rounded-[1.15rem]"
                style={{ opacity: pageShade }}
              />
              <motion.div
                aria-hidden="true"
                className={`book-page-peel pointer-events-none absolute inset-y-0 z-[3] w-[48%] ${
                  peelOnRight
                    ? "right-0 rounded-r-[1.15rem]"
                    : "left-0 rounded-l-[1.15rem] [transform:scaleX(-1)]"
                }`}
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
              <BookFeedback
                chapterTitle={chapter.title}
                chapterSlug={chapter.slug}
                suppressToast={flipHintOpen}
              />
              <BookChapterNav prev={prev} next={next} />
            </div>
          </article>
        </motion.div>
      </motion.div>
      <BookFlipHint onOpenChange={setFlipHintOpen} />
    </div>
  );
}
