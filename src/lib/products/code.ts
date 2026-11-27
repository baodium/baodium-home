const IMPORT_LINE = /^\s*import\s[^\n]*$/gm;
const EXPORT_DECL = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm;

export function moduleBody(source: string, exportNames: string[]) {
  const body = source.replace(IMPORT_LINE, "").replace(EXPORT_DECL, "");
  return `"use strict";\n${body}\nreturn { ${exportNames.join(", ")} };`;
}

export class CompileError extends Error {}

export function compileModule<T>(source: string, exportNames: string[]): T {
  let mod: Record<string, unknown>;
  try {
    mod = new Function(moduleBody(source, exportNames))();
  } catch (error) {
    throw new CompileError(error instanceof Error ? error.message : String(error));
  }
  for (const name of exportNames) {
    if (typeof mod[name] !== "function") {
      throw new CompileError(`${name} must be exported as a function.`);
    }
  }
  return mod as T;
}

export type TestRow = { title: string; passed: boolean; detail: string };

export type CheckRun = {
  compileError?: string;
  results: TestRow[];
  replay?: { outputs: unknown[]; errors: string[] };
};

export function runChecks(input: {
  source: string;
  exportNames: string[];
  testSource: string;
  replay?: { fn: string; inputs: unknown[][] };
}): Promise<CheckRun> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker("/workers/product-checks.js");
    } catch {
      resolve({ compileError: "This browser could not start the test runner.", results: [] });
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        compileError:
          "The tests stopped after 3 seconds. Look for a loop that never ends.",
        results: [],
      });
    }, 3000);
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(data as CheckRun);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ compileError: event.message || "The test runner failed.", results: [] });
    };
    worker.postMessage(input);
  });
}
