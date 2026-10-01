"use client";

import { motion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

const statement =
  "Adewale Obadimu is a reliability engineer and technical leader. Today he builds AI products at Baodium and writes about running systems in production.";
const highlight = new Set(["reliability", "AI", "production."]);

const areas = [
  { title: "Reliability Engineering", copy: "Distributed systems, production reliability, observability, incident response, and SRE." },
  { title: "AI Products", copy: "Practical AI applications and agent-driven workflows." },
  { title: "Infrastructure", copy: "Cloud, Kubernetes, telemetry, automation, and developer infrastructure." },
  { title: "Technical Writing", copy: "Long-form system design, from real production failures." },
];

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="relative z-10 bg-cream pb-32 text-ink md:pb-44">
      <div className="shell">
        <div aria-hidden="true" className="h-px bg-ink/10" />
        <div className="pt-24 md:pt-36">
          <Reveal y={12}>
            <h2 id="about-heading" className="kicker text-cinnabar">
              About
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[60rem] text-[clamp(2rem,4.2vw,3.75rem)] font-semibold leading-[1.1] tracking-[-0.04em]">
              {statement.split(" ").map((word, index) => (
                <span key={`${word}-${index}`}>
                  <span className={highlight.has(word) ? "font-serif font-normal italic text-cinnabar" : ""}>{word}</span>{" "}
                </span>
              ))}
            </p>
          </Reveal>

          <ul className="mt-20 grid gap-x-10 border-t border-ink/10 md:mt-28 md:grid-cols-2">
            {areas.map((area, index) => (
              <motion.li
                key={area.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.8, delay: (index % 2) * 0.08, ease }}
                className="group border-b border-ink/10 py-8 md:py-10"
              >
                <h3 className="flex items-center gap-3 text-[clamp(1.5rem,2.4vw,2.1rem)] font-semibold leading-tight tracking-[-0.035em]">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-ink/15 transition-colors duration-500 group-hover:bg-cinnabar" />
                  {area.title}
                </h3>
                <p className="mt-3 max-w-md pl-5 leading-relaxed text-muted">{area.copy}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
