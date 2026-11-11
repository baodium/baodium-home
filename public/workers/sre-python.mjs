// Practice execution stays in a disposable browser worker, never a Vercel process.
// Harness adapted from Baodium Interview Coach: fresh arguments and input preservation.
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";
self.onmessage = async ({ data }) => {
  try {
    const py = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/",
    });
    self.postMessage({ type: "ready" });
    py.globals.set("source_json", JSON.stringify(data.source));
    py.globals.set("cases_json", JSON.stringify(data.cases));
    py.globals.set("entrypoint_json", JSON.stringify(data.entrypoint));
    const result = py.runPython(`
import json, copy, contextlib

class BoundedOutput:
    def __init__(self):
        self.text = ""
    def write(self, value):
        self.text += value[:max(0, 4000 - len(self.text))]
        return len(value)
    def flush(self):
        pass

output = BoundedOutput()
namespace = {"__name__": "solution"}
results = []
with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
    exec(json.loads(source_json), namespace)
    function = namespace.get(json.loads(entrypoint_json))
    if not callable(function):
        raise ValueError("Define the requested function with the exact name in the signature.")
    for case in json.loads(cases_json):
        arguments = copy.deepcopy(case["kwargs"])
        original = copy.deepcopy(arguments)
        try:
            actual = function(**arguments)
            preserved = arguments == original
            passed = actual == case["expected"] and preserved
            detail = "Passed" if passed else "Input was modified" if not preserved else "Expected " + repr(case["expected"])[:350] + "; received " + repr(actual)[:350]
            results.append({"id": case["id"], "title": case["title"], "passed": bool(passed), "detail": detail})
        except Exception as error:
            results.append({"id": case["id"], "title": case["title"], "passed": False, "detail": (type(error).__name__ + ": " + str(error))[:700]})
json.dumps({"results": results, "output": output.text})
`);
    self.postMessage({ type: "result", ...JSON.parse(result) });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: String(error.message ?? error).slice(-2000),
    });
  }
};
