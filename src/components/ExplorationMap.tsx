"use client";

import { animate, stagger } from "motion/react";
import { useEffect, useRef } from "react";
import { projects } from "@/data/projects";

const interviewCoachUrl =
  projects.find((project) => project.slug === "interview-coach")?.url ??
  "https://interview.baodium.com/";

type Item = {
  label: string;
  href?: string;
  external?: boolean;
};

const columns: { title: string; href: string; external?: boolean; items: Item[] }[] = [
  {
    title: "Engineering",
    href: "#focus",
    items: [
      { label: "Reliability Engineering", href: "#focus" },
      { label: "Distributed Systems", href: "#focus" },
      { label: "Infrastructure", href: "#focus" },
    ],
  },
  {
    title: "Products",
    href: interviewCoachUrl,
    external: true,
    items: [
      {
        label: "Interview Coach",
        href: interviewCoachUrl,
        external: true,
      },
      { label: "Future work" },
    ],
  },
  {
    title: "Writing",
    href: "#writing",
    items: [{ label: "Practical System Design", href: "#writing" }],
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

function Node({
  label,
  href,
  external,
  emphasis = false,
  muted = false,
}: Item & { emphasis?: boolean; muted?: boolean }) {
  const dot = (
    <span
      aria-hidden="true"
      className={`relative z-10 h-1.5 w-1.5 shrink-0 rounded-full ${muted ? "border border-faint bg-bg" : "bg-bronze"}`}
    />
  );
  const className = `map-label relative flex items-center gap-4 text-[0.95rem] ${
    emphasis ? "bg-bg pr-3 text-ink" : muted ? "text-faint" : "text-muted hover:text-ink"
  }`;

  if (!href) {
    return (
      <span className={className}>
        {dot}
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`${className} map-node transition-colors`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {dot}
      <span>{label}</span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

export function ExplorationMap() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rulesX = [...root.querySelectorAll<HTMLElement>(".map-rule-x")];
    const rulesY = [...root.querySelectorAll<HTMLElement>(".map-rule-y")];
    const labels = [...root.querySelectorAll<HTMLElement>(".map-label")];

    const play = () => {
      if (rulesX.length) {
        animate(rulesX, { scaleX: [0, 1] }, { duration: 1.05, ease });
      }
      if (rulesY.length) {
        animate(rulesY, { scaleY: [0, 1] }, { duration: 0.85, delay: stagger(0.12), ease });
      }
      if (labels.length) {
        animate(
          labels,
          { opacity: [0, 1], y: [8, 0] },
          { duration: 0.5, delay: stagger(0.06, { startDelay: 0.18 }), ease },
        );
      }
    };

    rulesX.forEach((line) => {
      line.style.transformOrigin = "left center";
      line.style.transform = "scaleX(0)";
    });
    rulesY.forEach((line) => {
      line.style.transformOrigin = "top center";
      line.style.transform = "scaleY(0)";
    });
    labels.forEach((label) => {
      label.style.opacity = "0";
      label.style.transform = "translateY(8px)";
    });

    const rect = root.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
    if (alreadyVisible) {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        play();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="map" aria-labelledby="map-heading" className="section">
      <div className="shell">
        <h2
          id="map-heading"
          className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-bronze"
        >
          Map
        </h2>
        <div ref={rootRef} className="map-root relative mt-16">
          <div
            aria-hidden="true"
            className="map-rule-x absolute top-[0.72rem] right-0 left-0 hidden h-px origin-left bg-line-strong lg:block"
          />
          <div className="grid gap-16 lg:grid-cols-3 lg:gap-12">
            {columns.map((column) => (
              <div key={column.title} className="relative">
                <span
                  aria-hidden="true"
                  className="map-rule-y absolute top-[0.72rem] bottom-1 left-[3px] w-px origin-top bg-line-strong"
                />
                <Node
                  href={column.href}
                  label={column.title}
                  external={column.external}
                  emphasis
                />
                <ul className="mt-8 space-y-6">
                  {column.items.map((item) => (
                    <li key={item.label}>
                      <Node {...item} muted={!item.href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
