export type ReaderTheme = "light" | "dark" | "paper";
export type ReaderFontScale = "sm" | "md" | "lg";

export const READER_STORAGE_KEY = "baodium-book-reader";

export type ReaderPrefs = {
  theme: ReaderTheme;
  fontScale: ReaderFontScale;
  measure: "narrow" | "comfortable" | "wide";
  lastSlug?: string;
  scrollTops?: Record<string, number>;
  /** 0–1 progress within lastSlug, for resume UI */
  progressBySlug?: Record<string, number>;
  feedbackDismissedAt?: number;
  /** Coach mark for swipe / ←→ chapter flips */
  flipHintDismissedAt?: number;
  /** Desktop contents rail collapsed to chapter numbers. */
  tocCollapsed?: boolean;
};

/** Light = white page (default). Paper stays optional cream. */
export const defaultReaderPrefs: ReaderPrefs = {
  theme: "light",
  fontScale: "md",
  measure: "comfortable",
  tocCollapsed: false,
};

const THEME_ALIASES: Record<string, ReaderTheme> = {
  light: "light",
  dark: "dark",
  paper: "paper",
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
