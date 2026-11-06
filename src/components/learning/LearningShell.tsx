import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
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
}: {
  children: ReactNode;
  surface?: LearningSurface;
  title?: string;
  kicker?: string;
  bookHref?: string;
  chapterProseHref?: string;
}) {
  return (
    <div className="learn-root exp-root relative min-h-[100dvh]" data-surface={surface}>
      <div aria-hidden="true" className="exp-atmosphere" />
      <SiteHeader />
      <p className="sr-only">{title ? `${kicker}. ${title}` : kicker}</p>
      <Suspense fallback={null}>
        <ReturnToReading />
      </Suspense>
      <main id="main" className="relative z-[1]">
        {children}
      </main>
    </div>
  );
}
