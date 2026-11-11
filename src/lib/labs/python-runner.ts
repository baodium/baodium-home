import type { CodingCase } from "./coding";
export type TestResult = {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
};
export type RunResult = { results: TestResult[]; output: string };
export function runPython(
  input: { source: string; entrypoint: string; cases: CodingCase[] },
  onReady: () => void,
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
      worker = new Worker("/workers/sre-python.mjs", { type: "module" });
    } catch {
      fail(
        "Python workers are unavailable in this browser. Download your solution and try a current browser.",
      );
      return;
    }
    timer = setTimeout(
      () =>
        fail(
          "Python could not load within 45 seconds. Check your connection and retry; your draft is saved on this device.",
        ),
      45000,
    );
    worker.onerror = () =>
      fail(
        "Python could not start. Check your connection to the runtime CDN and retry.",
      );
    worker.onmessage = ({ data }) => {
      if (settled) return;
      if (data.type === "ready") {
        clearTimeout(timer);
        onReady();
        timer = setTimeout(
          () =>
            fail(
              "Execution stopped after 3 seconds. Check for an infinite loop or an unnecessarily expensive algorithm.",
            ),
          3000,
        );
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
