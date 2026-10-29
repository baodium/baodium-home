"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { parseReturnPath } from "@/lib/learning/interactive-concepts";

/** Banner when a lab/drill was opened from an InteractiveConcept in the book. */
export function ReturnToReading() {
  const params = useSearchParams();
  const fromBook = params.get("from") === "book";
  const returnPath = parseReturnPath(params.get("return"));
  if (!fromBook || !returnPath) return null;

  const hashIndex = returnPath.indexOf("#");
  const label =
    hashIndex >= 0
      ? "Return to chapter section"
      : "Return to chapter";

  return (
    <div className="border-b border-[color:var(--learn-line,var(--exp-line))] bg-[color-mix(in_srgb,#fff_70%,transparent)]">
      <div className="mx-auto flex w-full max-w-[88rem] items-center px-4 py-2 sm:px-6">
        <Link
          href={returnPath}
          className="inline-flex min-h-9 items-center gap-2 rounded-full px-2 text-sm text-[color:var(--exp-muted)] transition-colors hover:text-[color:var(--exp-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </Link>
      </div>
    </div>
  );
}
