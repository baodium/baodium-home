/** Human-facing labels for TOC / flip chrome (chapter numbers, front/back matter). */

export function chapterOrdinal(slug: string): number | null {
  const match = /^chapter-(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

export function chapterNumberLabel(slug: string): string {
  const n = chapterOrdinal(slug);
  if (n !== null) return String(n).padStart(2, "0");

  if (slug === "preface") return "Pr";
  if (slug === "acknowledgements") return "Ack";
  if (slug === "epilogue") return "Ep";
  if (slug.startsWith("appendix-")) return slug.slice("appendix-".length).toUpperCase();
  if (slug === "worksheet") return "Ws";
  if (slug === "glossary") return "Gl";
  if (slug === "further-reading") return "Fr";
  if (slug === "index") return "Ix";
  if (slug === "about-the-author") return "Au";
  return "·";
}

export function chapterKicker(slug: string, title: string): string {
  const n = chapterOrdinal(slug);
  if (n !== null) return `Chapter ${n}`;
  if (slug.startsWith("appendix-")) {
    const letter = slug.slice("appendix-".length).toUpperCase();
    return `Appendix ${letter}`;
  }
  return title;
}

export function flipDirectionLabel(
  kind: "prev" | "next",
  slug: string,
): string {
  const n = chapterOrdinal(slug);
  if (n !== null) return kind === "prev" ? `Flip to Ch. ${n}` : `Flip to Ch. ${n}`;
  return kind === "prev" ? "Previous page" : "Next page";
}
