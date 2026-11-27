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
          ← Labs
        </Link>
        <h1>Write reliability functions in Go, TypeScript, or Python.</h1>
        <p>
          Each exercise is one function, such as a retry delay, a token bucket,
          or a deploy check, with tests that run in your browser. The tests are
          the same in each language. A stage is complete when every exercise in
          it passes its full suite, and progress is saved in this browser for
          each language separately.
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
