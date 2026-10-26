import type { Metadata } from "next";
import { Chapter1Experience } from "@/components/experience/Chapter1Experience";

export const metadata: Metadata = {
  title: "Chapter 1 experience — Resource Contention",
  description:
    "Operate a recommendations rollout: feature flag, 40-slot connection pool, Little’s Law, and decisions with consequences.",
  alternates: { canonical: "/system-design/experience/chapter-1" },
};

export default function Chapter1ExperiencePage() {
  return <Chapter1Experience />;
}
