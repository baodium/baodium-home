import { readStored, writeStored } from "@/lib/storage";
import { SRE_LESSONS, type SreLabKey, type SreMode } from "@/lib/sre/catalog";

const KEY = "baodium-sre-progress-v1";
const EVENT = "baodium-sre-progress";
export type SreProgress = Partial<
  Record<
    SreLabKey,
    {
      opened: boolean;
      completedModes: SreMode[];
      updatedAt: number;
      evidence?: string;
    }
  >
>;
const EMPTY: SreProgress = {};
let cachedRaw: string | null = null;
let cache = EMPTY;
export const sreServerSnapshot = () => EMPTY;
export function loadSreProgress(): SreProgress {
  const raw = readStored(KEY);
  if (raw === cachedRaw) return cache;
  cachedRaw = raw;
  cache = {};
  try {
    const parsed = JSON.parse(raw ?? "{}");
    for (const { id } of SRE_LESSONS) {
      const item = parsed?.[id];
      if (!item || typeof item !== "object") continue;
      cache[id] = {
        opened: item.opened === true,
        completedModes: Array.isArray(item.completedModes)
          ? item.completedModes.filter(
              (mode: unknown): mode is SreMode =>
                mode === "guided" ||
                mode === "practice" ||
                mode === "challenge",
            )
          : [],
        updatedAt:
          typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
            ? item.updatedAt
            : 0,
        evidence: typeof item.evidence === "string" ? item.evidence : undefined,
      };
    }
  } catch {
    /* Corrupt progress is optional, never a blocked lesson. */
  }
  return cache;
}
export function subscribeSreProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
export function recordSreProgress(
  id: SreLabKey,
  mode?: SreMode,
  evidence?: string,
) {
  const previous = loadSreProgress();
  const modes = previous[id]?.completedModes ?? [];
  const next: SreProgress = {
    ...previous,
    [id]: {
      opened: true,
      completedModes: mode && !modes.includes(mode) ? [...modes, mode] : modes,
      updatedAt: Date.now(),
      evidence: evidence ?? previous[id]?.evidence,
    },
  };
  cachedRaw = JSON.stringify(next);
  cache = next;
  writeStored(KEY, cachedRaw);
  window.dispatchEvent(new Event(EVENT));
}
