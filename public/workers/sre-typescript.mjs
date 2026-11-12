import ts from "https://cdn.jsdelivr.net/npm/typescript@5.7.2/+esm";
import { evaluate } from "./evaluate-js.mjs";

self.onmessage = ({ data }) => {
  try {
    if (typeof data.source !== "string" || data.source.length > 50000) {
      throw new Error("Keep the solution under 50,000 characters.");
    }
    const compiled = ts.transpileModule(data.source, {
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
        strict: false,
      },
    });
    const diagnostic = compiled.diagnostics?.[0];
    if (diagnostic) {
      const text =
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      throw new Error(text.slice(0, 700));
    }
    self.postMessage({ type: "ready" });
    const result = evaluate(
      compiled.outputText,
      data.entrypoint,
      data.cases,
      data.params,
    );
    if (
      !Array.isArray(result.results) ||
      result.results.length !== data.cases.length
    ) {
      throw new Error("The runner returned an invalid result.");
    }
    self.postMessage({ type: "result", ...result });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: String(error?.message ?? error).slice(-2000),
    });
  }
};
