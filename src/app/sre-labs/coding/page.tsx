import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { CodingRoadmap } from "@/components/labs/CodingRoadmap";
import { codingSummaries, CODING_CATEGORIES } from "@/lib/labs/coding";
import {
  LessonClose,
  LessonExercise,
  LessonOutcomes,
  LessonPlace,
  LessonTeaching,
} from "@/components/learning/LessonCraft";
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
        <LessonPlace course="SRE coding" total={24} minutes={15} />
        <h1>Twenty-four exercises on fleet health, signals, and delivery.</h1>
        <p>
          Five stages, one checkout’s worth of on-call code. You write each
          function in Go, TypeScript, or Python. The checks are the same in
          every language, and a stage moves only when the full suite passes.
          Fifteen minutes is a typical exercise. Some take longer.
        </p>
        <LessonOutcomes
          items={[
            "Choose a language and stay with it long enough to finish a stage.",
            "Read a contract, predict an edge the examples skip, and pass every check.",
            "Name the tradeoff the reference accepts before you open the next exercise.",
          ]}
        />
        <LessonTeaching
          paragraphs={[
            "The roadmap is the course. Fleet health comes first because a bad instance list poisons everything you would alert on. Signals turn those records into numbers. Automation and the reliability algorithms are the policies you would run unattended. Safe delivery is who sees a release, and when that stops.",
            "Progress is stored in this browser, separately for each language. Python keeps the keys that were already saved. Go and TypeScript start their own.",
          ]}
          concepts={[
            {
              name: "Stage",
              body: "A stage is a group of exercises on one kind of work. It moves when every exercise in it has a passing full suite in the language you selected.",
            },
            {
              name: "Full suite",
              body: "The full suite is every check, including the ones that are not examples. A green example run is feedback. It does not finish the exercise.",
            },
          ]}
        />
        <LessonExercise
          goal="Finish the stage you are in before you skip ahead. The first unfinished exercise is the one the roadmap opens."
          steps={[
            "Pick Go, TypeScript, or Python. You can switch later. The passes do not transfer.",
            "Open the exercise, name one input the examples do not show, and write the function.",
            "Run the examples, then the full suite. Read the check that failed before you change the code again.",
            "After a pass, answer the follow-up in a sentence, then take the next exercise in the stage.",
          ]}
        />
        <LessonClose
          takeaways={[
            "Five stages: fleet health, signals, automation, reliability algorithms, and safe delivery.",
            "Go, TypeScript, and Python share the checks. Their progress does not.",
            "A stage moves only when every exercise in it has a passing full suite.",
          ]}
          reflection={[
            "Which language are you trying to get faster in, and will you stay with it for a whole stage?",
            "What kind of edge do you usually miss: an empty input, a value on the threshold, or order?",
          ]}
          next={{
            href: "/sre-labs/coding/unhealthy-instances-v1",
            label: "Start with unhealthy instances",
            bridge:
              "The first exercise is a fleet check. An instance is unhealthy when a record says so. A missing field is not a verdict, and the answer keeps the order you first saw each instance.",
          }}
        />
      </header>
      <CodingRoadmap
        problems={codingSummaries()}
        categories={CODING_CATEGORIES}
      />
    </LabsShell>
  );
}
