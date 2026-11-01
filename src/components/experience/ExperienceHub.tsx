"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  chapterReading,
  chapterReadingServerSnapshot,
  directoryMarksServerSnapshot,
  loadDirectoryMarks,
  subscribeDirectory,
  type DirectoryMark,
} from "@/lib/learning/directory-progress";
import { CHAPTERS, directoryStatus, labActionLabel, type ChapterRecord } from "@/lib/learning/registry";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

function progressLabel(chapter: ChapterRecord, mark: DirectoryMark | undefined, reading: boolean) {
  if (mark?.finished && chapter.labKind === "full") return "Finished";
  if (mark?.finished) return "Lab finished";
  if (mark?.opened) return "Opened";
  if (reading) return "Reading";
  return null;
}

export function ExperienceHub() {
  const reduced = usePrefersReducedMotion();
  const marks = useSyncExternalStore(subscribeDirectory, loadDirectoryMarks, directoryMarksServerSnapshot);
  const reading = useSyncExternalStore(subscribeDirectory, chapterReading, chapterReadingServerSnapshot);
  const featured = CHAPTERS[0];
  const rest = CHAPTERS.slice(1);
  const full = CHAPTERS.filter((chapter) => chapter.labKind === "full").length;
  const short = CHAPTERS.filter((chapter) => chapter.labKind === "short").length;
  const book = CHAPTERS.filter((chapter) => chapter.labKind === "book").length;
  const finished = Object.values(marks).filter((mark) => mark.finished).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="exp-kicker">Practical System Design</p>
        <h1 className="mt-3 text-balance font-serif text-[clamp(2.1rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[color:var(--exp-fg)]">
          Operate the chapter
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[color:var(--exp-muted)]">
          {CHAPTERS.length} chapters. {full} full incidents, {short} short labs, and {book} still
          only in the book. A short lab is a smaller run. A chapter with no lab stays on the page.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--exp-faint)]">
          Progress stays in this browser. No sign-in.
          {finished > 0 ? ` Labs finished here: ${finished}.` : ""}
        </p>
      </header>

      {featured ? (
        <motion.div
          className="mt-12"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, ease }}
        >
          <ChapterCard chapter={featured} mark={marks[featured.slug]} reading={Boolean(reading[featured.slug])} featured />
        </motion.div>
      ) : null}

      <ol className="mt-6 divide-y divide-[color:var(--exp-line)] border-y border-[color:var(--exp-line)]">
        {rest.map((chapter, index) => (
          <motion.li
            key={chapter.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : Math.min(index, 8) * 0.03, ease }}
          >
            <ChapterCard chapter={chapter} mark={marks[chapter.slug]} reading={Boolean(reading[chapter.slug])} />
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function ChapterCard({
  chapter,
  mark,
  reading,
  featured = false,
}: {
  chapter: ChapterRecord;
  mark?: DirectoryMark;
  reading: boolean;
  featured?: boolean;
}) {
  const status = directoryStatus(chapter);
  const action = labActionLabel(chapter);
  const progress = progressLabel(chapter, mark, reading);
  const title = (
    <Link href={chapter.bookHref} className="transition-colors hover:text-[color:var(--exp-accent-text)]">
      {chapter.title}
    </Link>
  );

  if (featured) {
    return (
      <div className="lift-card grid gap-6 border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
        <p className="font-serif text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.04em] text-[color:var(--exp-faint)]">
          {String(chapter.number).padStart(2, "0")}
        </p>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--exp-faint)]">
            Start here · {status}
            {progress ? ` · ${progress}` : ""}
          </p>
          <h2 className="mt-2 font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-tight text-[color:var(--exp-fg)]">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-[color:var(--exp-muted)]">
            {chapter.statusLine}
          </p>
          {chapter.labHref && action ? (
            <Link
              href={chapter.labHref}
              className="mt-5 inline-flex items-center gap-2 text-[0.95rem] text-[color:var(--exp-accent-text)]"
            >
              {action}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[3.2rem_minmax(0,1fr)] items-baseline gap-3 px-2 py-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-6 sm:py-5">
      <span className="font-mono text-sm tabular-nums text-[color:var(--exp-faint)]">
        {String(chapter.number).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-xl text-[color:var(--exp-fg)]">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-[color:var(--exp-muted)]">{chapter.statusLine}</span>
      </span>
      <span className="col-start-2 flex flex-wrap items-center gap-3 sm:col-start-auto sm:justify-end">
        {progress ? (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            {progress}
          </span>
        ) : null}
        {chapter.labHref && action ? (
          <Link
            href={chapter.labHref}
            className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-accent-text)]"
          >
            {status}
          </Link>
        ) : (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-faint)]">
            {status}
          </span>
        )}
      </span>
    </div>
  );
}
