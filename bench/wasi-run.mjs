// Run a WASI preview1 codec bench under Node's V8, the engine browsers use for WebAssembly.
// bench/rust.ts passes its UUID_SLUG_* settings through the process environment; WASI modules see
// only the environment given here, so forward exactly those.
import { readFile } from "node:fs/promises";
import { WASI } from "node:wasi";

const file = process.argv[2];
if (!file) throw new Error("Usage: node bench/wasi-run.mjs <codec.wasm>");
const wasi = new WASI({
  version: "preview1",
  args: ["codec", "--bench"],
  env: Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.startsWith("UUID_SLUG_")),
  ),
});
const module = await WebAssembly.compile(await readFile(file));
wasi.start(await WebAssembly.instantiate(module, wasi.getImportObject()));
