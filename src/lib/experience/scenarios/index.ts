import { chapter1Scenario } from "@/lib/experience/scenarios/chapter-1";
import type { ChapterScenario, ExperienceChapterMeta } from "@/lib/experience/scenarios/types";

const soon = (
  partial: Omit<ExperienceChapterMeta, "status" | "durationMin"> & { durationMin?: number },
): ExperienceChapterMeta => ({
  status: "soon",
  durationMin: partial.durationMin ?? 10,
  ...partial,
});

export const experienceChapters: ExperienceChapterMeta[] = [
  chapter1Scenario.meta,
  soon({
    id: "chapter-2",
    slug: "chapter-2",
    number: 2,
    title: "Requests, Latency, Throughput",
    subtitle: "Model arrival rate before you size the pool",
    bookHref: "/system-design/chapter-2",
  }),
  soon({
    id: "chapter-3",
    slug: "chapter-3",
    number: 3,
    title: "Backpressure & Queues",
    subtitle: "What waiting looks like across service boundaries",
    bookHref: "/system-design/chapter-3",
  }),
  soon({
    id: "chapter-4",
    slug: "chapter-4",
    number: 4,
    title: "Cascading Failure",
    subtitle: "Retries that amplify a saturated dependency",
    bookHref: "/system-design/chapter-4",
  }),
];

export function getScenario(slug: string): ChapterScenario | null {
  if (slug === "chapter-1") return chapter1Scenario;
  return null;
}

export { chapter1Scenario };
