const ident = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

function canonical(value) {
  return JSON.stringify(sortValue(value));
}

export function evaluate(js, entrypoint, cases, params) {
  if (!ident.test(entrypoint)) {
    throw new Error("The function name is not a valid identifier.");
  }
  if (js.length > 80000) {
    throw new Error("Keep the solution under 50,000 characters.");
  }
  let fn;
  try {
    fn = new Function(`${js}\nreturn ${entrypoint};`)();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message.slice(0, 700));
  }
  if (typeof fn !== "function") {
    throw new Error(
      "Define the requested function with the exact name in the signature.",
    );
  }
  const results = cases.map((item) => {
    const decoded = structuredClone(item.kwargs ?? {});
    const before = canonical(decoded);
    const args = params.map((param) => {
      if (Object.prototype.hasOwnProperty.call(decoded, param.name)) {
        return decoded[param.name];
      }
      if (param.hasDefault) return param.default;
      return undefined;
    });
    try {
      const actual = fn(...args);
      if (canonical(decoded) !== before) {
        return {
          id: item.id,
          title: item.title,
          passed: false,
          detail: "Input was modified.",
        };
      }
      const passed = canonical(actual) === canonical(item.expected);
      return {
        id: item.id,
        title: item.title,
        passed,
        detail: passed
          ? "Passed."
          : `Expected ${clip(JSON.stringify(item.expected))}; received ${clip(JSON.stringify(actual))}`,
      };
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      const message = error instanceof Error ? error.message : String(error);
      return {
        id: item.id,
        title: item.title,
        passed: false,
        detail: `${name}: ${message}`.slice(0, 700),
      };
    }
  });
  return { results, output: "" };
}

function clip(text) {
  return text.length > 350 ? text.slice(0, 350) : text;
}
