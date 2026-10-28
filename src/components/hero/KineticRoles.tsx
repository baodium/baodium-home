"use client";

import type { RefObject } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

export const roles = [
  { word: "Engineer" },
  { word: "Philanthropist" },
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
  const reduce = usePrefersReducedMotion();
  return (
    <>
      <span className="relative mt-5 flex flex-col gap-[0.07em] max-lg:pl-5 md:mt-6">
        {/* Phones and tablets: the signal runs down a rail beside the numbers and rests on the chosen role. */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[10%] left-0.5 top-[10%] w-px bg-cinnabar/45 lg:hidden" />
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ top: `${(Math.max(active, 0) * 100) / roles.length + 100 / roles.length / 2}%`, opacity: active >= 0 ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 24 }}
          className="pointer-events-none absolute -left-0.5 mt-1 flex -translate-y-1/2 items-center lg:hidden"
        >
          <span className="h-2 w-2 rounded-full bg-cinnabar shadow-[0_0_0_5px_rgba(173,79,54,0.18)]" />
          <span className="h-px w-3 bg-cinnabar/70" />
        </motion.span>
        {roles.map((role, line) => {
          const isActive = active === line;
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
                transition={{ delay: reduce ? 0 : 1 + line * 0.12, duration: reduce ? 0 : 0.6 }}
                className={`w-6 shrink-0 font-mono text-[0.68rem] tracking-[0.1em] transition-colors duration-300 md:w-8 md:text-xs ${isActive ? "text-amber" : "text-cream/70 group-hover/role:text-cream"}`}
              >
                0{line + 1}
              </motion.span>
              {/* No overflow clip / filter blur: roles must stay optically sharp. */}
              <span className="block pb-[0.08em] text-[clamp(2.45rem,5.1vw,4.85rem)] font-semibold leading-[1.02] tracking-[-0.05em] [filter:none]">
                <span className="sr-only">{role.word}.</span>
                <motion.span
                  aria-hidden="true"
                  ref={(node) => {
                    wordRefs.current[line] = node;
                  }}
                  className="inline-flex"
                  animate={
                    reduce || !isActive
                      ? undefined
                      : { x: [0, 1.5, 0, -0.8, 0] }
                  }
                  transition={
                    reduce || !isActive
                      ? undefined
                      : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  {letters.map((letter, k) => (
                    <motion.span
                      key={k}
                      className="inline-block will-change-auto"
                      initial={reduce ? false : { y: "0.35em", opacity: 0 }}
                      animate={{ y: "0em", opacity: 1 }}
                      transition={{
                        duration: reduce ? 0 : 0.7,
                        delay: reduce ? 0 : 0.55 + line * 0.14 + k * 0.03,
                        ease,
                      }}
                      style={{
                        color: isActive
                          ? flameAt(k / Math.max(letters.length - 1, 1))
                          : "#f5efe5",
                        transition: reduce
                          ? undefined
                          : `color 0.28s ease ${isActive ? (letters.length - 1 - k) * 0.018 : 0}s`,
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.span>
              </span>
            </span>
          );
        })}
      </span>
    </>
  );
}
