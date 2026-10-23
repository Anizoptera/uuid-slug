// wasm-bindgen metadata is intermediate code; inspect and execute the processed consumer.
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Browser } from "playwright";
import { command } from "../scripts/command";
import { optimizeWasm } from "../scripts/wasm-opt";

export async function runLinkedWasm(
  rawWasm: string,
  directory: string,
  browsers: readonly { name: string; browser: Browser }[],
) {
  const rawModule = await WebAssembly.compile(await Bun.file(rawWasm).arrayBuffer());
  const needsBindings = WebAssembly.Module.imports(rawModule).some((entry) =>
    entry.module.startsWith("__wbindgen"),
  );
  let wasm = rawWasm;
  let javascriptBytes = 0;
  const files = new Map<string, Bun.BunFile>();
  if (needsBindings) {
    const bindgen = Bun.which("wasm-bindgen");
    if (!bindgen) throw new Error("Install wasm-bindgen-cli matching the crate's Cargo.lock.");
    await mkdir(directory, { recursive: true });
    await command(
      bindgen,
      [rawWasm, "--target", "web", "--out-dir", directory, "--out-name", "consumer"],
      process.cwd(),
    );
    wasm = join(directory, "consumer_bg.wasm");
    const javascript = join(directory, "consumer.js");
    javascriptBytes = (await stat(javascript)).size;
    files.set("/consumer.js", Bun.file(javascript));
    files.set("/consumer_bg.wasm", Bun.file(wasm));
  }
  await mkdir(directory, { recursive: true });
  const optimized = join(directory, "optimized.wasm");
  const { functionMap, ...optimization } = await optimizeWasm(wasm, optimized, "inspect-module");
  if (!functionMap?.trim()) throw new Error("Optimized WASM consumer has no function-map evidence");
  wasm = optimized;
  if (needsBindings) files.set("/consumer_bg.wasm", Bun.file(wasm));
  files.set("/consumer.wasm", Bun.file(wasm));
  const wasmBytes = Buffer.from(await Bun.file(wasm).arrayBuffer());
  const module = await WebAssembly.compile(wasmBytes);
  const start = needsBindings
    ? 'import init from "/consumer.js"; const load = init;'
    : 'const load = async () => (await WebAssembly.instantiateStreaming(fetch("/consumer.wasm"))).instance.exports;';
  const html = `<!doctype html><body><script type="module">${start}
try { const wasm = await load(); wasm.main(0, 0); document.body.dataset.result = "passed"; }
catch (error) { document.body.dataset.result = String(error); }
</script>`;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/") return new Response(html, { headers: { "content-type": "text/html" } });
      const file = files.get(path);
      return file ? new Response(file) : new Response("Not found", { status: 404 });
    },
  });
  try {
    for (const { name, browser } of browsers) {
      const page = await browser.newPage();
      try {
        await page.goto(server.url.href);
        await page.waitForFunction(() => document.body.dataset.result !== undefined);
        const result = await page.evaluate(() => document.body.dataset.result);
        if (result !== "passed") throw new Error(`${name}: linked WASM consumer failed: ${result}`);
      } finally {
        await page.close();
      }
    }
    return {
      wasm: (await stat(wasm)).size,
      javascript: javascriptBytes,
      optimization,
      wasmFunctions: functionMap.trim().split("\n"),
      // Absence is meaningful only when matching encoder controls retain these bytes.
      wasmAlphabetBytes: {
        base64url: wasmBytes.includes(
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
        ),
        base32hex: wasmBytes.includes("0123456789abcdefghijklmnopqrstuv"),
      },
      wasmSha256: new Bun.CryptoHasher("sha256").update(wasmBytes).digest("hex"),
      wasmExecuted: browsers.map(({ name }) => name),
      imports: WebAssembly.Module.imports(module),
    };
  } finally {
    await server.stop(true);
  }
}
