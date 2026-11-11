import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabsShell } from "@/components/labs/LabsShell";
import { CodingWorkspace } from "@/components/labs/CodingWorkspace";
import { CODING_PROBLEMS, CODING_CATEGORIES } from "@/lib/labs/coding";
const ordered = CODING_CATEGORIES.flatMap((category) =>
  CODING_PROBLEMS.filter((problem) => problem.category === category),
);
export function generateStaticParams() {
  return ordered.map((problem) => ({ problem: problem.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ problem: string }>;
}): Promise<Metadata> {
  const { problem } = await params;
  const item = ordered.find((item) => item.id === problem);
  return {
    title: item ? `${item.title} · SRE coding` : "Exercise not found",
    description: item?.prompt,
    alternates: {
      canonical: `https://labs.baodium.com/sre-labs/coding/${problem}`,
    },
  };
}
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ problem: string }>;
}) {
  const { problem } = await params;
  const index = ordered.findIndex((item) => item.id === problem);
  if (index < 0) notFound();
  const next = ordered[index + 1];
  return (
    <LabsShell wide>
      <CodingWorkspace
        key={problem}
        problem={ordered[index]}
        next={next ? { id: next.id, title: next.title } : undefined}
      />
    </LabsShell>
  );
}
