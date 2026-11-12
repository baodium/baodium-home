import type { CodingProblem } from "./coding";

export type PracticeLanguage = "python" | "typescript" | "go";

export const PRACTICE_LANGUAGES: {
  id: PracticeLanguage;
  label: string;
  filename: string;
}[] = [
  { id: "go", label: "Go", filename: "solution.go" },
  { id: "typescript", label: "TypeScript", filename: "solution.ts" },
  { id: "python", label: "Python", filename: "solution.py" },
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

export function languageSignature(
  problem: Pick<CodingProblem, "signature" | "entrypoint">,
  language: PracticeLanguage,
): string {
  if (language === "python") return problem.signature;
  const params = signatureParams(problem.signature);
  if (language === "typescript") {
    const args = params
      .map((param) => {
        const fallback = param.hasDefault
          ? ` = ${JSON.stringify(param.default)}`
          : "";
        return `${camel(param.name)}: any${fallback}`;
      })
      .join(", ");
    return `function ${camel(problem.entrypoint)}(${args}): any`;
  }
  const args = params.map((param) => `${camel(param.name)} any`).join(", ");
  return `func ${exportedName(problem.entrypoint)}(${args}) any`;
}

export function starterFor(
  problem: Pick<CodingProblem, "signature" | "entrypoint" | "starter">,
  language: PracticeLanguage,
): string {
  if (language === "python") return problem.starter;
  const params = signatureParams(problem.signature);
  if (language === "typescript") {
    const args = params
      .map((param) => {
        const fallback = param.hasDefault
          ? ` = ${JSON.stringify(param.default)}`
          : "";
        return `${camel(param.name)}: any${fallback}`;
      })
      .join(", ");
    return `function ${camel(problem.entrypoint)}(${args}): any {\n  return null;\n}\n`;
  }
  const args = params.map((param) => `${camel(param.name)} any`).join(", ");
  const notes = params
    .filter((param) => param.hasDefault)
    .map(
      (param) =>
        `// ${camel(param.name)} is ${JSON.stringify(param.default)} when a check omits it.`,
    );
  const comment = notes.length ? `${notes.join("\n")}\n` : "";
  return `package solution\n\n${comment}func ${exportedName(problem.entrypoint)}(${args}) any {\n\treturn nil\n}\n`;
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
