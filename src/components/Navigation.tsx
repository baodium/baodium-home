"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { book } from "@/data/writing";

const links = [
  { id: "work", label: "Work" },
  { id: "book", label: "Book" },
  { id: "writing", label: "Writing" },
  { id: "about", label: "About" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Navigation() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sections = links
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.5) setActive(null);
    };

    sections.forEach((section) => observer.observe(section));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <motion.header
      id="top"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 1.4, ease }}
      className="fixed inset-x-0 top-3 z-50 px-3 md:top-5"
    >
      <div className="mx-auto flex max-w-[52rem] items-center justify-between gap-2 rounded-full border border-white/10 bg-[#110e0c]/65 p-1.5 pl-4 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <a
          href="#main"
          className="group inline-flex min-h-10 items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.28em] text-cream"
          aria-label="Baodium, back to top"
        >
          <span aria-hidden="true" className="relative h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-[3px] bg-gradient-to-br from-amber to-crimson transition-transform duration-500 group-hover:rotate-45" />
          </span>
          BAODIUM
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center text-[0.86rem] text-cream/65">
            {links.map((link) => (
              <li key={link.id} className="relative">
                {active === link.id ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.09]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <a
                  href={`#${link.id}`}
                  aria-current={active === link.id ? "location" : undefined}
                  className="relative inline-flex min-h-10 items-center px-4 transition-colors hover:text-cream aria-[current]:text-cream"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-10 items-center gap-1.5 rounded-full bg-cream px-4 text-[0.82rem] font-medium text-ink transition-colors hover:bg-white"
          >
            Get the book
            <ArrowUpRight
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
            <span className="sr-only"> (opens Amazon in a new tab)</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] md:hidden"
          >
            <span
              aria-hidden="true"
              className={`absolute h-px w-4 bg-cream transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-px w-4 bg-cream transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
            className="mx-auto mt-2 max-w-[52rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#110e0c]/90 p-3 backdrop-blur-xl md:hidden"
          >
            <ul>
              {links.map((link, index) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05, duration: 0.4, ease }}
                >
                  <a
                    href={`#${link.id}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-2xl px-4 text-2xl tracking-[-0.02em] text-cream active:bg-white/5"
                  >
                    {link.label}
                    <span className="font-mono text-xs text-cream/40">0{index + 1}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
