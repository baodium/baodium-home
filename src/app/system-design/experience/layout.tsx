import type { Metadata } from "next";
import { ExperienceShell } from "@/components/experience/ExperienceShell";

export const metadata: Metadata = {
  title: "Operate the incidents",
  description:
    "Guided production scenarios from Practical System Design. feature flags, connection pools, and decisions with consequences.",
  alternates: { canonical: "/system-design/experience" },
};

export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  return <ExperienceShell>{children}</ExperienceShell>;
}
