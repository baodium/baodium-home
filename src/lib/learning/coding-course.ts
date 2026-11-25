import type { LessonConcept } from "@/components/learning/LessonCraft";
import type { CodingProblem } from "@/lib/labs/coding";
import { CODING_CATEGORIES, codingSummaries } from "@/lib/labs/coding";

type Stage = {
  paragraphs: string[];
  concepts: LessonConcept[];
};

const STAGES: Record<string, Stage> = {
  "Fleet health": {
    paragraphs: [
      "A fleet check applies a policy to records you did not write. Mark an instance unhealthy only when a field or rule says so. Skip a missing field instead of inventing a verdict, and keep output order as the first time you saw each instance.",
      "The same checks run in Go, TypeScript, and Python. A stage advances only when the full suite passes in the language you are writing. Examples are a hint; completion still requires the full suite.",
    ],
    concepts: [
      {
        name: "Policy",
        body: "Apply a policy to one record without looking at the others. CPU, a failed heartbeat, and an explicit unhealthy flag are separate policies. Any one of them is enough.",
      },
      {
        name: "First seen",
        body: "First seen means the first time the instance appears in the input, even if that first record was healthy. The output keeps that order and drops the healthy ones.",
      },
    ],
  },
  Signals: {
    paragraphs: [
      "These exercises turn raw lines, counters, and windows into values you could put on a chart or a page. Compare each number or event with the previous one. The hard part is usually the edge the examples skip: an empty window, a repeated key, or a line almost in the expected format.",
      "Write the function so the full suite passes. Then look at the reference and name the cost you accepted. Opening the reference does not record a pass.",
    ],
    concepts: [
      {
        name: "Window",
        body: "A window is the slice of events you are judging. Without a window, a rate has no meaning. The exercise names which events belong in the slice.",
      },
      {
        name: "Edge",
        body: "An edge is an input the happy examples skip. Empty lists, ties, and values sitting on the threshold are where these functions usually go wrong.",
      },
    ],
  },
  Automation: {
    paragraphs: [
      "These functions run when you are not watching. Each one leaves a result you can check later, and it returns a refusal when the input is not the shape you required.",
      "Read the contract before you write the loop. If the suite fails, the failing check is the input you did not picture. Name it, then change the code.",
    ],
    concepts: [
      {
        name: "Contract",
        body: "The contract is the signature plus the acceptance criteria. If your function does something sensible that the contract did not ask for, the suite will still fail.",
      },
      {
        name: "Refusal",
        body: "A refusal is a deliberate result for input you will not act on. Guessing a default is how an unattended job makes a quiet mess.",
      },
    ],
  },
  "Reliability algorithms": {
    paragraphs: [
      "Retries, limits, and deadlines are policies for a request that does not fit. The interesting case is the request already in flight, or the one that arrives after you said you were full.",
      "These functions stay small because the policy is small. The suite blocks a clever version that passes the examples and breaks the request you forgot.",
    ],
    concepts: [
      {
        name: "In flight",
        body: "Work in flight has already left. A retry or a timeout policy has to say what happens to that work, not only to the next caller.",
      },
      {
        name: "Limit",
        body: "A limit is the number you will not pass. When the next request would pass it, return an explicit answer instead of a slower success.",
      },
    ],
  },
  "Safe delivery": {
    paragraphs: [
      "Delivery functions set who sees a release and when that exposure stops. The fraction matters. A check that treats every host as the whole fleet will pass a story and fail the suite.",
      "After the suite passes, answer the follow-up in a sentence before you open the next exercise. That sentence is the production version of the same function.",
    ],
    concepts: [
      {
        name: "Fraction",
        body: "A fraction is the share of traffic or hosts the decision applies to. Five percent and one hundred percent are different answers, even when the release is the same.",
      },
      {
        name: "Stop",
        body: "A stop condition is the point where the function withholds the release or sends traffic back. If you cannot name it from the inputs, the function is not finished.",
      },
    ],
  },
};

export function codingLesson(problem: CodingProblem, nextTitle?: string) {
  const ordered = codingSummaries();
  const index = ordered.findIndex((item) => item.id === problem.id);
  const stageProblems = ordered.filter((item) => item.category === problem.category);
  const stageIndex = CODING_CATEGORIES.indexOf(
    problem.category as (typeof CODING_CATEGORIES)[number],
  );
  const placeInStage = stageProblems.findIndex((item) => item.id === problem.id);
  const stage = STAGES[problem.category] ?? STAGES["Fleet health"]!;
  return {
    course: "SRE coding",
    index: index + 1,
    total: ordered.length,
    minutes: problem.minutes,
    stageLabel: `Stage ${stageIndex + 1} of ${CODING_CATEGORIES.length}, ${problem.category}, exercise ${placeInStage + 1} of ${stageProblems.length}`,
    outcomes: [
      `State what ${problem.title.replace(/ · implement| · fix/g, "")} has to return, in one sentence, before you write it.`,
      "Pass the full suite in the language you chose. The examples are not enough.",
      "Name the cost or the edge the reference accepts, after you have a passing suite.",
    ],
    paragraphs: stage.paragraphs,
    concepts: stage.concepts,
    goal: problem.prompt,
    steps: [
      "Read the signature and the two examples, and write down one input they do not show.",
      "Choose Go, TypeScript, or Python. The checks are the same in each language, and progress is kept per language on this device.",
      "Run the examples. When those pass, run the full suite. The exercise counts only when every check passes.",
      "Open the reference after you pass, or when you are stuck, and write down one difference.",
    ],
    takeaways: [
      problem.explanation,
      problem.complexity,
    ],
    reflection: [
      problem.followUp,
      "Which check failed for a reason the examples did not show?",
      "What would you change if this function ran every minute without you watching?",
    ],
    next: nextTitle
      ? {
          href: undefined as string | undefined,
          label: nextTitle,
          bridge: `${nextTitle} is next. Take the edge this suite forced you to name.`,
        }
      : {
          href: "/sre-labs/observability" as string | undefined,
          label: "The hands-on observability course",
          bridge:
            "The twenty-four functions are done. The hands-on course runs the same ideas on Express, FastAPI, Prometheus, Grafana, and Jaeger, and the checks there read the running tools.",
        },
  };
}
