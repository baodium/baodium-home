import type { Metadata } from "next";
import { ExperienceHub } from "@/components/experience/ExperienceHub";

export const metadata: Metadata = {
  title: "Chapter experiences",
  description:
    "Each chapter of Practical System Design becomes a production scenario you run: guided walkthrough, then open practice.",
  alternates: { canonical: "/system-design/experience" },
};

export default function ExperienceHubPage() {
  return <ExperienceHub />;
}
