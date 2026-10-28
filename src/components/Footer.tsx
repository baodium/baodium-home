"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { book } from "@/data/writing";

type Link = { label: string; href: string };

/** Lean elsewhere — contact as Email label (never raw address); music lives on About. */
const elsewhere: Link[] = [
  { label: "Email", href: site.email },
  { label: "About", href: "/about" },
  { label: "LinkedIn", href: site.linkedin },
  { label: "Google Scholar", href: site.scholar },
  { label: "Book on Amazon", href: book.href },
  { label: "obadimu.com", href: site.personal },
  { label: "GitHub", href: site.github },
].filter((link) => link.href.length > 0);

export function Footer() {
  const year = new Date().getFullYear();
  const letters = site.brand.split("");
  const footerRef = useRef<HTMLElement>(null);
  /** The wordmark rises as the footer arrives, and is whole while the links are still in reading position. */
  const { scrollYProgress } = useScroll({ target: footerRef, offset: ["start 1.08", "start 0.58"] });

  return (
    <footer ref={footerRef} className="bg-cream px-3 pb-3 md:px-5 md:pb-5">
      <div className="grain relative overflow-hidden rounded-[1.5rem] bg-[#1a2330] pt-7 md:rounded-[2rem] md:pt-9">
        <div className="shell relative z-[2]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <nav aria-label="Elsewhere">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem]">
                {elsewhere.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex min-h-10 items-center gap-1.5 text-cream/70 transition-colors hover:text-cream"
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                        {external ? (
                          <ArrowUpRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        ) : null}
                        {external ? (
                          <span className="sr-only"> (opens in a new tab)</span>
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="relative mb-0.5 mt-4 md:mb-1 md:mt-5">
            <span className="sr-only">{site.brand}</span>
            <p
              aria-hidden="true"
              className="flex select-none justify-between text-[clamp(1.35rem,5.5vw,3.35rem)] font-semibold leading-[0.88] tracking-[-0.05em]"
            >
              {letters.map((letter, index) => (
                <RisingLetter key={index} letter={letter} index={index} progress={scrollYProgress} />
              ))}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 py-3.5 text-sm text-cream/60 md:py-4">
            <p>© {year} Baodium</p>
            <a
              href="#main"
              className="group inline-flex min-h-10 items-center gap-2 text-cream/70 transition-colors hover:text-cream"
            >
              Back to top
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
                <ArrowUp
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:-translate-y-0.5"
                />
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function RisingLetter({ letter, index, progress }: { letter: string; index: number; progress: MotionValue<number> }) {
  const reduce = usePrefersReducedMotion();
  const start = 0.04 + index * 0.03;
  const y = useTransform(progress, [start, Math.min(start + 0.28, 1)], reduce ? ["0%", "0%"] : ["100%", "0%"]);
  return (
    <span className="inline-block overflow-hidden pb-[0.06em]">
      <motion.span
        style={{ y }}
        className="inline-block text-cream/90"
      >
        {letter}
      </motion.span>
    </span>
  );
}
