"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
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
  if (writing.length === 0) return null;

  return (
    <section
      id="writing"
      aria-labelledby="writing-heading"
      className="relative bg-cream pt-28 text-ink md:pt-36"
    >
      <div className="shell relative z-[2]">
        <div>
          <div>
            <Reveal y={12}>
              <h2 id="writing-heading" className="kicker text-cinnabar">Writing</h2>
            </Reveal>
          </div>
        </div>

        <ol className="mt-14 border-t border-ink/10 md:mt-20">
          {writing.map((piece, index) => (
            <motion.li
              key={piece.href}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.8, delay: index * 0.08, ease }}
              className="border-b border-ink/10"
            >
              <a
                href={piece.href}
                className="group relative grid gap-x-6 gap-y-3 py-8 md:grid-cols-12 md:items-center md:py-10"
              >
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted md:col-span-2">
                  {formatDate(piece.date)}
                </span>
                <span className="md:col-span-8">
                  <span className="block text-[clamp(1.75rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-2">
                    {piece.title}
                  </span>
                  <span className="mt-3 block max-w-md text-muted">
                    {piece.description}
                  </span>
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-ink group-hover:text-cream md:col-span-2 md:justify-self-end">
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={1.75}
                  />
                </span>
              </a>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
