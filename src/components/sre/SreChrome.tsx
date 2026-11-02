import Link from "next/link";
import type { ReactNode } from "react";

const labs = [
  { href: "/sre-labs/cascade", label: "Cascade" },
  { href: "/sre-labs/instrument", label: "Instrument" },
  { href: "/sre-labs/slo", label: "SLO" },
  { href: "/sre-labs/alert", label: "Alert" },
];

export function SreChrome({
  children,
  crumb,
}: {
  children: ReactNode;
  crumb?: string;
}) {
  return (
    <div className="learn-root exp-root relative min-h-[100dvh]">
      <div aria-hidden="true" className="exp-atmosphere" />
      <header className="sticky top-0 z-40 border-b border-[color:var(--exp-line)] bg-[color-mix(in_srgb,var(--exp-panel-raise)_90%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group inline-flex h-10 items-center gap-2 rounded-full px-2.5"
            aria-label="Baodium home"
          >
            <span aria-hidden="true" className="relative h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-[3px] bg-cinnabar transition-transform duration-500 group-hover:rotate-45" />
            </span>
            <span className="font-mono text-[0.72rem] tracking-[0.22em] text-[color:var(--exp-fg)]">BAODIUM</span>
          </Link>
          <span className="text-[color:var(--exp-faint)]" aria-hidden="true">
            /
          </span>
          <Link href="/sre-labs" className="text-sm text-[color:var(--exp-muted)] hover:text-[color:var(--exp-fg)]">
            SRE Lab
          </Link>
          {crumb ? (
            <p className="min-w-0 truncate font-serif text-sm italic text-[color:var(--exp-muted)]">{crumb}</p>
          ) : null}
          <nav aria-label="SRE labs" className="ml-auto flex flex-wrap items-center gap-2">
            {labs.map((lab) => (
              <Link key={lab.href} href={lab.href} className="chrome-link">
                {lab.label}
              </Link>
            ))}
            <Link href="/system-design/experience" className="chrome-link hidden md:inline-flex">
              Book labs
            </Link>
            <Link href="/play" className="chrome-link hidden sm:inline-flex">
              Drills
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="relative z-[1] mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
