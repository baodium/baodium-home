"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { writing } from "@/data/writing";

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

export function Writing() {
  const hasEssays = writing.length > 0;

  return (
    <section id="writing" aria-labelledby="writing-heading" className="grain relative z-10 overflow-hidden bg-night pb-32 pt-8 md:pb-48 md:pt-12">
      <div className="shell relative z-[2]">
        <div aria-hidden="true" className="mb-24 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:mb-36" />
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <Reveal y={12}>
              <p className="kicker flex items-center gap-3 text-cream/55">
                <span className="text-cinnabar">(03)</span>
                <span className="h-px w-10 bg-white/20" />
                Writing
              </p>
            </Reveal>
            <SplitHeading
              id="writing-heading"
              text={hasEssays ? "Notes from production." : "Essays are next."}
              accent={hasEssays ? ["production"] : ["next"]}
              className="mt-6 text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]"
            />
          </div>
          {!hasEssays ? (
            <Reveal delay={0.2} className="md:col-span-5 md:pb-2">
              <p className="max-w-sm text-lg leading-relaxed text-cream/60 md:ml-auto">
                Shorter pieces on practical system design and production engineering will publish here.
              </p>
            </Reveal>
          ) : null}
        </div>

        {hasEssays ? (
          <ol className="mt-14 border-t border-white/10 md:mt-20">
            {writing.map((piece, index) => (
              <motion.li
                key={piece.href}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.8, delay: index * 0.08, ease }}
                className="border-b border-white/10"
              >
                <a href={piece.href} className="group relative grid gap-x-6 gap-y-3 py-8 md:grid-cols-12 md:items-center md:py-10">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-cream/45 md:col-span-2">{formatDate(piece.date)}</span>
                  <span className="md:col-span-8">
                    <span className="block text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-2">
                      {piece.title}
                    </span>
                    <span className="mt-3 block max-w-md text-cream/60">{piece.description}</span>
                  </span>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink md:col-span-2 md:justify-self-end">
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </a>
              </motion.li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
