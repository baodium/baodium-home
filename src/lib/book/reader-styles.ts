import { readStored, writeStored } from "@/lib/storage";
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
    const raw = readStored(READER_STORAGE_KEY);
    if (!raw) return defaultReaderPrefs;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs> & { theme?: string };
    const theme = typeof parsed.theme === "string" && Object.hasOwn(THEME_ALIASES, parsed.theme)
      ? THEME_ALIASES[parsed.theme] : defaultReaderPrefs.theme;
    return {
      ...defaultReaderPrefs,
      theme,
      fontScale: ["sm", "md", "lg"].includes(parsed.fontScale ?? "") ? parsed.fontScale! : "md",
      measure: ["narrow", "comfortable", "wide"].includes(parsed.measure ?? "") ? parsed.measure! : "comfortable",
      lastSlug: typeof parsed.lastSlug === "string" ? parsed.lastSlug : undefined,
      scrollTops: numericMap(parsed.scrollTops, Infinity),
      progressBySlug: numericMap(parsed.progressBySlug, 1),
      tocCollapsed: parsed.tocCollapsed === true,
      feedbackDismissedAt: finiteNumber(parsed.feedbackDismissedAt),
      flipHintDismissedAt: finiteNumber(parsed.flipHintDismissedAt),
    };
  } catch {
    return defaultReaderPrefs;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs) {
  if (typeof window === "undefined") return;
  writeStored(READER_STORAGE_KEY, JSON.stringify(prefs));
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function numericMap(value: unknown, max: number): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, n]) => finiteNumber(n) !== undefined && n <= max));
}
