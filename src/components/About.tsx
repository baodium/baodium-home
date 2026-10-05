"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { Reveal } from "@/components/motion/Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

const statement =
  "Adewale Obadimu is a reliability engineer and technical leader. Today he builds AI products at Baodium and writes about running systems in production.";
const words = statement.split(" ");
const accent = new Set(["reliability", "AI", "production."]);
/** Which focus area each word belongs to, so pointing at an area lights its words in the sentence. */
const linked: Record<string, number> = { reliability: 0, AI: 1, running: 2, systems: 2, writes: 3 };

const areas = [
  { title: "Reliability Engineering" },
  { title: "AI Products" },
  { title: "Infrastructure" },
  { title: "Technical Writing" },
];

export function About() {
  const [focus, setFocus] = useState<number | null>(null);
  const statementRef = useRef<HTMLParagraphElement>(null);
  /** Words come up to full ink as the sentence rises into reading position. */
  const { scrollYProgress } = useScroll({ target: statementRef, offset: ["start 0.9", "start 0.52"] });

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative bg-cream pb-14 text-ink md:pb-20"
    >
      <div className="shell">
        <div className="pt-12 md:pt-16">
          <Reveal y={12}>
            <h2 id="about-heading" className="kicker text-cinnabar">
              About
            </h2>
          </Reveal>
            <p ref={statementRef} className="mt-6 max-w-[60rem] text-[clamp(2rem,4.2vw,3.75rem)] font-semibold leading-[1.12] tracking-[-0.04em]">
              {words.map((word, index) => {
                const lit = focus !== null && linked[word] === focus;
                return (
                  <span key={`${word}-${index}`}>
                    <span className="relative inline-block">
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-[-0.06em] bottom-[0.06em] h-[0.34em] origin-left rounded-sm bg-cinnabar/20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lit ? "scale-x-100" : "scale-x-0"}`}
                      />
                      <ScrollWord
                        word={word}
                        index={index}
                        total={words.length}
                        progress={scrollYProgress}
                        className={`relative transition-colors duration-500 ${accent.has(word) ? "font-serif font-normal italic text-cinnabar" : lit ? "text-cinnabar" : ""}`}
                      />
                    </span>{" "}
                  </span>
                );
              })}
            </p>

          <ul className="mt-10 grid grid-cols-2 gap-3 md:mt-12 md:gap-4 lg:grid-cols-4" onPointerLeave={() => setFocus(null)}>
            {areas.map((area, index) => {
              const on = focus === index;
              return (
                <motion.li
                  key={area.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px 12% 0px" }}
                  transition={{ duration: 0.7, delay: (index % 2) * 0.06, ease }}
                >
                  <button
                    type="button"
                    aria-pressed={on}
                    onPointerEnter={(event) => event.pointerType === "mouse" && setFocus(index)}
                    onFocus={() => setFocus(index)}
                    onBlur={() => setFocus(null)}
                    onClick={() => setFocus(on ? null : index)}
                    className={`group block w-full rounded-2xl border px-4 py-5 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-cinnabar/50 md:px-5 md:py-6 ${on ? "border-cinnabar/30 bg-[#f6e4d4]" : "border-ink/10 bg-[#fbf7f1] hover:border-cinnabar/20 hover:bg-[#f8efe6]"}`}
                  >
                    <span className="flex items-start gap-2.5 text-[clamp(1.05rem,1.5vw,1.35rem)] font-semibold leading-tight tracking-[-0.03em]">
                      <span
                        aria-hidden="true"
                        className={`mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300 ${on ? "scale-150 bg-cinnabar" : "bg-cinnabar/35"}`}
                      />
                      <span className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "translate-x-1 text-cinnabar" : ""}`}>{area.title}</span>
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

function ScrollWord({
  word,
  index,
  total,
  progress,
  className,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  className: string;
}) {
  const reduce = usePrefersReducedMotion();
  const at = index / total;
  const opacity = useTransform(progress, [at * 0.5, at * 0.5 + 0.28], reduce ? [1, 1] : [0.5, 1]);
  return (
    <motion.span style={{ opacity }} className={className}>
      {word}
    </motion.span>
  );
}
