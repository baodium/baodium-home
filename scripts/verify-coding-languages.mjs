import assert from "node:assert/strict";
import ts from "typescript";
import { CODING_PROBLEMS } from "../src/lib/labs/coding.ts";
import {
  languageEntrypoint,
  languageSignature,
  starterFor,
} from "../src/lib/labs/languages.ts";
import { evaluate } from "../public/workers/evaluate-js.mjs";

const problem = CODING_PROBLEMS.find((item) => item.id === "status-counts");
assert.ok(problem, "status-counts exists");

for (const language of ["python", "typescript", "go"]) {
  const starter = starterFor(problem, language);
  const signature = languageSignature(problem, language);
  assert.ok(starter.length > 20, language);
  assert.ok(signature.includes("("), language);
}

assert.equal(languageEntrypoint(problem.entrypoint, "go"), "CountStatuses");
assert.equal(
  languageEntrypoint(problem.entrypoint, "typescript"),
  "countStatuses",
);
assert.match(starterFor(problem, "go"), /^package solution/);
assert.doesNotMatch(starterFor(problem, "go"), /^import /m);

const source = `function countStatuses(records: any): any {
  const counts: Record<string, number> = {};
  for (const row of records as Array<{ status: number }>) {
    const key = String(Math.floor(row.status / 100)) + "xx";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}`;
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
    strict: false,
  },
});
const result = evaluate(
  compiled.outputText,
  "countStatuses",
  [
    {
      id: "mixed",
      title: "Mixed responses",
      kwargs: { records: [{ status: 200 }, { status: 503 }] },
      expected: { "2xx": 1, "5xx": 1 },
    },
  ],
  [{ name: "records", hasDefault: false }],
);
assert.equal(result.results[0].passed, true, result.results[0].detail);
console.log(JSON.stringify({ ok: true, languages: ["python", "typescript", "go"] }));
