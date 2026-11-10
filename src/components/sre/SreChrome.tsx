"use client";

import "./catalog.css";
import "./laboratory.css";
import "./operations.css";
import "./refinements.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";

const labs = [
  { href: "/sre-labs/cascade", label: "Cascade" },
  { href: "/sre-labs/instrument", label: "Instrument" },
  { href: "/sre-labs/slo", label: "SLO" },
  { href: "/sre-labs/alert", label: "Alert" },
  { href: "/sre-labs/capacity", label: "Capacity" },
  { href: "/sre-labs/deployment", label: "Deploy" },
];

export function SreChrome({
  children,
  showSections = true,
}: {
  children: ReactNode;
  crumb?: string;
  showSections?: boolean;
}) {
  const pathname = usePathname();
  const inLab = pathname !== "/sre-labs";

  return (
    <div className="learn-root exp-root relative min-h-[100dvh]">
      {inLab ? (
        <header className="sre-workspace-header">
          <div>
            <Link href="/" aria-label="Baodium home" className="sre-wordmark">
              BAODIUM
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/sre-labs">SRE curriculum</Link>
            <nav aria-label="SRE labs">
              {labs.map((lab) => (
                <Link
                  key={lab.href}
                  href={lab.href}
                  aria-current={pathname === lab.href ? "page" : undefined}
                >
                  {lab.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      ) : (
        <Navigation />
      )}
      <main
        id="main"
        className={`relative z-[1] mx-auto w-full max-w-[88rem] px-4 pb-16 sm:px-6 ${inLab ? "pt-5 md:pt-7" : "pt-24 md:pt-28"}`}
      >
        {showSections && !inLab ? (
          <nav className="sre-sections" aria-label="SRE labs">
            {labs.map((lab) => (
              <Link
                key={lab.href}
                href={lab.href}
                aria-current={pathname === lab.href ? "page" : undefined}
              >
                {lab.label}
              </Link>
            ))}
            <Link href="/system-design/experience">Book labs</Link>
            <Link href="/play">Drills</Link>
          </nav>
        ) : null}
        {children}
      </main>
    </div>
  );
}
