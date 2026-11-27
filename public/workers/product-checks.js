const IMPORT_LINE = /^\s*import\s[^\n]*$/gm;
const EXPORT_DECL = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm;

function show(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const assert = {
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message ? message + ": " : ""}expected ${show(expected)}, got ${show(actual)}`);
    }
  },
  deepEqual(actual, expected, message) {
    if (show(actual) !== show(expected)) {
      throw new Error(`${message ? message + ": " : ""}expected ${show(expected)}, got ${show(actual)}`);
    }
  },
  ok(value, message) {
    if (!value) throw new Error(message || "expected a truthy value");
  },
  atMost(actual, limit, message) {
    if (!(actual <= limit)) {
      throw new Error(`${message ? message + ": " : ""}expected at most ${limit}, got ${show(actual)}`);
    }
  },
};

self.onmessage = ({ data }) => {
  const { source, exportNames, testSource, replay } = data;
  let mod;
  try {
    const body = source.replace(IMPORT_LINE, "").replace(EXPORT_DECL, "");
    mod = new Function(`"use strict";\n${body}\nreturn { ${exportNames.join(", ")} };`)();
    for (const name of exportNames) {
      if (typeof mod[name] !== "function") throw new Error(`${name} must be exported as a function.`);
    }
  } catch (error) {
    self.postMessage({ compileError: error && error.message ? error.message : String(error), results: [] });
    return;
  }
  const tests = [];
  const test = (title, fn) => tests.push({ title, fn });
  try {
    const body = testSource.replace(IMPORT_LINE, "");
    new Function("test", "assert", "mod", `"use strict";\nconst { ${exportNames.join(", ")} } = mod;\n${body}`)(test, assert, mod);
  } catch (error) {
    self.postMessage({ compileError: `Test file: ${error.message}`, results: [] });
    return;
  }
  const results = tests.map(({ title, fn }) => {
    try {
      fn();
      return { title, passed: true, detail: "" };
    } catch (error) {
      return { title, passed: false, detail: error && error.message ? error.message : String(error) };
    }
  });
  let replayResult;
  if (replay) {
    const outputs = [];
    const errors = [];
    for (const args of replay.inputs) {
      try {
        outputs.push(mod[replay.fn](...args));
      } catch (error) {
        outputs.push(null);
        errors.push(error && error.message ? error.message : String(error));
      }
    }
    replayResult = { outputs, errors };
  }
  self.postMessage({ results, replay: replayResult });
};
