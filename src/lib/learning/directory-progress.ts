import { CHAPTERS } from "@/lib/learning/registry";
import { READER_STORAGE_KEY, loadReaderPrefs } from "@/lib/book/reader-styles";

const KEY = "baodium-learning-directory-v1";

export type DirectoryMark = {
  opened: boolean;
  finished: boolean;
  updatedAt: number;
};

const EMPTY_MARKS: Record<string, DirectoryMark> = {};
let marksRaw: string | null = null;
let marksCache: Record<string, DirectoryMark> = EMPTY_MARKS;

const EMPTY_READING: Record<string, boolean> = {};
let readingRaw: string | null = null;
let readingCache: Record<string, boolean> = EMPTY_READING;

export function loadDirectoryMarks(): Record<string, DirectoryMark> {
  if (typeof window === "undefined") return EMPTY_MARKS;
  const raw = localStorage.getItem(KEY);
  if (raw === marksRaw) return marksCache;
  marksRaw = raw;
  if (!raw) {
    marksCache = EMPTY_MARKS;
    return marksCache;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, DirectoryMark>;
    marksCache = parsed && typeof parsed === "object" ? parsed : EMPTY_MARKS;
  } catch {
    marksCache = EMPTY_MARKS;
  }
  return marksCache;
}

export function directoryMarksServerSnapshot() {
  return EMPTY_MARKS;
}

export function subscribeDirectory(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

export function chapterReading(): Record<string, boolean> {
  if (typeof window === "undefined") return EMPTY_READING;
  const raw = localStorage.getItem(READER_STORAGE_KEY);
  if (raw === readingRaw) return readingCache;
  readingRaw = raw;
  const prefs = loadReaderPrefs();
  const next: Record<string, boolean> = {};
  for (const chapter of CHAPTERS) {
    const depth = prefs.progressBySlug?.[chapter.slug] ?? 0;
    next[chapter.slug] = depth > 0.02 || prefs.lastSlug === chapter.slug;
  }
  readingCache = next;
  return readingCache;
}

export function chapterReadingServerSnapshot() {
  return EMPTY_READING;
}

function write(next: Record<string, DirectoryMark>) {
  const raw = JSON.stringify(next);
  localStorage.setItem(KEY, raw);
  marksRaw = raw;
  marksCache = next;
}

export function markChapterOpened(slug: string) {
  if (typeof window === "undefined") return;
  const all = { ...loadDirectoryMarks() };
  const prev = all[slug];
  if (prev?.opened) return;
  all[slug] = { opened: true, finished: prev?.finished ?? false, updatedAt: Date.now() };
  write(all);
}

export function markChapterFinished(slug: string) {
  if (typeof window === "undefined") return;
  const all = { ...loadDirectoryMarks() };
  if (all[slug]?.finished) return;
  all[slug] = { opened: true, finished: true, updatedAt: Date.now() };
  write(all);
}
