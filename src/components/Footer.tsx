"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { book } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;

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

  return (
    <footer className="bg-cream px-3 pb-3 md:px-5 md:pb-5">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-ember pt-20 md:rounded-[3rem] md:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
        >
          <div className="breathe absolute bottom-[-40%] left-1/2 h-[90%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.45),rgba(216,38,43,0.12)_50%,transparent)] blur-3xl" />
        </div>

        <div className="shell relative z-[2]">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-[clamp(1.6rem,2.6vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.035em]">
              Projects and writing by{" "}
              <span className="font-serif font-normal italic text-flame">
                {site.name}.
              </span>
            </p>
            <nav aria-label="Elsewhere">
              <ul className="flex flex-col text-[0.95rem] sm:flex-row sm:flex-wrap sm:gap-x-8 sm:text-sm">
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
            className="wordmark relative mb-4 mt-16 md:mb-6 md:mt-20"
            onPointerMove={(event) => {
              const el = markRef.current;
              if (!el || event.pointerType !== "mouse") return;
              const rect = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
              el.style.setProperty("--my", `${event.clientY - rect.top}px`);
            }}
          >
            <span className="sr-only">{site.brand}</span>
            <motion.p
              aria-hidden="true"
              className="flex select-none justify-between text-[clamp(3.5rem,19.4vw,18.5rem)] font-semibold leading-[0.8] tracking-[-0.05em]"
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: "0px 0px -5% 0px" }}
              transition={{ staggerChildren: 0.06 }}
            >
              {letters.map((letter, index) => (
                <span
                  key={index}
                  className="inline-block overflow-hidden pb-[0.06em]"
                >
                  <motion.span
                    className="inline-block bg-gradient-to-b from-cream via-[#f3d9c6] to-[#e9866a] bg-clip-text text-transparent"
                    variants={{
                      hidden: { y: "100%" },
                      shown: { y: "0%", transition: { duration: 1.1, ease } },
                    }}
                  >
                    {letter}
                  </motion.span>
                </span>
              ))}
            </motion.p>
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

          <div className="flex items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-cream/50 md:py-7">
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
