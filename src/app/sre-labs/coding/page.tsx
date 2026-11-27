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
          Each exercise is one function from the tooling around a production
          service, such as the filter behind a fleet health page, a latency
          percentile, a retry schedule, or the check that stops an unsafe
          deploy. The same tests run in your browser in each language, and an
          exercise counts once its full suite passes.
        </p>
      </header>
      <CodingRoadmap
        problems={codingSummaries()}
        categories={CODING_CATEGORIES}
      />
    </LabsShell>
  );
}
