"use client";

import { motion } from "motion/react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { book } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;

const sections = [
  { label: "Work", href: "#work" },
  { label: "Book", href: "#book" },
  { label: "Writing", href: "#writing" },
  { label: "About", href: "#about" },
];

const contact = [
  { label: "GitHub", href: site.github },
  { label: "LinkedIn", href: site.linkedin },
  { label: "Email", href: site.email },
].filter((link) => link.href.length > 0);

export function Footer() {
  const year = new Date().getFullYear();
  const letters = site.brand.split("");

  return (
    <footer className="grain relative z-10 -mt-10 overflow-hidden rounded-t-[2rem] bg-night pt-20 md:-mt-14 md:rounded-t-[3.5rem] md:pt-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]">
        <div className="breathe absolute bottom-[-40%] left-1/2 h-[90%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(236,61,32,0.45),rgba(216,38,43,0.12)_50%,transparent)] blur-3xl" />
      </div>

      <div className="shell relative z-[2]">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="kicker text-cream/45">Baodium</p>
            <p className="mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.045em]">
              Engineer. Builder.{" "}
              <span className="font-serif font-normal italic text-flame">Author.</span>
            </p>
            <p className="mt-5 max-w-md text-cream/55">Projects and writing by {site.name}.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm md:col-span-5">
            <ul className="space-y-1">
              {sections.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="group inline-flex min-h-10 items-center gap-2 text-cream/70 transition-colors hover:text-cream">
                    <span className="h-px w-0 bg-cinnabar transition-all duration-300 group-hover:w-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="space-y-1">
              <li>
                <a
                  href={book.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-10 items-center gap-1.5 text-cream/70 transition-colors hover:text-cream"
                >
                  Book on Amazon
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              {contact.map((link) => {
                const external = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group inline-flex min-h-10 items-center gap-1.5 text-cream/70 transition-colors hover:text-cream"
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                      {external ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="mt-20 md:mt-28">
          <motion.p
            aria-label={site.brand}
            className="flex select-none justify-between text-[clamp(3.5rem,19.4vw,18.5rem)] font-semibold leading-[0.8] tracking-[-0.05em]"
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, margin: "0px 0px -5% 0px" }}
            transition={{ staggerChildren: 0.06 }}
          >
            {letters.map((letter, index) => (
              <span key={index} aria-hidden="true" className="inline-block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="inline-block bg-gradient-to-b from-cream via-[#ffc29c] to-cinnabar bg-clip-text text-transparent"
                  variants={{
                    hidden: { y: "100%" },
                    shown: { y: "0%", transition: { duration: 1.1, ease } },
                  }}
                  whileHover={{ y: "-8%", transition: { type: "spring", stiffness: 400, damping: 12 } }}
                >
                  {letter}
                </motion.span>
              </span>
            ))}
          </motion.p>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-sm text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Baodium</p>
          <a href="#main" className="group inline-flex min-h-11 items-center gap-2 text-cream/70 transition-colors hover:text-cream">
            Back to top
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
              <ArrowUp aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
