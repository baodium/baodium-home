export type ReaderTheme = "light" | "dark" | "paper";
export type ReaderFontScale = "sm" | "md" | "lg";

export const READER_STORAGE_KEY = "baodium-book-reader";

export type ReaderPrefs = {
  theme: ReaderTheme;
  fontScale: ReaderFontScale;
  measure: "narrow" | "comfortable" | "wide";
  lastSlug?: string;
  scrollTops?: Record<string, number>;
};

export const defaultReaderPrefs: ReaderPrefs = {
  theme: "paper",
  fontScale: "md",
  measure: "comfortable",
};

export function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return defaultReaderPrefs;
  try {
    const raw = localStorage.getItem(READER_STORAGE_KEY);
    if (!raw) return defaultReaderPrefs;
    return { ...defaultReaderPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultReaderPrefs;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(prefs));
}
