"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import { book } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;

const statement =
  "Adewale Obadimu is a reliability engineer, technical leader, builder, and author. He is currently building at the intersection of AI, software engineering, reliability, and how people work.";
const highlight = new Set(["reliability", "builder,", "author.", "AI,"]);

const facts = [
  { label: "Building", value: "Interview Coach and UpTo" },
  { label: "Author of", value: book.title },
  { label: "Works on", value: "Reliability, AI, infrastructure" },
];

const areas: Array<{ title: string; copy: string; glyph: ReactNode }> = [
  {
    title: "Reliability Engineering",
    copy: "Distributed systems, production reliability, observability, incident response, and SRE.",
    glyph: <path d="M2 26 H16 L21 12 L28 40 L34 6 L40 30 L44 22 H62" pathLength={1} className="glyph-draw" />,
  },
  {
    title: "AI Products",
    copy: "Practical AI applications and agent-driven workflows.",
    glyph: (
      <g>
        <path d="M12 34 L32 12 L52 34 L32 44 Z M32 12 V44" pathLength={1} className="glyph-draw" />
        <circle cx={32} cy={12} r={3.5} className="fill-current" />
        <circle cx={12} cy={34} r={3.5} className="fill-current" />
        <circle cx={52} cy={34} r={3.5} className="fill-current" />
      </g>
    ),
  },
  {
    title: "Infrastructure",
    copy: "Cloud, Kubernetes, telemetry, automation, and developer infrastructure.",
    glyph: (
      <g>
        {[0, 1, 2].map((layer) => (
          <path
            key={layer}
            d="M32 8 L58 20 L32 32 L6 20 Z"
            data-layer=""
            style={{ "--l": layer } as React.CSSProperties}
          />
        ))}
      </g>
    ),
  },
  {
    title: "Writing",
    copy: "Practical system design and production engineering.",
    glyph: (
      <path
        d="M4 38 C14 20 20 44 30 28 S46 14 52 30 S58 40 62 34"
        pathLength={1}
        className="glyph-draw"
      />
    ),
  },
];

/** Words are readable from the first frame; scrolling deepens them from muted to ink. */
function Word({
  children,
  progress,
  range,
  accent,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
}) {
  const color = useTransform(progress, range, accent ? ["#a8543f", "#d8331a"] : ["#6b6157", "#0e0c0b"]);
  return (
    <>
      <motion.span style={{ color }} className={accent ? "font-serif font-normal italic" : ""}>
        {children}
      </motion.span>{" "}
    </>
  );
}

function ScrollStatement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.55"] });
  const words = statement.split(" ");
  return (
    <p
      ref={ref}
      className="text-[clamp(1.9rem,4.2vw,3.75rem)] font-semibold leading-[1.1] tracking-[-0.04em] text-ink"
    >
      {words.map((word, index) => {
        const start = index / words.length;
        return (
          <Word
            key={`${word}-${index}`}
            progress={scrollYProgress}
            range={reduce ? [-1, 0] : [start, start + 2 / words.length]}
            accent={highlight.has(word)}
          >
            {word}
          </Word>
        );
      })}
    </p>
  );
}

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="grain-light relative z-10 -mt-10 overflow-hidden rounded-t-[2rem] bg-cream pb-28 pt-24 text-ink md:-mt-14 md:rounded-t-[3.5rem] md:pb-36 md:pt-36"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="aurora absolute -right-[10%] -top-[20%] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(closest-side,rgba(255,164,92,0.3),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <h2 id="about-heading" className="kicker flex items-center gap-3 text-muted">
            <span className="text-cinnabar">(04)</span>
            <span className="h-px w-10 bg-ink/25" />
            About
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <ScrollStatement />
          </div>
          <Reveal delay={0.15} className="lg:col-span-4 lg:pt-3">
            <dl className="rounded-[1.5rem] border border-ink/10 bg-white/50 p-6 backdrop-blur-sm md:p-7">
              {facts.map((fact, index) => (
                <div key={fact.label} className={`flex flex-col gap-1 ${index > 0 ? "mt-5 border-t border-ink/10 pt-5" : ""}`}>
                  <dt className="kicker text-muted">{fact.label}</dt>
                  <dd className="text-lg font-medium tracking-[-0.02em]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="mt-24 md:mt-32">
          <Reveal y={12}>
            <h3 className="kicker flex items-center justify-between border-b border-ink/15 pb-4 text-muted">
              <span>Focus</span>
              <span>04 areas</span>
            </h3>
          </Reveal>
          <ul>
            {areas.map((area, index) => (
              <motion.li
                key={area.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.8, delay: index * 0.07, ease }}
                className="focus-row group relative overflow-hidden border-b border-ink/15"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-ink via-[#1d1411] to-[#3a140d] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                />
                <div className="relative grid items-center gap-x-6 gap-y-2 py-6 md:grid-cols-12 md:py-8">
                  <span className="font-mono text-xs text-muted transition-colors duration-500 group-hover:text-cinnabar md:col-span-1">
                    0{index + 1}
                  </span>
                  <span className="text-[clamp(1.75rem,4vw,3.5rem)] font-semibold leading-none tracking-[-0.045em] transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3 group-hover:text-cream md:col-span-6">
                    {area.title}
                  </span>
                  <span className="max-w-sm text-[0.98rem] leading-relaxed text-muted transition-colors duration-500 group-hover:text-cream/70 md:col-span-4">
                    {area.copy}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 64 48"
                    className="hidden h-10 w-14 justify-self-end fill-none stroke-current text-ink/30 transition-colors duration-500 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2] group-hover:text-cinnabar md:col-span-1 md:block"
                  >
                    {area.glyph}
                  </svg>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
