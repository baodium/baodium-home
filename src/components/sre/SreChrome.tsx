"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";

const labs = [
  { href: "/sre-labs/cascade", label: "Cascade" },
  { href: "/sre-labs/instrument", label: "Instrument" },
  { href: "/sre-labs/slo", label: "SLO" },
  { href: "/sre-labs/alert", label: "Alert" },
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

  return (
    <div className="learn-root exp-root relative min-h-[100dvh]">
      <Navigation />
      <main id="main" className="relative z-[1] mx-auto w-full max-w-[88rem] px-4 pb-16 pt-24 sm:px-6 md:pt-28">
        {showSections ? (
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
