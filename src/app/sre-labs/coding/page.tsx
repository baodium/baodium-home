import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { CodingRoadmap } from "@/components/labs/CodingRoadmap";
import { codingSummaries, CODING_CATEGORIES } from "@/lib/labs/coding";
export const metadata: Metadata = {
  title: "SRE coding roadmap",
  description:
    "24 practical Python exercises for SREs: log analysis, retries, rate limits, deployment checks and automation. Run real tests in your browser.",
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
        <h1>
          Code for the work
          <br />
          <em>you’ll actually do.</em>
        </h1>
        <p>
          Build, complete and debug practical Python automation. Start with
          fleet health, build confidence with signals and policies, then tackle
          stateful reliability algorithms.
        </p>
        <div className="coding-path-note">
          <strong>How to practice</strong>
          <span>
            Read the contract → predict an edge case → implement → run all
            checks → explain your tradeoffs.
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
