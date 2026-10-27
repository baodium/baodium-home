"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { alsoLinks } from "@/data/site";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const listen = alsoLinks.filter((link) => link.group === "listen");
const elsewhere = alsoLinks.filter((link) => link.group === "elsewhere");
const ease = [0.22, 1, 0.36, 1] as const;

/** About-only culture — kinetic listen rows, quiet elsewhere. Not a homepage dump. */
export function AboutListen() {
  const reduce = usePrefersReducedMotion();

  return (
    <Reveal y={14} className="mt-14 md:mt-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)] lg:gap-14">
        <div>
          <p className="kicker text-cinnabar">Listen · Baodium</p>
          <p className="mt-3 max-w-md text-[1.02rem] leading-relaxed text-muted">
            Music under the same name — another way the work moves.
          </p>
          <ul className="mt-6 space-y-2">
            {listen.map((link, index) => (
              <li key={link.label}>
                <motion.a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                  transition={{
                    duration: reduce ? 0 : 0.55,
                    delay: reduce ? 0 : index * 0.07,
                    ease,
                  }}
                  whileHover={reduce ? undefined : { x: 6 }}
                  className="group flex min-h-[4.25rem] items-center gap-4 rounded-2xl border border-ink/8 bg-gradient-to-r from-white/70 via-paper/40 to-transparent px-4 py-3 transition-colors hover:border-cinnabar/25 hover:from-white"
                >
                  <span
                    aria-hidden="true"
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ember text-cream"
                  >
                    <span className="absolute inset-0 bg-gradient-to-br from-amber/50 via-cinnabar to-crimson opacity-90 transition-opacity group-hover:opacity-100" />
                    <span className="relative flex items-end gap-[3px]">
                      {[0.55, 1, 0.7, 0.9].map((h, i) => (
                        <motion.span
                          key={i}
                          className="w-[3px] rounded-full bg-cream"
                          style={{ height: `${h * 14}px` }}
                          animate={
                            reduce
                              ? undefined
                              : {
                                  scaleY: [0.55, 1, 0.65, 0.9, 0.55],
                                }
                          }
                          transition={{
                            duration: 1.1 + i * 0.12,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.08,
                          }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[1.2rem] italic tracking-[-0.02em] text-ink transition-colors group-hover:text-cinnabar">
                      {link.label}
                    </span>
                    {"note" in link && link.note ? (
                      <span className="mt-0.5 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                        {link.note}
                      </span>
                    ) : null}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-cinnabar/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </motion.a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="kicker text-muted">Elsewhere</p>
          <ul className="mt-5 space-y-1">
            {elsewhere.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-2 text-[0.98rem] text-muted transition-colors hover:text-cinnabar"
                >
                  <span>{link.label}</span>
                  {"note" in link && link.note ? (
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted/70">
                      {link.note}
                    </span>
                  ) : null}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
