import { chapterOrdinal } from "@/lib/book/chapter-label";

/** Numbered chapters through this one stay in the free reading. */
export const FREE_THROUGH_CHAPTER = 7;

const FULL_EDITION_BACK_MATTER = new Set([
  "epilogue",
  "appendix-a",
  "appendix-b",
  "appendix-c",
  "worksheet",
  "glossary",
  "further-reading",
  "index",
  "about-the-author",
]);

/** True for chapter 8 and everything after it in the book. */
export function isFullEditionSlug(slug: string): boolean {
  const number = chapterOrdinal(slug);
  if (number !== null) return number > FREE_THROUGH_CHAPTER;
  return FULL_EDITION_BACK_MATTER.has(slug);
}
