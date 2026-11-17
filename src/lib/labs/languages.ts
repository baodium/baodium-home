import type { CodingProblem } from "./coding";

export type PracticeLanguage = "python" | "typescript" | "go";

export const PRACTICE_LANGUAGES: {
  id: PracticeLanguage;
  label: string;
  filename: string;
  note: string;
}[] = [
  {
    id: "go",
    label: "Go",
    filename: "solution.go",
    note: "Go runs in the browser as package solution, with no imports. Numbers are float64. Progress stays with Go.",
  },
  {
    id: "typescript",
    label: "TypeScript",
    filename: "solution.ts",
    note: "TypeScript runs in the browser from jsDelivr. Progress stays with TypeScript.",
  },
  {
    id: "python",
    label: "Python",
    filename: "solution.py",
    note: "Python runs in the browser with Pyodide. It is the default when the address has no language. Progress stays with Python.",
  },
];

export type SignatureParam = {
  name: string;
  hasDefault: boolean;
  default?: unknown;
};

export function signatureParams(signature: string): SignatureParam[] {
  const open = signature.indexOf("(");
  const close = signature.lastIndexOf(")");
  const inside = signature.slice(open + 1, close).trim();
  if (!inside) return [];
  return inside.split(",").map((part) => {
    const splitAt = part.indexOf("=");
    const left = (splitAt === -1 ? part : part.slice(0, splitAt)).trim();
    const name = left.split(":")[0]?.trim() ?? left;
    if (splitAt === -1) return { name, hasDefault: false };
    return {
      name,
      hasDefault: true,
      default: parseDefault(part.slice(splitAt + 1).trim()),
    };
  });
}

function parseDefault(raw: string): unknown {
  if (raw === "True") return true;
  if (raw === "False") return false;
  if (raw === "None") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function camel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function exportedName(name: string): string {
  const value = camel(name);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function languageEntrypoint(
  entrypoint: string,
  language: PracticeLanguage,
): string {
  if (language === "python") return entrypoint;
  if (language === "typescript") return camel(entrypoint);
  return exportedName(entrypoint);
}

type ExampleCase = { example?: boolean; kwargs: Record<string, unknown>; expected: unknown };

function sampleValue(
  problem: Pick<CodingProblem, "signature" | "cases">,
  name: string,
): unknown {
  const cases = (problem.cases ?? []) as ExampleCase[];
  const sample = cases.find((item) => item.example) ?? cases[0];
  if (sample && name in sample.kwargs) return sample.kwargs[name];
  const param = signatureParams(problem.signature).find((item) => item.name === name);
  return param?.hasDefault ? param.default : undefined;
}

function sampleReturn(problem: Pick<CodingProblem, "signature" | "cases">): unknown {
  const cases = (problem.cases ?? []) as ExampleCase[];
  const sample = cases.find((item) => item.example) ?? cases[0];
  return sample?.expected;
}

function goType(value: unknown): string {
  if (typeof value === "number") return "float64";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "bool";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]any";
    const first = goType(value[0]);
    return value.every((item) => goType(item) === first) ? `[]${first}` : "[]any";
  }
  if (value && typeof value === "object") return "map[string]any";
  return "any";
}

function tsType(value: unknown): string {
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const first = tsType(value[0]);
    return value.every((item) => tsType(item) === first) ? `${first}[]` : "unknown[]";
  }
  if (value && typeof value === "object") return "Record<string, unknown>";
  return "unknown";
}

function annotatedGoReturn(signature: string): string | null {
  const raw = signature.match(/->\s*(.+)$/)?.[1]?.trim();
  if (raw === "list[str]") return "[]string";
  if (raw === "list[dict]") return "[]map[string]any";
  return null;
}

function annotatedTsReturn(signature: string): string | null {
  const raw = signature.match(/->\s*(.+)$/)?.[1]?.trim();
  if (raw === "list[str]") return "string[]";
  if (raw === "list[dict]") return "Record<string, unknown>[]";
  return null;
}

function goZero(type: string): string {
  if (type.startsWith("[]") || type.startsWith("map[")) return "nil";
  if (type === "string") return `""`;
  if (type === "bool") return "false";
  if (type === "float64") return "0";
  return "nil";
}

function tsZero(type: string): string {
  if (type.endsWith("[]")) return "[]";
  if (type.startsWith("Record<")) return "{}";
  if (type === "string") return `""`;
  if (type === "boolean") return "false";
  if (type === "number") return "0";
  return "null";
}

export function languageSignature(
  problem: Pick<CodingProblem, "signature" | "entrypoint" | "cases">,
  language: PracticeLanguage,
): string {
  if (language === "python") return problem.signature;
  const params = signatureParams(problem.signature);
  if (language === "typescript") {
    const args = params
      .map((param) => {
        const fallback = param.hasDefault ? ` = ${JSON.stringify(param.default)}` : "";
        return `${camel(param.name)}: ${tsType(sampleValue(problem, param.name))}${fallback}`;
      })
      .join(", ");
    const ret = annotatedTsReturn(problem.signature) ?? tsType(sampleReturn(problem));
    return `function ${camel(problem.entrypoint)}(${args}): ${ret}`;
  }
  const args = params
    .map((param) => `${camel(param.name)} ${goType(sampleValue(problem, param.name))}`)
    .join(", ");
  const ret = annotatedGoReturn(problem.signature) ?? goType(sampleReturn(problem));
  return `func ${exportedName(problem.entrypoint)}(${args}) ${ret}`;
}

export function starterFor(
  problem: Pick<CodingProblem, "signature" | "entrypoint" | "starter" | "cases">,
  language: PracticeLanguage,
): string {
  if (language === "python") return problem.starter;
  const params = signatureParams(problem.signature);
  if (language === "typescript") {
    const args = params
      .map((param) => {
        const fallback = param.hasDefault ? ` = ${JSON.stringify(param.default)}` : "";
        return `${camel(param.name)}: ${tsType(sampleValue(problem, param.name))}${fallback}`;
      })
      .join(", ");
    const ret = annotatedTsReturn(problem.signature) ?? tsType(sampleReturn(problem));
    return `function ${camel(problem.entrypoint)}(${args}): ${ret} {\n  return ${tsZero(ret)};\n}\n`;
  }
  const args = params
    .map((param) => `${camel(param.name)} ${goType(sampleValue(problem, param.name))}`)
    .join(", ");
  const ret = annotatedGoReturn(problem.signature) ?? goType(sampleReturn(problem));
  const notes = params
    .filter((param) => param.hasDefault)
    .map(
      (param) =>
        `// ${camel(param.name)} is ${JSON.stringify(param.default)} when a check omits it.`,
    );
  const comment = notes.length ? `${notes.join("\n")}\n` : "";
  return `package solution\n\n${comment}func ${exportedName(problem.entrypoint)}(${args}) ${ret} {\n\treturn ${goZero(ret)}\n}\n`;
}

export function runtimeNote(language: PracticeLanguage): string {
  if (language === "python") {
    return "Each run uses a fresh Python runtime in this browser, with a 3-second limit and a Stop button. The first run downloads the runtime.";
  }
  if (language === "typescript") {
    return "TypeScript is transpiled and executed in this browser, with a 3-second limit and a Stop button. Argument values match the JSON examples.";
  }
  return "Go runs in this browser as package solution. Keep helpers in this file, because imports are not available. Numbers arrive as float64, lists as slices, and objects as maps. The first run downloads about 3 MB, and each run stops after 3 seconds.";
}

export function languageLabel(language: PracticeLanguage): string {
  return (
    PRACTICE_LANGUAGES.find((item) => item.id === language)?.label ?? "Python"
  );
}
