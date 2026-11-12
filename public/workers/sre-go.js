/* Go practice runs inside this worker. The runtime is the gzipped interpreter in sre-go.wasm.gz. */
importScripts("/workers/wasm_exec.js");

let boot;

function start() {
  if (!boot) {
    boot = (async () => {
      if (typeof DecompressionStream !== "function") {
        throw new Error(
          "This browser cannot load the Go runtime. Use a current browser, or practice in TypeScript or Python.",
        );
      }
      const response = await fetch("/workers/sre-go.wasm.gz");
      if (!response.ok) {
        throw new Error(
          "The Go runtime did not load. Check your connection and retry. Your draft is saved on this device.",
        );
      }
      const compressed = new Uint8Array(await response.arrayBuffer());
      const bytes =
        compressed[0] === 0x1f && compressed[1] === 0x8b
          ? new Uint8Array(
              await new Response(
                new Blob([compressed])
                  .stream()
                  .pipeThrough(new DecompressionStream("gzip")),
              ).arrayBuffer(),
            )
          : compressed;
      const go = new Go();
      const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
      go.run(instance);
      if (typeof self.sreRunGo !== "function") {
        throw new Error("The Go runtime did not start.");
      }
    })();
  }
  return boot;
}

self.onmessage = async (event) => {
  try {
    await start();
    self.postMessage({ type: "ready" });
    const payload = self.sreRunGo(
      event.data.source,
      event.data.entrypoint,
      JSON.stringify(event.data.params),
      JSON.stringify(event.data.cases),
    );
    const parsed = JSON.parse(String(payload));
    if (parsed.error) throw new Error(String(parsed.error));
    if (
      !Array.isArray(parsed.results) ||
      parsed.results.length !== event.data.cases.length
    ) {
      throw new Error("The runner returned an invalid result.");
    }
    self.postMessage({
      type: "result",
      results: parsed.results,
      output: String(parsed.output ?? ""),
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: String(error?.message ?? error).slice(-2000),
    });
  }
};
