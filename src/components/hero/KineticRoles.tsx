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
  onSelect,
}: {
  active: number;
  wordRefs: RefObject<Array<HTMLSpanElement | null>>;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <span className="relative mt-5 flex flex-col gap-[0.04em] max-lg:pl-5 md:mt-7">
        {/* Phones and tablets: the signal runs down a rail beside the numbers and rests on the chosen role. */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[10%] left-0.5 top-[10%] w-px bg-gradient-to-b from-transparent via-cinnabar/45 to-transparent lg:hidden" />
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ top: `${(Math.max(active, 0) * 100) / roles.length + 100 / roles.length / 2}%`, opacity: active >= 0 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="pointer-events-none absolute -left-0.5 mt-1 flex -translate-y-1/2 items-center lg:hidden"
        >
          <span className="h-2 w-2 rounded-full bg-cinnabar shadow-[0_0_0_5px_rgba(236,61,32,0.18)]" />
          <span className="h-px w-3 bg-cinnabar/70" />
        </motion.span>
        {roles.map((role, line) => {
          const isActive = active === line;
          const dim = active !== -1 && !isActive;
          const letters = `${role.word}.`.split("");
          return (
            <span
              key={role.word}
              onClick={() => onSelect(line)}
              className="group/role flex w-fit cursor-pointer items-baseline gap-3 md:gap-5"
            >
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + line * 0.12, duration: 0.6 }}
                className={`w-6 shrink-0 font-mono text-[0.68rem] tracking-[0.1em] transition-colors duration-500 md:w-8 md:text-xs ${isActive ? "text-cinnabar" : "text-cream/45 group-hover/role:text-cream/80"}`}
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
                      className={`inline-block ${dim ? "group-hover/role:!text-[rgba(245,239,229,0.78)]" : ""}`}
                      initial={{ y: "105%", rotate: 6 }}
                      animate={{ y: "0%", rotate: 0 }}
                      transition={{ duration: 0.9, delay: 0.55 + line * 0.14 + k * 0.035, ease }}
                      style={{
                        color: isActive
                          ? flameAt(k / Math.max(letters.length - 1, 1))
                          : dim
                            ? "rgba(245,239,229,0.4)"
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
      <span aria-hidden="true" className="mt-5 flex h-7 items-center gap-3 pl-14 text-base text-cream/80 md:pl-[4.5rem] lg:pl-[3.25rem]">
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
