import type { CodingCase } from "./coding";
import type { SignatureParam } from "./languages";
import type { RunResult, TestResult } from "./python-runner";

type RunInput = {
  source: string;
  entrypoint: string;
  cases: CodingCase[];
  params: SignatureParam[];
};

export function runTypeScript(input: RunInput, onReady: () => void) {
  return runWorker("/workers/sre-typescript.mjs", true, input, onReady, {
    load: "TypeScript could not load within 20 seconds. Check your connection and retry. Your draft is saved on this device.",
    run: "Execution stopped after 3 seconds. Check for an infinite loop or an unnecessarily expensive algorithm.",
    start:
      "TypeScript could not start. Check your connection to the compiler CDN and retry.",
  });
}

export function runGo(input: RunInput, onReady: () => void) {
  return runWorker("/workers/sre-go.js", false, input, onReady, {
    load: "The Go runtime could not load within 30 seconds. Check your connection and retry. Your draft is saved on this device.",
    run: "Execution stopped after 3 seconds. Check for an infinite loop or an unnecessarily expensive algorithm.",
    start: "Go could not start in this browser. Retry, or switch to TypeScript or Python.",
  });
}

function runWorker(
  url: string,
  module: boolean,
  input: RunInput,
  onReady: () => void,
  copy: { load: string; run: string; start: string },
) {
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let settled = false;
  let rejectRun: (error: Error) => void;
  const promise = new Promise<RunResult>((resolve, reject) => {
    rejectRun = reject;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      reject(new Error(message));
    };
    if (input.source.length > 50000) {
      fail("Keep your solution under 50,000 characters.");
      return;
    }
    try {
      worker = new Worker(url, module ? { type: "module" } : undefined);
    } catch {
      fail(copy.start);
      return;
    }
    timer = setTimeout(() => fail(copy.load), module ? 20000 : 30000);
    worker.onerror = () => fail(copy.start);
    worker.onmessage = ({ data }) => {
      if (settled) return;
      if (data.type === "ready") {
        clearTimeout(timer);
        onReady();
        timer = setTimeout(() => fail(copy.run), 3000);
      } else if (data.type === "error") fail(String(data.error));
      else if (data.type === "result") {
        if (
          !Array.isArray(data.results) ||
          data.results.length !== input.cases.length ||
          data.results.some(
            (row: TestResult, index: number) =>
              row.id !== input.cases[index].id ||
              typeof row.passed !== "boolean" ||
              typeof row.detail !== "string",
          )
        ) {
          fail(
            "The runner returned an invalid result. Retry with a regular function implementation.",
          );
          return;
        }
        settled = true;
        clearTimeout(timer);
        worker?.terminate();
        resolve({
          results: data.results,
          output: String(data.output ?? "").slice(0, 4000),
        });
      }
    };
    worker.postMessage(input);
  });
  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      rejectRun(new Error("Run cancelled. Your draft is preserved."));
    },
  };
}
