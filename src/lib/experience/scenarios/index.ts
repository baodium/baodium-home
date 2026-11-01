import { chapter1Scenario } from "@/lib/experience/scenarios/chapter-1";
import { chapter3Meta } from "@/lib/experience/scenarios/chapter-3";
import { getShortLab } from "@/lib/experience/short-labs";
import type {
  ChapterScenario,
  ExperienceChapterMeta,
} from "@/lib/experience/scenarios/types";
import { labChapters } from "@/lib/learning/registry";

/** Lab chapter cards — titles synced from the shared learning registry. */
export const experienceChapters: ExperienceChapterMeta[] = labChapters().map((ch) => {
  if (ch.slug === "chapter-1") return chapter1Scenario.meta;
  if (ch.slug === "chapter-3") return chapter3Meta;
  return {
    id: ch.id,
    slug: ch.slug,
    number: ch.number,
    /** Prefer short lab title; never invent topics that disagree with the book. */
    title: ch.title,
    subtitle: ch.labSubtitle,
    bookHref: ch.bookHref,
    status: ch.labStatus === "ready" ? "ready" : "soon",
    durationMin: getShortLab(ch.slug)?.durationMin ?? 10,
  };
});

export function getScenario(slug: string): ChapterScenario | null {
  if (slug === "chapter-1") return chapter1Scenario;
  return null;
}

export { chapter1Scenario };
