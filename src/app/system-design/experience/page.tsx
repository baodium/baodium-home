import type { Metadata } from "next";
import { ExperienceHub } from "@/components/experience/ExperienceHub";

export const metadata: Metadata = {
  title: "Operate the incidents",
  description:
    "Each chapter of Practical System Design becomes a production scenario you operate — guided walkthrough plus sandbox, with teaching overlays.",
  alternates: { canonical: "/system-design/experience" },
};

export default function ExperienceHubPage() {
  return <ExperienceHub />;
}
