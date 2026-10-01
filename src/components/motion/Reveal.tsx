"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Words rise out of a mask, one after another. Pass `accent` words to render them in the serif italic flame. */
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
  as?: "h2" | "h3" | "p";
  id?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden="true"
        className="block"
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        transition={{ staggerChildren: 0.06, delayChildren: delay }}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-flex overflow-hidden pb-[0.12em] align-top">
            <motion.span
              className={`inline-block ${accent.includes(word.replace(/[.,]/g, "")) ? `${accentClassName} pr-[0.06em]` : ""}`}
              variants={{
                hidden: { y: "110%", rotate: 4 },
                shown: { y: "0%", rotate: 0, transition: { duration: 0.9, ease } },
              }}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? <span>&nbsp;</span> : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
