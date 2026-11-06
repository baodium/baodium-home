import { readStored, writeStored } from "@/lib/storage";

const KEY = "baodium-experience-ch01-acts-v1";

export type ActProgress = {
  cursor: number;
  prediction: "a" | "b" | "c" | null;
  updatedAt: number;
};

export function loadActProgress(): ActProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readStored(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActProgress>;
    const cursor = typeof parsed.cursor === "number" && parsed.cursor >= 0 ? parsed.cursor : 0;
    const prediction =
      parsed.prediction === "a" || parsed.prediction === "b" || parsed.prediction === "c"
        ? parsed.prediction
        : null;
    return { cursor, prediction, updatedAt: parsed.updatedAt ?? Date.now() };
  } catch {
    return null;
  }
}

export function saveActProgress(progress: Omit<ActProgress, "updatedAt">) {
  writeStored(
    KEY,
    JSON.stringify({ ...progress, updatedAt: Date.now() } satisfies ActProgress),
  );
}
