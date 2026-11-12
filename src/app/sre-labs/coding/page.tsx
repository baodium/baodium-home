import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { CodingRoadmap } from "@/components/labs/CodingRoadmap";
import { codingSummaries, CODING_CATEGORIES } from "@/lib/labs/coding";
export const metadata: Metadata = {
  title: "SRE coding roadmap",
  description:
    "Twenty-four SRE exercises in Go, TypeScript, or Python. The same checks run in the browser, and a stage moves only when the full suite passes.",
  alternates: { canonical: "https://labs.baodium.com/sre-labs/coding" },
};
export default function CodingPage() {
  return (
    <LabsShell>
      <header className="coding-roadmap-hero">
        <Link href="/labs" className="labs-back">
          ← All learning paths
        </Link>
        <p className="labs-kicker">SRE path / Coding practice</p>
        <h1>Twenty-four exercises for on-call code.</h1>
        <p>
          The set covers fleet health, signals, automation, and delivery. Write
          each function in Go, TypeScript, or Python. The checks are the same
          in every language, and a stage moves only when the full suite passes.
        </p>
        <div className="coding-path-note">
          <strong>How to practice</strong>
          <span>
            Read the contract, predict one edge case, then run the full suite
            and write down the tradeoff you accepted.
          </span>
        </div>
      </header>
      <CodingRoadmap
        problems={codingSummaries()}
        categories={CODING_CATEGORIES}
      />
    </LabsShell>
  );
}
