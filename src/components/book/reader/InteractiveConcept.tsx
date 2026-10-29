"use client";

import Link from "next/link";
import { Activity, FlaskConical } from "lucide-react";
import type { InteractiveConceptDef } from "@/lib/learning/interactive-concepts";
import { withReturnToReading } from "@/lib/learning/interactive-concepts";

/** Editorial bridge from a manuscript section into a lab or drill. */
export function InteractiveConcept({ concept }: { concept: InteractiveConceptDef }) {
  return (
    <aside
      className="book-interactive-concept"
      data-no-flip=""
      data-concept={concept.id}
      aria-label={`Practice: ${concept.concept}`}
    >
      <p className="book-interactive-concept__kicker">
        <span aria-hidden="true" className="book-interactive-concept__mark" />
        Practice · {concept.concept}
      </p>
      <p className="book-interactive-concept__lead">{concept.lead}</p>
      <ul className="book-interactive-concept__targets">
        {concept.targets.map((target) => {
          const href = withReturnToReading(
            target.href,
            concept.chapterSlug,
            concept.afterSectionId,
          );
          const Icon = target.kind === "lab" ? FlaskConical : Activity;
          return (
            <li key={`${concept.id}-${target.href}`}>
              <Link href={href} className="book-interactive-concept__link" data-no-flip="">
                <span className="book-interactive-concept__icon" aria-hidden="true">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--reader-fg)]">
                    {target.label}
                  </span>
                  <span className="mt-0.5 block text-[0.8rem] text-[var(--reader-muted)]">
                    {target.detail}
                  </span>
                </span>
                <span aria-hidden="true" className="book-interactive-concept__arrow">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="book-interactive-concept__return-hint">
        Labs and drills keep a return link back to this section.
      </p>
    </aside>
  );
}
