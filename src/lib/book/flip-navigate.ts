"use client";

export type FlipDirection = 1 | -1;

export const FLIP_FORWARD = "nav-forward";
export const FLIP_BACK = "nav-back";
/** Drag/swipe commit — ViewTransition stays quiet; Motion owns enter/exit. */
export const FLIP_GESTURE_FORWARD = "nav-gesture-forward";
export const FLIP_GESTURE_BACK = "nav-gesture-back";

type FlipRouter = {
  push: (href: string, options?: { transitionTypes?: string[] }) => void;
};

type GesturePayload = {
  /** +1 = next chapter (page exits left, next enters from right). */
  direction: FlipDirection;
};

let pendingGesture: GesturePayload | null = null;

/** Mark that the next chapter mount should spring in from the exit side. */
export function markGestureFlip(direction: FlipDirection) {
  pendingGesture = { direction };
}

/** Consume once on the arriving chapter; null if this was a link/keyboard VT flip. */
export function consumeGestureFlip(): GesturePayload | null {
  const next = pendingGesture;
  pendingGesture = null;
  return next;
}

/** Chapter flip via Next.js transitionTypes → React ViewTransition. */
export function flipNavigate(
  router: FlipRouter,
  href: string,
  direction: FlipDirection,
  opts?: { gesture?: boolean },
) {
  const gesture = opts?.gesture === true;
  if (gesture) markGestureFlip(direction);
  router.push(href, {
    transitionTypes: [
      gesture
        ? direction >= 0
          ? FLIP_GESTURE_FORWARD
          : FLIP_GESTURE_BACK
        : direction >= 0
          ? FLIP_FORWARD
          : FLIP_BACK,
    ],
  });
}

export function flipTransitionTypes(direction: FlipDirection): string[] {
  return [direction >= 0 ? FLIP_FORWARD : FLIP_BACK];
}
