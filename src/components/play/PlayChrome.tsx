import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { book } from "@/data/writing";

export function PlayChrome({
  children,
  crumb,
}: {
  children: ReactNode;
  crumb?: { label: string; href?: string };
}) {
  return (
    <>
      <header className="border-b border-ink/10 bg-cream">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4 text-ink">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-[0.72rem] tracking-[0.28em] transition-colors hover:text-cinnabar"
            >
              BAODIUM
            </Link>
            <span className="text-ink/25" aria-hidden="true">
              /
            </span>
            {crumb ? (
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[0.84rem]">
                <Link href="/play" className="text-muted transition-colors hover:text-ink">
                  Play
                </Link>
                <span className="text-ink/25" aria-hidden="true">
                  /
                </span>
                {crumb.href ? (
                  <Link href={crumb.href} className="text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink">{crumb.label}</span>
                )}
              </nav>
            ) : (
              <span className="text-[0.84rem] text-ink">Play</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[0.84rem]">
            <Link
              href="/play"
              className="text-muted transition-colors hover:text-ink"
            >
              All games
            </Link>
            <Link
              href={book.readPath}
              className="text-cinnabar transition-colors hover:text-ink"
            >
              Free book →
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="bg-cream pb-16 pt-10 text-ink md:pb-24 md:pt-14">
        {children}
      </main>
      <Footer />
    </>
  );
}
