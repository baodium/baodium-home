import type { CodingCase, CodingProblem } from "./coding";

/** Hint steps are always concept → approach → partial sketch. */
export const HINT_STEPS = [
  { id: "concept", label: "First hint" },
  { id: "approach", label: "Second hint" },
  { id: "sketch", label: "A partial sketch" },
] as const;

export type HintStepId = (typeof HINT_STEPS)[number]["id"];

export function framingFor(problem: CodingProblem) {
  return {
    situation:
      problem.situation ??
      "This check runs on production-shaped records. A wrong answer becomes a wrong page, alert, or rollout decision.",
    guarantee:
      problem.guarantee ??
      "Return exactly what the signature and acceptance criteria require. Sensible extras still fail the suite.",
    edges:
      problem.edges?.length
        ? problem.edges
        : problem.constraints.slice(0, 3),
  };
}

export function progressiveHints(problem: CodingProblem) {
  const texts = problem.hints.slice(0, HINT_STEPS.length);
  while (texts.length < HINT_STEPS.length) {
    texts.push(
      texts.length === 0
        ? "Name the inputs and the single value the function must return before you write a loop."
        : texts.length === 1
          ? "Walk one example by hand. Write the intermediate values you need, then code that shape."
          : "Sketch the loop or recursion in comments. Fill one branch, run the examples, then finish the edges.",
    );
  }
  return HINT_STEPS.map((step, index) => ({
    ...step,
    text: texts[index]!,
  }));
}

/** Teaching line under Expected/received for a failed check. */
export function failureCoach(
  problem: CodingProblem,
  test: Pick<CodingCase, "id" | "title"> & { detail: string },
): string {
  const authored = problem.cases.find((item) => item.id === test.id)?.coach;
  if (authored) return authored;

  const detail = test.detail.toLowerCase();
  if (detail.includes("input was modified")) {
    return "Build a new result. Do not change the caller's list or map in place.";
  }
  if (detail.startsWith("typeerror") || detail.startsWith("nameerror") || detail.startsWith("error:")) {
    return "The runtime stopped before a value comparison. Read the error, then re-check the signature and return type.";
  }
  if (detail.includes("none") || detail.includes("null") || detail.includes("nil")) {
    return "A missing value is part of the contract. Confirm when the function must return empty, None/null, or a refusal.";
  }

  const title = test.title.toLowerCase();
  if (title.includes("empty")) {
    return "Empty input is a first-class case. Decide the empty return before the main loop.";
  }
  if (title.includes("boundary") || title.includes("threshold")) {
    return "Boundaries usually use ≥ or ≤ on purpose. Compare your operator to the acceptance criteria.";
  }
  if (title.includes("order") || title.includes("first") || title.includes("duplicate")) {
    return "Order is part of the answer. Track first-seen position separately from the unhealthy or selected set.";
  }
  if (title.includes("missing")) {
    return "A missing optional field is not the same as a failing value. Use the defaults written in the criteria.";
  }
  if (title.includes("cycle")) {
    return "If you cannot emit every service, the graph still has a cycle. Return the refusal the contract names.";
  }

  if (problem.failureGuide) return problem.failureGuide;

  return `Compare expected and received for “${test.title}”. Name which acceptance rule broke, then change only that part of the function.`;
}

export function workedPattern(problem: CodingProblem) {
  return {
    why: problem.explanation,
    cost: problem.complexity,
  };
}
