import type { Metadata } from "next";
import { Chapter3Experience } from "@/components/experience/Chapter3Experience";

export const metadata: Metadata = {
  title: "Chapter 3 experience · State, Identity, and the Cost of Uncertainty",
  description:
    "Operate a late payment: one client timeout, one retry, and a charge that keeps its identity.",
  alternates: { canonical: "/system-design/experience/chapter-3" },
};

export default function Chapter3ExperiencePage() {
  return <Chapter3Experience />;
}
