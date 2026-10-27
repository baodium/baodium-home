import { ViewTransition } from "react";
import type { ReactNode } from "react";
import { FLIP_BACK, FLIP_FORWARD } from "@/lib/book/flip-navigate";

const directional = {
  [FLIP_FORWARD]: FLIP_FORWARD,
  [FLIP_BACK]: FLIP_BACK,
  default: "none",
} as const;

/**
 * Route-level page stage for the book reader.
 * Direction comes from Link/router `transitionTypes` (nav-forward / nav-back).
 */
export function BookPageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  );
}
