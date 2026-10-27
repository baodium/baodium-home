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
        <p className="exp-kicker">Practical System Design</p>
        <h1 className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[color:var(--exp-fg)]">
          Operate the incident
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[color:var(--exp-muted)]">
          Read the book for the reasoning. Run the experience to feel the pool fill, the flag
          flip, and the tradeoff under your hands.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/system-design/experience/chapter-1"
            className="exp-btn exp-btn-primary !min-h-12 !px-6"
          >
            Start Chapter 1 experience
          </Link>
          <Link
            href="/system-design"
            className="exp-btn exp-btn-ghost !min-h-12 !px-6"
          >
            Book overview
          </Link>
        </div>
      </header>

      <ol className="mt-14 grid gap-4 sm:grid-cols-2">
        {experienceChapters.map((ch) => {
          const ready = ch.status === "ready";
          const href = ready ? `/system-design/experience/${ch.slug}` : ch.bookHref;
          return (
            <li key={ch.id}>
              <Link
                href={href}
                className={`group block rounded-[1.05rem] border border-[color:var(--exp-line)] bg-[color:var(--exp-panel)] p-5 shadow-[0_18px_40px_-28px_rgba(43,34,29,0.28)] transition-[border-color,transform] duration-300 ${
                  ready
                    ? "hover:border-[color-mix(in_srgb,var(--exp-accent)_40%,transparent)] hover:-translate-y-0.5"
                    : "opacity-75 hover:border-[color:var(--exp-line-strong)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--exp-faint)]">
                    Chapter {ch.number}
                  </p>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-amber)]">
                    {ready ? `~${ch.durationMin} min` : "Soon · read prose"}
                  </p>
                </div>
                <h2 className="mt-2 font-serif text-xl text-[color:var(--exp-fg)] transition-colors group-hover:text-[color:var(--exp-accent)]">
                  {ch.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">
                  {ch.subtitle}
                </p>
                {ready ? (
                  <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--exp-accent)]">
                    Guided · sandbox · 40-slot pool →
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
