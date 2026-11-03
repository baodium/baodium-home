const sessionFallback = new Map<string, string | null>();

/** Persistence is optional: private browsing and quota limits must not break a lab. */
export function readStored(key: string): string | null {
  if (sessionFallback.has(key)) return sessionFallback.get(key) ?? null;
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    sessionFallback.delete(key);
  } catch {
    sessionFallback.set(key, value);
  }
}
