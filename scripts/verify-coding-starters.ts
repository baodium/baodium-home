import { CODING_PROBLEMS } from "../src/lib/labs/coding";
import { languageSignature, starterFor } from "../src/lib/labs/languages";

const tracks = CODING_PROBLEMS.filter(
  (problem) => problem.format === "complete" || problem.format === "debug",
);

for (const problem of tracks) {
  for (const language of ["typescript", "go"] as const) {
    const source = starterFor(problem, language);
    if (source.includes("The Python draft")) {
      throw new Error(`${problem.id} ${language} still points at Python`);
    }
    if (/return (\[\]|null|nil)\s*;?\s*\n?\s*\}/.test(source) && !source.includes("TODO 1")) {
      throw new Error(`${problem.id} ${language} looks like an empty zero stub`);
    }
    if (problem.format === "complete" && !source.includes("TODO")) {
      throw new Error(`${problem.id} ${language} complete draft lacks TODOs`);
    }
    if (
      problem.format === "debug" &&
      !/Existing implementation|existing check|reports healthy/i.test(source)
    ) {
      throw new Error(`${problem.id} ${language} debug draft lacks buggy copy`);
    }
    if (source.includes("map[string]any") && problem.entrypoint.includes("unhealthy")) {
      throw new Error(`${problem.id} ${language} still uses map[string]any for heartbeats`);
    }
    if (source.includes("map[string]any") && problem.entrypoint.includes("audit")) {
      throw new Error(`${problem.id} ${language} still uses map[string]any for deployments`);
    }
  }
}

const dependency = CODING_PROBLEMS.find((item) => item.id === "dependency-order");
if (!dependency) throw new Error("missing dependency-order");
if (!languageSignature(dependency, "go").includes("map[string][]string")) {
  throw new Error("dependency-order should use map[string][]string");
}

console.log(
  `Authored ${tracks.length} complete/debug tracks in Go and TypeScript; typed dependency maps look honest.`,
);
