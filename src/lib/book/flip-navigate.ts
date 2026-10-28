"use client";

export type FlipDirection = 1 | -1;

export const FLIP_FORWARD = "nav-forward";
export const FLIP_BACK = "nav-back";

type FlipRouter = {
  push: (href: string, options?: { transitionTypes?: string[] }) => void;
};

/** Chapter flip via Next.js transitionTypes → React ViewTransition. */
export function flipNavigate(
  router: FlipRouter,
  href: string,
  direction: FlipDirection,
) {
  router.push(href, {
    transitionTypes: [direction >= 0 ? FLIP_FORWARD : FLIP_BACK],
  });
}

export function flipTransitionTypes(direction: FlipDirection): string[] {
  return [direction >= 0 ? FLIP_FORWARD : FLIP_BACK];
}
