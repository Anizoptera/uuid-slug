// Resolve both tools through jco so core modules and components use its locked Binaryen.
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { command } from "./command";

const root = resolve(import.meta.dir, "..");
const jco = import.meta.resolve("@bytecodealliance/jco");
const wasmOpt = createRequire(jco).resolve("binaryen/bin/wasm-opt");
const jcoCli = join(dirname(fileURLToPath(jco)), "jco.js");
const flags = ["-O2"] as const;
let version: Promise<string> | undefined;

// Keep Cargo's input untouched; later cached builds must not reuse an optimized replacement.
export async function optimizeWasm(
  input: string,
  output: string,
  kind: "module" | "component" = "module",
) {
  const tool = (await (version ??= command(process.execPath, [wasmOpt, "--version"], root))).trim();
  await command(
    process.execPath,
    kind === "component"
      ? [jcoCli, "opt", input, "--output", output, "--quiet", "--", ...flags]
      : [wasmOpt, input, ...flags, "--output", output],
    root,
    undefined,
    { timeoutMs: 300_000 },
  );
  return { tool, flags };
}
