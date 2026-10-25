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

const THEME_ALIASES: Record<string, ReaderTheme> = {
  light: "light",
  dark: "dark",
  paper: "paper",
  // Discarded redesign keys → cream/copper paper theme
  folio: "paper",
  day: "light",
  night: "dark",
};

export function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return defaultReaderPrefs;
  try {
    const raw = localStorage.getItem(READER_STORAGE_KEY);
    if (!raw) return defaultReaderPrefs;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs> & { theme?: string };
    const theme = THEME_ALIASES[parsed.theme ?? ""] ?? defaultReaderPrefs.theme;
    return { ...defaultReaderPrefs, ...parsed, theme };
  } catch {
    return defaultReaderPrefs;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(prefs));
}
