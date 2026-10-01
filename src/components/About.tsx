"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

const statement =
  "Adewale Obadimu is a reliability engineer and technical leader. Today he builds AI products at Baodium and writes about running systems in production.";
const accent = new Set(["reliability", "AI", "production."]);
/** Which focus area each word belongs to, so pointing at an area lights its words in the sentence. */
const linked: Record<string, number> = { reliability: 0, AI: 1, running: 2, systems: 2, writes: 3 };

const areas = [
  { title: "Reliability Engineering", copy: "Distributed systems, production reliability, observability, incident response, and SRE." },
  { title: "AI Products", copy: "Practical AI applications and agent-driven workflows." },
  { title: "Infrastructure", copy: "Cloud, Kubernetes, telemetry, automation, and developer infrastructure." },
  { title: "Technical Writing", copy: "Long-form system design, from real production failures." },
];

export function About() {
  const [focus, setFocus] = useState<number | null>(null);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative z-10 -mt-10 rounded-t-[2rem] bg-cream pb-32 text-ink md:-mt-14 md:rounded-t-[3.5rem] md:pb-44"
    >
      <div className="shell">
        <div className="pt-28 md:pt-40">
          <Reveal y={12}>
            <h2 id="about-heading" className="kicker text-cinnabar">
              About
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[60rem] text-[clamp(2rem,4.2vw,3.75rem)] font-semibold leading-[1.12] tracking-[-0.04em]">
              {statement.split(" ").map((word, index) => {
                const lit = focus !== null && linked[word] === focus;
                return (
                  <span key={`${word}-${index}`}>
                    <span className="relative inline-block">
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-[-0.06em] bottom-[0.06em] h-[0.34em] origin-left rounded-sm bg-cinnabar/20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lit ? "scale-x-100" : "scale-x-0"}`}
                      />
                      <span
                        className={`relative transition-colors duration-500 ${accent.has(word) ? "font-serif font-normal italic text-cinnabar" : lit ? "text-cinnabar" : ""}`}
                      >
                        {word}
                      </span>
                    </span>{" "}
                  </span>
                );
              })}
            </p>
          </Reveal>

          <ul className="mt-20 grid gap-x-10 border-t border-ink/10 md:mt-28 md:grid-cols-2" onPointerLeave={() => setFocus(null)}>
            {areas.map((area, index) => {
              const on = focus === index;
              return (
                <motion.li
                  key={area.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                  transition={{ duration: 0.8, delay: (index % 2) * 0.08, ease }}
                  className="border-b border-ink/10"
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    onPointerEnter={(event) => event.pointerType === "mouse" && setFocus(index)}
                    onFocus={() => setFocus(index)}
                    onBlur={() => setFocus(null)}
                    onClick={() => setFocus(on ? null : index)}
                    className="group block w-full py-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-cinnabar/50 md:py-10"
                  >
                    <span className="flex items-center gap-3 text-[clamp(1.5rem,2.4vw,2.1rem)] font-semibold leading-tight tracking-[-0.035em]">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full transition-all duration-500 ${on ? "scale-150 bg-cinnabar" : "bg-ink/20"}`}
                      />
                      <span className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "translate-x-1.5" : ""}`}>{area.title}</span>
                    </span>
                    <span className={`mt-3 block max-w-md pl-5 leading-relaxed transition-colors duration-500 ${on ? "text-ink/80" : "text-muted"}`}>
                      {area.copy}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
