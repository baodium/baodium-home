"use client";

import "./foundations.css";
import "./course.css";
import "./catalog.css";
import "./laboratory.css";
import "./operations.css";
import "./refinements.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

const labs = [
  { href: "/sre-labs/coding", label: "Coding practice" },
  { href: "/sre-labs/observability", label: "Hands-on course" },
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
      <SiteHeader />
      <main
        id="main"
        className="relative z-[1] mx-auto w-full max-w-[88rem] px-4 pb-16 pt-6 sm:px-6 md:pt-8"
      >
        {inLab || showSections ? (
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
