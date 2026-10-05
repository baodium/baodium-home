"use client";

import type { RefObject } from "react";
import { motion } from "motion/react";

export const roles = [
  { word: "Engineer" },
  { word: "Builder" },
  { word: "Author" },
];

const stops = [
  [238, 200, 168],
  [224, 146, 110],
  [200, 104, 76],
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
      <span className="relative mt-5 flex flex-col gap-[0.07em] max-lg:pl-5 md:mt-6">
        {/* Phones and tablets: the signal runs down a rail beside the numbers and rests on the chosen role. */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[10%] left-0.5 top-[10%] w-px bg-gradient-to-b from-transparent via-cinnabar/45 to-transparent lg:hidden" />
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ top: `${(Math.max(active, 0) * 100) / roles.length + 100 / roles.length / 2}%`, opacity: active >= 0 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="pointer-events-none absolute -left-0.5 mt-1 flex -translate-y-1/2 items-center lg:hidden"
        >
          <span className="h-2 w-2 rounded-full bg-cinnabar shadow-[0_0_0_5px_rgba(173,79,54,0.18)]" />
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
                className={`w-6 shrink-0 font-mono text-[0.68rem] tracking-[0.1em] transition-colors duration-300 md:w-8 md:text-xs ${isActive ? "text-amber" : "text-cream/70 group-hover/role:text-cream"}`}
              >
                0{line + 1}
              </motion.span>
              <span className="block overflow-hidden pb-[0.08em] text-[clamp(3.1rem,6.1vw,6.15rem)] font-semibold leading-[1.02] tracking-[-0.05em]">
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
                            ? "rgba(245,239,229,0.62)"
                            : "#f5efe5",
                        transition: `color 0.28s ease ${isActive ? (letters.length - 1 - k) * 0.018 : 0}s`,
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
    </>
  );
}
