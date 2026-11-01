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
import { ChapterPlate } from "@/components/learning/ChapterPlate";
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

      <ol className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((chapter, index) => (
          <motion.li
            key={chapter.id}
            className="h-full"
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

  const plate = (
    <ChapterPlate
      chapter={chapter.slug}
      priority={featured}
      sizes={featured ? "(min-width: 768px) 52vw, 100vw" : "(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 100vw"}
      className={featured ? "min-h-[15rem] h-full w-full" : "aspect-[16/10] w-full"}
    />
  );

  if (featured) {
    return (
      <article className="lift-card grid overflow-hidden border border-[color:var(--exp-line)] bg-[color:var(--exp-panel-raise)] md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        {plate}
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="font-mono text-[0.78rem] text-[color:var(--exp-faint)]">
            Chapter {String(chapter.number).padStart(2, "0")} · {status}
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
      </article>
    );
  }

  return (
    <article className="lift-card flex h-full flex-col overflow-hidden border border-[color:var(--exp-line)] bg-[color:var(--exp-panel-raise)]">
      {plate}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="font-mono text-[0.75rem] text-[color:var(--exp-faint)]">
          Chapter {String(chapter.number).padStart(2, "0")}
          {progress ? ` · ${progress}` : ""}
        </p>
        <h2 className="mt-2 font-serif text-[1.2rem] leading-snug text-[color:var(--exp-fg)]">{title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--exp-muted)]">{chapter.statusLine}</p>
        {chapter.labHref && action ? (
          <Link
            href={chapter.labHref}
            className="mt-4 inline-flex items-center gap-2 text-sm text-[color:var(--exp-accent-text)]"
          >
            {action}
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--exp-faint)]">{status}</p>
        )}
      </div>
    </article>
  );
}
