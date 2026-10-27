import Link from "next/link";
import type { ReactNode } from "react";

export function ExperienceShell({
  children,
  kicker = "Practical System Design",
  title,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
}) {
  return (
    <div className="exp-root relative min-h-[100dvh]">
      <div aria-hidden="true" className="exp-atmosphere" />
      <header className="relative z-[2] border-b border-[color:var(--exp-line)] bg-[color-mix(in_srgb,#fbfcfe_78%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--exp-fg)_5%,transparent)]"
            aria-label="Baodium home"
          >
            <span aria-hidden="true" className="relative h-2.5 w-2.5 shrink-0">
              <span className="absolute inset-0 rounded-[3px] bg-gradient-to-br from-amber to-crimson transition-transform duration-500 group-hover:rotate-45" />
            </span>
            <span className="font-mono text-[0.72rem] font-medium tracking-[0.22em] text-[color:var(--exp-fg)]">
              BAODIUM
            </span>
          </Link>
          <span className="hidden text-[color:var(--exp-faint)] sm:inline" aria-hidden="true">
            /
          </span>
          <Link
            href="/system-design/experience"
            className="hidden text-sm text-[color:var(--exp-muted)] transition-colors hover:text-[color:var(--exp-fg)] sm:inline"
          >
            Experience
          </Link>
          {title ? (
            <>
              <span className="hidden text-[color:var(--exp-faint)] md:inline" aria-hidden="true">
                /
              </span>
              <p className="hidden min-w-0 truncate font-serif text-sm italic text-[color:var(--exp-muted)] md:block">
                {title}
              </p>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/system-design"
              className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-[color:var(--exp-muted)] transition-colors hover:text-[color:var(--exp-fg)]"
            >
              Book
            </Link>
            <Link
              href="/system-design/chapter-1"
              className="exp-btn exp-btn-ghost !min-h-9 !px-3 text-sm"
            >
              Ch.1 prose
            </Link>
          </div>
        </div>
        <p className="sr-only">{kicker}</p>
      </header>
      <main id="main" className="relative z-[1]">
        {children}
      </main>
    </div>
  );
}
