"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { flipNavigate } from "@/lib/book/flip-navigate";

/** Desktop edge affordances — tooltip titles explain swipe / arrows. */
export function BookEdgeCues({
  prevHref,
  nextHref,
}: {
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[2] hidden md:block"
    >
      {prevHref ? (
        <button
          type="button"
          title="Previous chapter · Swipe right or ←"
          aria-label="Previous chapter"
          className="pointer-events-auto absolute left-1 top-1/2 flex h-14 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_72%,transparent)] text-[var(--reader-muted)] opacity-0 shadow-[0_12px_28px_-18px_rgba(28,22,16,0.45)] backdrop-blur-md transition-[opacity,transform,color] hover:translate-x-0.5 hover:text-cinnabar group-hover/stage:opacity-100 focus-visible:opacity-100 lg:left-2"
          onClick={() => flipNavigate(router, prevHref, -1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      {nextHref ? (
        <button
          type="button"
          title="Next chapter · Swipe left or →"
          aria-label="Next chapter"
          className="pointer-events-auto absolute right-1 top-1/2 flex h-14 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--reader-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--reader-page)_72%,transparent)] text-[var(--reader-muted)] opacity-0 shadow-[0_12px_28px_-18px_rgba(28,22,16,0.45)] backdrop-blur-md transition-[opacity,transform,color] hover:-translate-x-0.5 hover:text-cinnabar group-hover/stage:opacity-100 focus-visible:opacity-100 lg:right-2"
          onClick={() => flipNavigate(router, nextHref, 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
