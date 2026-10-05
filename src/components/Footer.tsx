"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { book } from "@/data/writing";


type Link = { label: string; href: string };

const elsewhere: Link[] = [
  { label: "LinkedIn", href: site.linkedin },
  { label: "Book on Amazon", href: book.href },
  { label: "GitHub", href: site.github },
  { label: "Email", href: site.email },
].filter((link) => link.href.length > 0);

export function Footer() {
  const year = new Date().getFullYear();
  const letters = site.brand.split("");
  const markRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  /** The wordmark rises as the footer arrives, and is whole while the links are still in reading position. */
  const { scrollYProgress } = useScroll({ target: footerRef, offset: ["start 1.08", "start 0.58"] });

  return (
    <footer ref={footerRef} className="bg-cream px-3 pb-3 md:px-5 md:pb-5">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember pt-14 md:rounded-[3rem] md:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
        >
          <div className="breathe absolute bottom-[-40%] left-1/2 h-[90%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(173,79,54,0.45),rgba(151,64,49,0.12)_50%,transparent)] blur-3xl" />
        </div>

        <div className="shell relative z-[2]">
          <div className="flex">
            <nav aria-label="Elsewhere">
              <ul className="flex flex-wrap gap-x-7 text-[0.95rem]">
                {elsewhere.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex min-h-11 items-center gap-1.5 text-cream/70 transition-colors hover:text-cream"
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

          <div
            ref={markRef}
            className="wordmark relative mb-4 mt-10 md:mb-6 md:mt-14"
            onPointerMove={(event) => {
              const el = markRef.current;
              if (!el || event.pointerType !== "mouse") return;
              const rect = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
              el.style.setProperty("--my", `${event.clientY - rect.top}px`);
            }}
          >
            <span className="sr-only">{site.brand}</span>
            <p
              aria-hidden="true"
              className="flex select-none justify-between text-[clamp(3.5rem,19.4vw,18.5rem)] font-semibold leading-[0.8] tracking-[-0.05em]"
            >
              {letters.map((letter, index) => (
                <RisingLetter key={index} letter={letter} index={index} progress={scrollYProgress} />
              ))}
            </p>
            <p
              aria-hidden="true"
              className="wordmark-light pointer-events-none absolute inset-0 flex select-none justify-between text-[clamp(3.5rem,19.4vw,18.5rem)] font-semibold leading-[0.8] tracking-[-0.05em]"
            >
              {letters.map((letter, index) => (
                <span
                  key={index}
                  className="inline-block pb-[0.06em] text-cinnabar"
                >
                  {letter}
                </span>
              ))}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-cream/60 md:py-7">
            <p>© {year} Baodium</p>
            <a
              href="#main"
              className="group inline-flex min-h-11 items-center gap-2 text-cream/70 transition-colors hover:text-cream"
            >
              Back to top
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
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
        className="inline-block bg-gradient-to-b from-cream via-[#f3d9c6] to-[#d39a7c] bg-clip-text text-transparent"
      >
        {letter}
      </motion.span>
    </span>
  );
}
