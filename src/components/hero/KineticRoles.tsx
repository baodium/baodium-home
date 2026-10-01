"use client";

import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";

export const roles = [
  { word: "Engineer", note: "Reliability and infrastructure" },
  { word: "Builder", note: "Interview Coach and UpTo" },
  { word: "Author", note: "Practical System Design" },
];

const stops = [
  [255, 186, 130],
  [255, 96, 56],
  [218, 34, 44],
];

function flameAt(t: number) {
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;
  const [a, b] = [stops[i], stops[i + 1]];
  const mix = a.map((value, k) => Math.round(value + (b[k] - value) * f));
  return `rgb(${mix.join(",")})`;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function KineticRoles({
  active,
  wordRefs,
}: {
  active: number;
  wordRefs: RefObject<Array<HTMLSpanElement | null>>;
}) {
  return (
    <>
      <span className="mt-5 flex flex-col gap-[0.04em] md:mt-7">
        {roles.map((role, line) => {
          const isActive = active === line;
          const dim = active !== -1 && !isActive;
          const letters = `${role.word}.`.split("");
          return (
            <span key={role.word} className="flex items-baseline gap-3 md:gap-5">
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + line * 0.12, duration: 0.6 }}
                className={`w-6 shrink-0 font-mono text-[0.68rem] tracking-[0.1em] transition-colors duration-500 md:w-8 md:text-xs ${isActive ? "text-cinnabar" : "text-cream/35"}`}
              >
                0{line + 1}
              </motion.span>
              <span className="block overflow-hidden pb-[0.08em] text-[clamp(3.1rem,6.4vw,6.6rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
                <span className="sr-only">{role.word}.</span>
                <span
                  aria-hidden="true"
                  ref={(node) => {
                    wordRefs.current[line] = node;
                  }}
                  className="inline-flex"
                >
                  {letters.map((letter, k) => (
                    <motion.span
                      key={k}
                      className="inline-block"
                      initial={{ y: "105%", rotate: 6 }}
                      animate={{ y: "0%", rotate: 0 }}
                      transition={{ duration: 0.9, delay: 0.55 + line * 0.14 + k * 0.035, ease }}
                      style={{
                        color: isActive
                          ? flameAt(k / Math.max(letters.length - 1, 1))
                          : dim
                            ? "rgba(245,239,229,0.3)"
                            : "#f5efe5",
                        transition: `color 0.5s ease ${isActive ? (letters.length - 1 - k) * 0.03 : 0}s`,
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              </span>
            </span>
          );
        })}
      </span>
      <span aria-hidden="true" className="mt-5 flex h-6 items-center gap-3 pl-9 text-sm text-cream/60 md:pl-[3.25rem]">
        <AnimatePresence mode="wait">
          {active >= 0 ? (
            <motion.span
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease }}
              className="inline-flex items-center gap-2.5"
            >
              <span className="h-px w-6 bg-gradient-to-r from-amber to-cinnabar" />
              {roles[active].note}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
    </>
  );
}
