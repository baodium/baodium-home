"use client";

import { motion } from "motion/react";
import { ArrowUpRight, PenLine } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { book, writing, type WritingPiece } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Piece({ piece, index }: { piece: WritingPiece; index: number }) {
  const external = piece.href.startsWith("http");
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.06, ease }}
    >
      <a
        href={piece.href}
        className="group relative grid gap-2 overflow-hidden rounded-2xl px-4 py-6 transition-colors hover:bg-white/[0.04] md:grid-cols-12 md:items-baseline md:gap-8 md:px-6"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <time className="font-mono text-xs uppercase tracking-[0.12em] text-cream/45 md:col-span-2" dateTime={piece.date}>
          {formatDate(piece.date)}
        </time>
        <span className="text-2xl font-semibold tracking-[-0.03em] transition-transform duration-500 group-hover:translate-x-1 md:col-span-5">
          {piece.title}
        </span>
        <span className="leading-relaxed text-cream/60 md:col-span-4">{piece.description}</span>
        <ArrowUpRight aria-hidden="true" className="hidden h-5 w-5 text-cream/40 transition-all duration-500 group-hover:rotate-45 group-hover:text-cinnabar md:col-span-1 md:block md:justify-self-end" />
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    </motion.li>
  );
}

function ComingSoon() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:mx-0 lg:ml-auto">
      {[2, 1].map((layer) => (
        <motion.div
          key={layer}
          aria-hidden="true"
          initial={{ opacity: 0, rotate: 0, y: 0 }}
          whileInView={{ opacity: 1, rotate: layer === 2 ? 6 : -4, y: layer * -14 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.2 + layer * 0.1, ease }}
          className="absolute inset-0 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#1d1916] to-[#120f0d]"
        />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease }}
        className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-[#221d19] to-[#141110] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] md:p-9"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.32),transparent)] blur-xl" />
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-amber">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />
            Coming soon
          </span>
          <PenLine aria-hidden="true" className="h-5 w-5 text-cream/40" strokeWidth={1.5} />
        </div>
        <p className="relative mt-8 text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.03em] text-cream md:text-3xl">
          Essays on practical system design and production engineering
          <span aria-hidden="true" className="caret ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] bg-cinnabar" />
        </p>
        <div aria-hidden="true" className="relative mt-8 space-y-3">
          <div className="shimmer h-2.5 w-[92%] rounded-full" />
          <div className="shimmer h-2.5 w-[78%] rounded-full" />
          <div className="shimmer h-2.5 w-[85%] rounded-full" />
          <div className="shimmer h-2.5 w-[40%] rounded-full" />
        </div>
        <div className="relative mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm">
          <span className="text-cream/55">Until then, the long version is in print.</span>
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-11 items-center gap-1.5 text-cream"
          >
            <span className="bg-gradient-to-r from-amber to-cinnabar bg-[length:100%_1px] bg-bottom bg-no-repeat pb-0.5">
              Read the book
            </span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="sr-only"> (opens Amazon in a new tab)</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export function Writing() {
  const empty = writing.length === 0;
  return (
    <section
      id="writing"
      aria-labelledby="writing-heading"
      className="grain relative z-10 overflow-hidden bg-night pb-28 pt-8 md:pb-40 md:pt-12"
    >
      <div className="shell relative z-[2]">
        <div aria-hidden="true" className="mb-20 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:mb-28" />
        <div className={`grid gap-14 ${empty ? "lg:grid-cols-12 lg:items-center" : ""}`}>
          <div className={empty ? "lg:col-span-5" : ""}>
            <Reveal y={12}>
              <p className="kicker flex items-center gap-3 text-cream/55">
                <span className="text-cinnabar">(03)</span>
                <span className="h-px w-10 bg-white/20" />
                Writing
              </p>
            </Reveal>
            <SplitHeading
              id="writing-heading"
              text={empty ? "Essays, in the drafts." : "Essays and notes."}
              accent={empty ? ["drafts"] : ["notes"]}
              className="mt-6 text-[clamp(2.6rem,5.6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.05em]"
            />
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-cream/60">
                Notes from building and running real systems: what broke, why it broke, and what changed after.
              </p>
            </Reveal>
          </div>
          {empty ? (
            <div className="pt-6 lg:col-span-7 lg:pt-0">
              <ComingSoon />
            </div>
          ) : (
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {writing.map((piece, index) => (
                <Piece key={piece.href} piece={piece} index={index} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
