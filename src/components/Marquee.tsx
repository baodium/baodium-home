"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";

const items = ["Reliability Engineering", "AI Products", "Infrastructure", "Writing"];

function Row({ reverse = false, tone }: { reverse?: boolean; tone: "flame" | "ink" }) {
  const sequence = [...items, ...items];
  return (
    <div className="flex w-max">
      {[0, 1].map((copy) => (
        <div
          key={copy}
          className="marquee-track flex shrink-0 items-center"
          style={{ animationDirection: reverse ? "reverse" : "normal" }}
        >
          {sequence.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center">
              <span
                className={`whitespace-nowrap px-6 text-[clamp(1.6rem,3.6vw,3.25rem)] font-semibold tracking-[-0.04em] md:px-10 ${
                  tone === "flame" ? "text-night" : index % 2 === 0 ? "text-outline" : "font-serif font-normal italic text-cream/80"
                }`}
              >
                {item}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`h-5 w-5 shrink-0 md:h-7 md:w-7 ${tone === "flame" ? "text-night" : "text-cinnabar"}`}
              >
                <path
                  fill="currentColor"
                  d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z"
                />
              </svg>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Marquee() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 120, damping: 40 });
  const skew = useTransform(smooth, [-2500, 0, 2500], reduce ? [0, 0, 0] : [8, 0, -8], { clamp: true });

  return (
    <div aria-label="Focus areas" role="region" className="pointer-events-none relative z-20 -my-10 overflow-hidden py-14 md:-my-14 md:py-20">
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.2deg] border-y border-white/10 bg-ink py-3 md:py-5">
        <Row reverse tone="ink" />
      </div>
      <motion.div
        aria-hidden="true"
        style={{ skewX: skew }}
        className="relative mx-[-5%] -rotate-[2.2deg] bg-gradient-to-r from-[#ffb07a] via-cinnabar to-crimson py-3 shadow-[0_20px_60px_-15px_rgba(236,61,32,0.7)] md:py-5"
      >
        <Row tone="flame" />
      </motion.div>
    </div>
  );
}
