"use client";

type FlipRouter = {
  push: (href: string) => void;
};

/** Navigate with a browser view-transition when motion is allowed. */
export function flipNavigate(
  router: FlipRouter,
  href: string,
  direction: 1 | -1,
) {
  if (typeof document === "undefined") {
    router.push(href);
    return;
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  root.dataset.flipDir = direction >= 0 ? "forward" : "back";
  root.dataset.flipping = "1";

  const clear = () => {
    delete root.dataset.flipDir;
    delete root.dataset.flipping;
  };

  const go = () => router.push(href);

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (!reduce && typeof doc.startViewTransition === "function") {
    try {
      const transition = doc.startViewTransition(go);
      transition.finished.finally(clear);
      return;
    } catch {
      /* fall through */
    }
  }

  go();
  window.setTimeout(clear, reduce ? 80 : 650);
}
