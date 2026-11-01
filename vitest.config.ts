import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
// Native config loaders accept this data directly; discovery and execution share the same list.
import SHARED_TEST_SUITES from "./__test__/shared-test-suites.json" with { type: "json" };

const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
const backend = process.env.UUID_SLUG_TEST_BACKEND ?? "typescript";
const wasm = process.env.UUID_SLUG_WASM_BRIDGE;
if (backend !== "typescript" && backend !== "rust")
  throw new Error(`Unknown test backend: ${backend}; use typescript or rust.`);

export default defineConfig({
  // Resolver selection changes the implementation while preserving the test bodies and oracles.
  resolve: {
    conditions: [runtime],
    alias:
      backend === "rust"
        ? {
            "./test-implementation": fileURLToPath(
              new URL("./__test__/rust-test-implementation.ts", import.meta.url),
            ),
            ...(wasm
              ? {
                  "../scripts/rust-bridge": fileURLToPath(
                    new URL("./__test__/wasm-test-bridge.ts", import.meta.url),
                  ),
                }
              : {}),
          }
        : {},
  },
  ssr: { resolve: { conditions: [runtime] } },
  test: {
    fsModuleCache: true,
    setupFiles: ["./__test__/runtime-host.ts"],
    // Bun-specific files run under `bun test`; Node cannot resolve their `bun:test` imports.
    exclude: ["__test__/**/*.bun.test.ts"],
    include:
      backend === "rust"
        ? SHARED_TEST_SUITES.map((file) => `__test__/${file}`)
        : ["__test__/**/*.test.ts"],
  },
});
