"use client";

import { useId, useRef, useState } from "react";
import { products } from "@/data/projects";
import { site } from "@/data/site";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

type Term = {
  word: string;
  href: string;
  external?: boolean;
  title: string;
  note: string;
};

const interview = products.find((p) => p.slug === "interview-coach");
const upto = products.find((p) => p.slug === "upto");

const terms: Term[] = [
  {
    word: "Interview Coach",
    href: interview?.url ?? "https://interview.baodium.com/",
    external: true,
    title: "Product",
    note: interview?.outcome.detail ?? "Practice rounds with feedback you can act on.",
  },
  {
    word: "UpTo",
    href: upto?.url ?? "https://upto.baodium.com/",
    external: true,
    title: "Product",
    note: upto?.outcome.detail ?? "One status page across every profile.",
  },
  {
    word: "Practical System Design",
    href: site.book.freeRead,
    external: true,
    title: "Book",
    note: "Fourteen incidents. Free to read online — Amazon nearby.",
  },
  {
    word: "SLO Watch",
    href: "#play",
    title: "Game",
    note: "Keep the checkout SLO alive through traffic spikes and retry storms.",
  },
];

export function DiscoverTerms() {
  const rootId = useId();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [hintArmed, setHintArmed] = useState(true);
  const hint = hintArmed && !reduced;
  const closeTimer = useRef<number | null>(null);

  const open = (index: number) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActive(index);
    setHintArmed(false);
  };

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setActive(null), 160);
  };

  const activeTerm = active !== null ? terms[active] : null;

  return (
    <section
      aria-labelledby={`${rootId}-label`}
      className="relative border-y border-line py-10 md:py-12"
    >
      <div className="shell">
        <p
          id={`${rootId}-label`}
          className="font-sans text-[0.68rem] font-medium uppercase tracking-[0.2em] text-faint"
        >
          Hover or tap the underlined words
        </p>
        <p className="mt-5 max-w-3xl font-serif text-[1.35rem] leading-snug tracking-[-0.02em] text-ink md:text-[1.7rem]">
          Baodium ships{" "}
          {terms.map((term, index) => (
            <span key={term.word}>
              {index === terms.length - 1 ? " and " : index > 0 ? ", " : null}
              <button
                type="button"
                className={`dc-term${active === index ? " is-active" : ""}${
                  hint && index === 0 ? " is-hinting" : ""
                }`}
                aria-expanded={active === index}
                aria-controls={`${rootId}-card`}
                onMouseEnter={() => open(index)}
                onMouseLeave={scheduleClose}
                onFocus={() => open(index)}
                onBlur={scheduleClose}
                onClick={() => {
                  if (active === index) {
                    setActive(null);
                    return;
                  }
                  open(index);
                }}
              >
                {term.word}
              </button>
            </span>
          ))}
          .
        </p>

        <div
          id={`${rootId}-card`}
          className={`dc-card mt-8${activeTerm ? " is-on" : ""}`}
          onMouseEnter={() => {
            if (active !== null) open(active);
          }}
          onMouseLeave={scheduleClose}
          aria-hidden={!activeTerm}
        >
          <div className="dc-card-inner border border-line bg-raise p-5 md:p-6">
            {activeTerm ? (
              <>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-bronze">
                  {activeTerm.title}
                </p>
                <p className="mt-3 font-serif text-2xl tracking-[-0.02em] text-ink">
                  {activeTerm.word}
                </p>
                <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
                  {activeTerm.note}
                </p>
                <a
                  href={activeTerm.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm text-bronze hover:text-ink"
                  {...(activeTerm.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  Open
                  <span aria-hidden="true">→</span>
                  {activeTerm.external ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </a>
              </>
            ) : (
              <p className="text-sm text-faint">Select a term to preview.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
