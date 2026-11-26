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
import { SitePill } from "@/components/Navigation";

const labs = [
  { href: "/sre-labs/coding", label: "Coding practice" },
  { href: "/sre-labs/observability", label: "Hands-on course" },
  { href: "/sre-labs/instrument", label: "Playback" },
  { href: "/sre-labs/slo", label: "Messaging SLO" },
  { href: "/sre-labs/api", label: "API budget" },
  { href: "/sre-labs/alert", label: "Search paging" },
  { href: "/sre-labs/analytics", label: "Ingest paging" },
  { href: "/sre-labs/cascade", label: "Card provider" },
  { href: "/sre-labs/capacity", label: "Edge / CDN" },
  { href: "/sre-labs/deployment", label: "Sign-in" },
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
    <div className="sre-root learn-root exp-root relative min-h-[100dvh] pt-[5.5rem]">
      <SitePill />
      <main
        id="main"
        className="relative z-[1] mx-auto w-full max-w-[96rem] px-4 pb-20 pt-2 sm:px-6 lg:px-8"
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
