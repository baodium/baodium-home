"use client";

import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { alsoLinks } from "@/data/site";

/** Compact culture / research row — not a second homepage. */
export function AlsoStrip() {
  return (
    <Reveal y={10} className="mt-10 border-t border-ink/10 pt-8 md:mt-12">
      <p className="kicker text-cinnabar/80">Also</p>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {alsoLinks.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-10 items-center gap-1.5 text-[0.92rem] text-muted transition-colors hover:text-cinnabar"
            >
              <span>{link.label}</span>
              {"note" in link && link.note ? (
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted/70">
                  {link.note}
                </span>
              ) : null}
              <ArrowUpRight
                aria-hidden="true"
                className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
              />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
