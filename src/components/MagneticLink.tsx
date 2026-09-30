"use client";

import { useRef, type ReactNode } from "react";

function allowMagnet(event: { pointerType: string }) {
  if (event.pointerType !== "mouse") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MagneticLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <a
      ref={ref}
      href={href}
      className={`magnetic inline-flex items-center ${className}`.trim()}
      onPointerMove={(event) => {
        const link = ref.current;
        if (!link || !allowMagnet(event)) return;
        const rect = link.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        link.style.transform = `translate3d(${x * 0.28}px, ${y * 0.4}px, 0)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "translate3d(0, 0, 0)";
      }}
      onPointerCancel={() => {
        if (ref.current) ref.current.style.transform = "translate3d(0, 0, 0)";
      }}
    >
      {children}
    </a>
  );
}
