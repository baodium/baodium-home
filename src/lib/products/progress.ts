const KEY = "baodium.product-labs.v1";

type Progress = Record<string, { resolvedAt: number }>;

let cache: Progress | null = null;
const listeners = new Set<() => void>();
const EMPTY: Progress = {};

function read(): Progress {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Progress;
  } catch {
    cache = {};
  }
  return cache;
}

export function loadProductProgress() {
  return typeof window === "undefined" ? EMPTY : read();
}

export function productProgressServer() {
  return EMPTY;
}

export function subscribeProductProgress(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function markResolved(id: string) {
  if (typeof window === "undefined") return;
  cache = { ...read(), [id]: { resolvedAt: Date.now() } };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Progress stays in memory for this visit when storage is blocked.
  }
  for (const fn of listeners) fn();
}

export function draftKey(incident: string) {
  return `baodium.product-labs.draft.${incident}`;
}

export function loadDraft(incident: string) {
  try {
    return window.localStorage.getItem(draftKey(incident));
  } catch {
    return null;
  }
}

export function saveDraft(incident: string, source: string | null) {
  try {
    if (source === null) window.localStorage.removeItem(draftKey(incident));
    else window.localStorage.setItem(draftKey(incident), source);
  } catch {
    // Drafts stay in the editor when storage is blocked.
  }
}
