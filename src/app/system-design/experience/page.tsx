import Link from "next/link";
import type { Metadata } from "next";
import { experienceChapters } from "@/lib/experience/scenarios";

export const metadata: Metadata = {
  title: "Operate the incidents",
  description:
    "Each chapter of Practical System Design becomes a production scenario you operate — guided walkthrough plus sandbox.",
  alternates: { canonical: "/system-design/experience" },
};

export default function ExperienceHubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-amber">
          Practical System Design
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.1rem)] leading-[1.05] tracking-[-0.03em] text-cream">
          Operate the incident
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-cream/65">
          Read the book for the reasoning. Run the experience to feel the pool fill, the flag
          flip, and the tradeoff under your hands.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/system-design/experience/chapter-1"
            className="inline-flex min-h-12 items-center rounded-full bg-cinnabar px-6 text-sm font-medium text-cream transition-opacity hover:opacity-90"
          >
            Start Chapter 1 experience
          </Link>
          <Link
            href="/system-design"
            className="inline-flex min-h-12 items-center rounded-full border border-cream/20 px-6 text-sm text-cream/80 transition-colors hover:border-cream/40"
          >
            Book overview
          </Link>
        </div>
      </header>

      <ol className="mt-14 grid gap-4 sm:grid-cols-2">
        {experienceChapters.map((ch) => {
          const ready = ch.status === "ready";
          const href = ready
            ? `/system-design/experience/${ch.slug}`
            : ch.bookHref;
          return (
            <li key={ch.id}>
              <Link
                href={href}
                className={`block rounded-2xl border border-cream/12 bg-ink/35 p-5 transition-colors ${
                  ready ? "hover:border-amber/40" : "opacity-70 hover:border-cream/25"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-cream/45">
                    Chapter {ch.number}
                  </p>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-amber">
                    {ready ? `~${ch.durationMin} min` : "Soon · read prose"}
                  </p>
                </div>
                <h2 className="mt-2 font-serif text-xl text-cream">{ch.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream/55">{ch.subtitle}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
