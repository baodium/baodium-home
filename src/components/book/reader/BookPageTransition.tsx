import { ViewTransition } from "react";
import type { ReactNode } from "react";
import {
  FLIP_BACK,
  FLIP_FORWARD,
  FLIP_GESTURE_BACK,
  FLIP_GESTURE_FORWARD,
} from "@/lib/book/flip-navigate";

const directional = {
  [FLIP_FORWARD]: FLIP_FORWARD,
  [FLIP_BACK]: FLIP_BACK,
  [FLIP_GESTURE_FORWARD]: FLIP_GESTURE_FORWARD,
  [FLIP_GESTURE_BACK]: FLIP_GESTURE_BACK,
  default: "none",
} as const;

/**
 * Route-level page stage for the book reader.
 * Link/keyboard use nav-forward/back; drag commits use nav-gesture-* (Motion owns the turn).
 */
export function BookPageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  );
}
