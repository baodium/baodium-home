"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";

const statement =
  "Adewale Obadimu is a reliability engineer, technical leader, builder, and author. He is currently building at the intersection of AI, software engineering, reliability, and how people work.";
const highlight = new Set(["reliability", "builder,", "author.", "AI,"]);

const areas: Array<{ title: string; copy: string; glyph: ReactNode }> = [
  {
    title: "Reliability Engineering",
    copy: "Distributed systems, production reliability, observability, incident response, and SRE.",
    glyph: (
      <path
        d="M2 26 H16 L21 12 L28 40 L34 6 L40 30 L44 22 H62"
        pathLength={1}
        className="[stroke-dasharray:1] [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-[1.2s] ease-out group-hover:[stroke-dashoffset:-2]"
      />
    ),
  },
  {
    title: "AI Products",
    copy: "Practical AI applications and agent-driven workflows.",
    glyph: (
      <g>
        <path d="M12 34 L32 12 L52 34 L32 44 Z M32 12 V44" />
        {[
          [12, 34],
          [32, 12],
          [52, 34],
          [32, 44],
        ].map(([cx, cy], index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={4}
            className="fill-current origin-center transition-transform duration-500 [transform-box:fill-box] group-hover:scale-150"
            style={{ transitionDelay: `${index * 70}ms` }}
          />
        ))}
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
            className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ "--l": layer } as React.CSSProperties}
            data-layer=""
          />
        ))}
      </g>
    ),
  },
  {
    title: "Writing",
    copy: "Practical system design and production engineering.",
    glyph: (
      <g>
        <path
          d="M4 38 C14 20 20 44 30 28 S46 14 52 30 S58 40 62 34"
          pathLength={1}
          className="[stroke-dasharray:1] [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-[1.2s] ease-out group-hover:[stroke-dashoffset:-2]"
        />
        <path d="M48 6 L58 16 L40 34 L30 36 L32 26 Z" className="transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
      </g>
    ),
  },
];

function Word({ children, progress, range, accent }: { children: string; progress: MotionValue<number>; range: [number, number]; accent: boolean }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <span className="relative inline-block">
      <motion.span style={{ opacity }} className={accent ? "font-serif font-normal italic text-cinnabar" : ""}>
        {children}
      </motion.span>
      &nbsp;
    </span>
  );
}

function ScrollStatement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = statement.split(" ");
  return (
    <p
      ref={ref}
      className="text-[clamp(1.85rem,4.4vw,4rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-ink"
    >
      {words.map((word, index) => {
        const start = index / words.length;
        return (
          <Word
            key={`${word}-${index}`}
            progress={scrollYProgress}
            range={reduce ? [-1, 0] : [start, start + 1 / words.length]}
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
        <div className="aurora absolute -right-[10%] -top-[20%] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(closest-side,rgba(255,164,92,0.32),transparent)] blur-2xl" />
        <div className="aurora-slow absolute -left-[20%] bottom-[-20%] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.14),transparent)] blur-2xl" />
      </div>

      <div className="shell relative z-[2]">
        <Reveal y={12}>
          <h2 id="about-heading" className="kicker flex items-center gap-3 text-muted">
            <span className="text-cinnabar">(04)</span>
            <span className="h-px w-10 bg-ink/25" />
            About
          </h2>
        </Reveal>
        <div className="mt-8 max-w-[62rem]">
          <ScrollStatement />
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 md:mt-28 lg:grid-cols-4">
          {areas.map((area, index) => (
            <motion.li
              key={area.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="focus-card group relative flex h-full min-h-[13rem] md:min-h-[19rem] flex-col overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white/55 p-6 backdrop-blur-sm transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:shadow-[0_30px_60px_-25px_rgba(60,25,10,0.45)] md:p-7"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-t from-[#0e0c0b] via-[#1a1512] to-[#2a1410] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.55),transparent)] opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100"
                />
                <span className="relative flex items-start justify-between">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 64 48"
                    className="h-12 w-16 fill-none stroke-current text-cinnabar [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]"
                  >
                    {area.glyph}
                  </svg>
                  <span className="font-mono text-xs text-ink/40 transition-colors duration-500 group-hover:text-cream/40">
                    0{index + 1}
                  </span>
                </span>
                <h3 className="relative pt-10 text-[1.6rem] md:pt-16 font-semibold leading-[1.05] tracking-[-0.035em] transition-colors duration-500 group-hover:text-cream">
                  {area.title}
                </h3>
                <p className="relative mt-3 text-[0.95rem] leading-relaxed text-muted transition-colors duration-500 group-hover:text-cream/65">
                  {area.copy}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
