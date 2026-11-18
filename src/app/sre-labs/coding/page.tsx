import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { CodingRoadmap } from "@/components/labs/CodingRoadmap";
import { codingSummaries, CODING_CATEGORIES } from "@/lib/labs/coding";
export const metadata: Metadata = {
  title: "SRE coding roadmap",
  description:
    "SRE functions in Go, TypeScript, or Python. The same checks run in the browser, and a stage moves only when the full suite passes.",
  alternates: { canonical: "https://labs.baodium.com/sre-labs/coding" },
};
export default function CodingPage() {
  return (
    <LabsShell>
      <header className="coding-roadmap-hero">
        <Link href="/labs" className="labs-back">
          ← All learning paths
        </Link>
        <h1>Functions from fleet health to a release.</h1>
        <p>
          Go, TypeScript, or Python. The checks are the same in each language,
          and a stage moves only when every exercise in it has a passing full
          suite. Progress stays in this browser, separately for each language.
        </p>
        <p className="lesson-next">
          <Link href="/sre-labs/coding/unhealthy-instances-v1">
            Start with unhealthy instances
          </Link>
        </p>
      </header>
      <CodingRoadmap
        problems={codingSummaries()}
        categories={CODING_CATEGORIES}
      />
    </LabsShell>
  );
}
