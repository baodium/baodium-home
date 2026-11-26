"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function motionOkSnapshot() {
  return !reducedSnapshot();
}

function serverFalse() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, reducedSnapshot, serverFalse);
}

/** False during server render so the hero video is not requested until motion is allowed. */
export function useHeroMotionOk() {
  return useSyncExternalStore(subscribe, motionOkSnapshot, serverFalse);
}

function subscribeShortHeight(onChange: () => void) {
  const media = window.matchMedia("(max-height: 820px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function shortHeightSnapshot() {
  return window.matchMedia("(max-height: 820px)").matches;
}

/** True when the viewport is short enough that stacked teaching prose needs collapse. */
export function useShortViewport() {
  return useSyncExternalStore(subscribeShortHeight, shortHeightSnapshot, serverFalse);
}
