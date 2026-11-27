"use client";

import "./foundations.css";
import "./course.css";
import "./catalog.css";
import "./laboratory.css";
import "./operations.css";
import "./refinements.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { SitePill } from "@/components/Navigation";
import { SRE_LESSONS } from "@/lib/sre/catalog";
import { OBSERVABILITY_COURSE } from "@/lib/sre/observability-course";

type Crumb = { label: string; href?: string };

function crumbsFor(pathname: string): Crumb[] {
  const labs: Crumb = { label: "Labs", href: "/labs" };
  const parts = pathname.split("/").filter(Boolean).slice(1);
  if (parts[0] === "observability") {
    const course: Crumb = { label: "Payments stack course", href: "/sre-labs/observability" };
    const lesson = OBSERVABILITY_COURSE.find((item) => item.slug === parts[1]);
    return lesson ? [labs, course, { label: lesson.title }] : [labs, { label: course.label }];
  }
  if (SRE_LESSONS.some((item) => item.id === parts[0])) return [labs, { label: "Guided lessons", href: "/sre-labs" }];
  return [labs, { label: "Guided lessons" }];
}

export function SreChrome({ children }: { children: ReactNode }) {
  const crumbs = crumbsFor(usePathname());

  return (
    <div className="sre-root learn-root exp-root relative min-h-[100dvh] pt-[5.5rem]">
      <SitePill />
      <main
        id="main"
        className="relative z-[1] mx-auto w-full max-w-[96rem] px-4 pb-20 pt-2 sm:px-6 lg:px-8"
      >
        <nav className="sre-crumbs" aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.label}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}
