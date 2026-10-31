import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LabPathChrome } from "@/components/learning/LabPathChrome";
import { ReturnToReading } from "@/components/learning/ReturnToReading";

export type LearningSurface = "lab" | "drill" | "book";

/**
 * Shared chrome for Labs / Drills workbench surfaces.
 * Editorial header + engineering-console tokens via `.learn-root`.
 */
export function LearningShell({
  children,
  surface = "lab",
  title,
  kicker = "Practical System Design",
  bookHref = "/system-design",
  chapterProseHref,
}: {
  children: ReactNode;
  surface?: LearningSurface;
  title?: string;
  kicker?: string;
  bookHref?: string;
  chapterProseHref?: string;
}) {
  const surfaceLabel = surface === "lab" ? "Labs" : surface === "drill" ? "Drills" : "Book";
  const surfaceHref =
    surface === "lab"
      ? "/system-design/experience"
      : surface === "drill"
        ? "/play"
        : "/system-design";

  return (
    <div className="learn-root exp-root relative min-h-[100dvh]" data-surface={surface}>
      <div aria-hidden="true" className="exp-atmosphere" />
      <header className="sticky top-0 z-40 border-b border-[color:var(--learn-line,var(--exp-line))] bg-[color-mix(in_srgb,var(--exp-panel-raise)_90%,transparent)] shadow-[0_1px_0_rgba(26,35,48,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[88rem] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--exp-fg)_5%,transparent)]"
            aria-label="Baodium home"
          >
            <span aria-hidden="true" className="relative h-2.5 w-2.5 shrink-0">
              <span className="absolute inset-0 rounded-[3px] bg-cinnabar transition-transform duration-500 group-hover:rotate-45" />
            </span>
            <span className="font-mono text-[0.72rem] font-medium tracking-[0.22em] text-[color:var(--exp-fg)]">
              BAODIUM
            </span>
          </Link>
          <span className="hidden text-[color:var(--exp-faint)] sm:inline" aria-hidden="true">
            /
          </span>
          <Link
            href={surfaceHref}
            className="hidden text-sm text-[color:var(--exp-muted)] transition-colors hover:text-[color:var(--exp-fg)] sm:inline"
          >
            {surfaceLabel}
          </Link>
          {surface === "lab" ? (
            <LabPathChrome title={title} />
          ) : title ? (
            <>
              <span className="hidden text-[color:var(--exp-faint)] md:inline" aria-hidden="true">
                /
              </span>
              <p className="hidden min-w-0 truncate font-serif text-sm italic text-[color:var(--exp-muted)] md:block">
                {title}
              </p>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {surface !== "drill" ? (
              <Link href="/play" className="chrome-link hidden sm:inline-flex">
                Drills
              </Link>
            ) : (
              <Link href="/system-design/experience" className="chrome-link hidden sm:inline-flex">
                Labs
              </Link>
            )}
            <Link href={bookHref} className="chrome-link">
              Book
            </Link>
            {surface === "lab" ? (
              <LabPathChrome prose />
            ) : chapterProseHref ? (
              <Link
                href={chapterProseHref}
                className="exp-btn exp-btn-ghost !min-h-9 !px-3 text-sm"
              >
                Chapter prose
              </Link>
            ) : null}
          </div>
        </div>
        <p className="sr-only">{kicker}</p>
        <Suspense fallback={null}>
          <ReturnToReading />
        </Suspense>
      </header>
      <main id="main" className="relative z-[1]">
        {children}
      </main>
    </div>
  );
}
