// The owning WASM runner supplies bindings only after optimizing their generated module.
import { createRequire } from "node:module";

export async function loadRustBridge() {
  const file = process.env.UUID_SLUG_WASM_BRIDGE;
  if (!file)
    throw new Error("Run bun scripts/rust-wasm.ts to build and optimize the WASM test bridge.");
  const module: unknown = createRequire(import.meta.url)(file);
  if (
    !module ||
    typeof module !== "object" ||
    !("evaluate" in module) ||
    typeof module.evaluate !== "function"
  )
    throw new Error("The optimized WASM bridge omitted evaluate.");
  const evaluate = module.evaluate;
  return {
    transport: `${process.versions.bun ? "Bun" : "Node"} WebAssembly`,
    evaluate(input: string): string {
      const result: unknown = evaluate(input);
      if (typeof result !== "string")
        throw new Error("The optimized WASM bridge returned a non-text result.");
      return result;
    },
    // This module owns no native library handle; the test worker owns its WebAssembly instance.
    close() {},
  };
}
