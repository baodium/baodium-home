import data from "./coding-problems.json";
export type CodingCase = {
  id: string;
  title: string;
  kwargs: Record<string, unknown>;
  expected: unknown;
  example: boolean;
};
export type CodingProblem = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  minutes: number;
  format: string;
  prompt: string;
  signature: string;
  entrypoint: string;
  starter: string;
  constraints: string[];
  hints: string[];
  explanation: string;
  complexity: string;
  followUp: string;
  solution: string;
  cases: CodingCase[];
  origin?: string;
};
export type ProblemSummary = Pick<
  CodingProblem,
  "id" | "title" | "category" | "difficulty" | "minutes" | "format"
>;
export const CODING_PROBLEMS = data as unknown as CodingProblem[];
export const CODING_CATEGORIES = [
  "Fleet health",
  "Signals",
  "Automation",
  "Reliability algorithms",
  "Safe delivery",
];
export function codingSummaries(): ProblemSummary[] {
  return CODING_CATEGORIES.flatMap((category) =>
    CODING_PROBLEMS.filter((problem) => problem.category === category),
  ).map(({ id, title, category, difficulty, minutes, format }) => ({
    id,
    title,
    category,
    difficulty,
    minutes,
    format,
  }));
}
