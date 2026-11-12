import { readStored, writeStored } from "@/lib/storage";
import type { PracticeLanguage } from "./languages";
const KEY = "baodium-coding-progress-v1";
const EVENT = "baodium-coding-progress";
const LANGUAGE_KEY = "baodium-coding-language";
const LANGUAGE_EVENT = "baodium-coding-language";
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
export function progressKey(
  id: string,
  language: PracticeLanguage = "python",
) {
  return language === "python" ? id : `${language}:${id}`;
}
export function loadPracticeLanguage(): PracticeLanguage {
  const stored = readStored(LANGUAGE_KEY);
  if (stored === "go" || stored === "typescript" || stored === "python")
    return stored;
  return "python";
}
export const languageServerSnapshot = (): PracticeLanguage => "python";
export function subscribePracticeLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_EVENT, callback);
  };
}
export function storePracticeLanguage(language: PracticeLanguage) {
  writeStored(LANGUAGE_KEY, language);
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
export function recordCodingRun(
  id: string,
  passed: number,
  total: number,
  fullSuite: boolean,
  language: PracticeLanguage = "python",
) {
  const previous = loadCodingProgress();
  const key = progressKey(id, language);
  const prior = previous[key];
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
  writeStored(KEY, JSON.stringify({ ...previous, [key]: row }));
  window.dispatchEvent(new Event(EVENT));
}
export const draftKey = (id: string, language: PracticeLanguage = "python") =>
  language === "python"
    ? `baodium-coding-draft-v1:${id}`
    : `baodium-coding-draft-v1:${language}:${id}`;
