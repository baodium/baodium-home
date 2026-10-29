import type { ReactNode } from "react";
import { LearningShell } from "@/components/learning/LearningShell";

/** Labs chrome — thin wrapper around shared LearningShell. */
export function ExperienceShell({
  children,
  kicker = "Practical System Design",
  title,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
}) {
  return (
    <LearningShell
      surface="lab"
      kicker={kicker}
      title={title}
      bookHref="/system-design"
    >
      {children}
    </LearningShell>
  );
}
