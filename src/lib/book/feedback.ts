export const READER_FEEDBACK_EMAIL = "baodium@gmail.com";

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
  const subject =
    kind === "enjoy"
      ? `Book feedback — ${chapterTitle}`
      : `Correction — ${chapterTitle}`;

  const lines = [
    kind === "enjoy"
      ? "Hi Baodium — a quick note while reading:"
      : "Hi Baodium — I spotted something to correct:",
    "",
    `Chapter: ${chapterTitle} (${chapterSlug})`,
    sectionTitle ? `Section: ${sectionTitle}` : null,
    `URL: ${url}`,
    "",
    kind === "enjoy" ? "What I liked / what could be better:" : "What's wrong / suggested fix:",
    "",
  ].filter((line): line is string => line !== null);

  const params = new URLSearchParams({
    subject,
    body: lines.join("\n"),
  });
  return `mailto:${READER_FEEDBACK_EMAIL}?${params.toString()}`;
}
