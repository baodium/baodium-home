"use client";

import { useEffect, type ReactNode } from "react";

/** Homepage is one viewport. Lock document scroll while this frame is mounted. */
export function HomeFrame({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousBody;
    };
  }, []);

  return <div className="h-dvh overflow-hidden">{children}</div>;
}
