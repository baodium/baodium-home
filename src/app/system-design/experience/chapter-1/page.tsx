import type { Metadata } from "next";
import { ChapterExperience } from "@/components/experience/chapter/ChapterExperience";

export const metadata: Metadata = {
  title: "Chapter 1 experience · Resource Contention",
  description:
    "Follow the product page into the recommendation call, the flag, and a full connection pool.",
  alternates: { canonical: "/system-design/experience/chapter-1" },
};

export default function Chapter1ExperiencePage() {
  return (
    <ChapterExperience
      killercodaUrl={(process.env.NEXT_PUBLIC_KILLERCODA_URL_CH01 ?? "").trim()}
      runnerUrl={(process.env.NEXT_PUBLIC_LAB_RUNNER_URL ?? "").trim()}
      labUrl={(process.env.NEXT_PUBLIC_LAB_URL_CH01 ?? "").trim()}
    />
  );
}
