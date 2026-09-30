"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = element.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (reduce || alreadyVisible || !("IntersectionObserver" in window)) {
      element.dataset.shown = "true";
      element.dataset.armed = "true";
      return;
    }

    element.dataset.armed = "true";
    element.dataset.shown = "false";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.dataset.shown = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`.trim()} data-shown="false">
      {children}
    </div>
  );
}
