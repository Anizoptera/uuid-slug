// Execute the same serialized Rust API inside the actual browser WebAssembly engine.
import initialize, { binaryUrl, evaluate } from "uuid-slug-test-wasm";
import { server } from "vitest/browser";

export async function loadRustBridge() {
  await initialize({ module_or_path: binaryUrl });
  return {
    transport: `${server.browser} WebAssembly`,
    evaluate(input: string): string {
      const result = evaluate(input);
      if (typeof result !== "string") throw new Error("Browser WASM returned a non-text result.");
      return result;
    },
    close() {}, // The isolated browser context owns the instance; the shared owner resets Rust state.
  };
}
