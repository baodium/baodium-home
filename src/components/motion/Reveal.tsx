"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** A heading that rises once as a whole. Pass `accent` words to render them in the serif italic flame. */
export function SplitHeading({
  text,
  accent = [],
  as: Tag = "h2",
  id,
  className = "",
  accentClassName = "font-serif font-normal italic text-flame",
  delay = 0,
}: {
  text: string;
  accent?: string[];
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  const reduce = usePrefersReducedMotion();
  return (
    <Tag id={id} className={className}>
      <motion.span
        className="block"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : delay, ease }}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span className={accent.includes(word.replace(/[.,]/g, "")) ? `${accentClassName} pr-[0.06em]` : ""}>{word}</span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
