import { book } from "@/data/writing";

export const READER_FEEDBACK_EMAIL = "baodium@gmail.com";

/** Amazon rate/review deep-link for “Enjoying this?” — not mailto. */
export function amazonReviewUrl(): string {
  return book.amazonReviewHref;
}

export function buildCorrectionMailto({
  chapterTitle,
  chapterSlug,
  sectionTitle,
  url,
}: {
  chapterTitle: string;
  chapterSlug: string;
  sectionTitle?: string;
  url: string;
}): string {
  const subject = `Correction — ${chapterTitle}`;
  const lines = [
    "Hi Baodium — I spotted something to correct:",
    "",
    `Chapter: ${chapterTitle} (${chapterSlug})`,
    sectionTitle ? `Section: ${sectionTitle}` : null,
    `URL: ${url}`,
    "",
    "What's wrong / suggested fix:",
    "",
  ].filter((line): line is string => line !== null);

  const params = new URLSearchParams({
    subject,
    body: lines.join("\n"),
  });
  return `mailto:${READER_FEEDBACK_EMAIL}?${params.toString()}`;
}

/** @deprecated Prefer amazonReviewUrl for enjoy + buildCorrectionMailto for corrections. */
export function buildReaderMailto({
  kind,
  chapterTitle,
  chapterSlug,
  sectionTitle,
  url,
}: {
  kind: "enjoy" | "correction";
  chapterTitle: string;
  chapterSlug: string;
  sectionTitle?: string;
  url: string;
}): string {
  if (kind === "enjoy") {
    return amazonReviewUrl();
  }
  return buildCorrectionMailto({
    chapterTitle,
    chapterSlug,
    sectionTitle,
    url,
  });
}
