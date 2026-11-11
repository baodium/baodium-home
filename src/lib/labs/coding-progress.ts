import { readStored, writeStored } from "@/lib/storage";
const KEY = "baodium-coding-progress-v1";
const EVENT = "baodium-coding-progress";
export type CodingProgress = Record<
  string,
  {
    status: "attempted" | "passed";
    updatedAt: number;
    passed: number;
    total: number;
  }
>;
const empty: CodingProgress = {};
let cachedRaw: string | null = null;
let cached: CodingProgress = empty;
export const codingServerSnapshot = () => empty;
export function loadCodingProgress(): CodingProgress {
  const raw = readStored(KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = {};
  try {
    const value = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      return cached;
    for (const [id, row] of Object.entries(value)) {
      if (!row || typeof row !== "object" || id === "__proto__") continue;
      const item = row as Record<string, unknown>;
      if (
        (item.status !== "passed" && item.status !== "attempted") ||
        typeof item.updatedAt !== "number" ||
        !Number.isFinite(item.updatedAt) ||
        typeof item.passed !== "number" ||
        typeof item.total !== "number" ||
        item.total < 1 ||
        item.passed < 0 ||
        item.passed > item.total
      )
        continue;
      cached[id] = {
        status: item.status,
        updatedAt: item.updatedAt,
        passed: item.passed,
        total: item.total,
      };
    }
  } catch {
    /* Optional progress must not block practice. */
  }
  return cached;
}
export function subscribeCodingProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
export function recordCodingRun(
  id: string,
  passed: number,
  total: number,
  fullSuite: boolean,
) {
  const previous = loadCodingProgress();
  const prior = previous[id];
  const row =
    fullSuite && passed === total && total > 0
      ? { status: "passed" as const, passed, total, updatedAt: Date.now() }
      : prior?.status === "passed"
        ? prior
        : {
            status: "attempted" as const,
            passed,
            total,
            updatedAt: Date.now(),
          };
  writeStored(KEY, JSON.stringify({ ...previous, [id]: row }));
  window.dispatchEvent(new Event(EVENT));
}
export const draftKey = (id: string) => `baodium-coding-draft-v1:${id}`;
