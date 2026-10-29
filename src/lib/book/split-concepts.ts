import type { InteractiveConceptDef } from "@/lib/learning/interactive-concepts";

export type ChapterSegment =
  | { type: "html"; html: string }
  | { type: "concept"; concept: InteractiveConceptDef };

/**
 * Split chapter HTML so InteractiveConcept cards can sit after a section
 * without mutating the generated manuscript files.
 */
export function splitHtmlAroundConcepts(
  html: string,
  concepts: InteractiveConceptDef[],
): ChapterSegment[] {
  if (!concepts.length) return [{ type: "html", html }];

  type Marker = { index: number; concept: InteractiveConceptDef };
  const markers: Marker[] = [];

  for (const concept of concepts) {
    const headingRe = new RegExp(
      `<h([23])\\b[^>]*\\bid=["']${escapeRegExp(concept.afterSectionId)}["'][^>]*>`,
      "i",
    );
    const match = headingRe.exec(html);
    if (!match || match.index == null) continue;

    const afterHeading = match.index + match[0].length;
    const nextH2 = html.slice(afterHeading).search(/<h2\b/i);
    const insertAt = nextH2 === -1 ? html.length : afterHeading + nextH2;
    markers.push({ index: insertAt, concept });
  }

  if (!markers.length) return [{ type: "html", html }];

  markers.sort((a, b) => a.index - b.index || a.concept.id.localeCompare(b.concept.id));

  const segments: ChapterSegment[] = [];
  let cursor = 0;
  for (const marker of markers) {
    if (marker.index < cursor) continue;
    if (marker.index > cursor) {
      segments.push({ type: "html", html: html.slice(cursor, marker.index) });
    }
    segments.push({ type: "concept", concept: marker.concept });
    cursor = marker.index;
  }
  if (cursor < html.length) {
    segments.push({ type: "html", html: html.slice(cursor) });
  }
  return segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
