import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";
const backend = process.env.UUID_SLUG_TEST_BACKEND ?? "typescript";
if (backend !== "typescript" && backend !== "rust")
  throw new Error(`Unknown test backend: ${backend}; use typescript or rust.`);

export default defineConfig({
  // Resolver selection changes the implementation while preserving the test bodies and oracles.
  resolve: {
    conditions: [runtime],
    alias:
      backend === "rust"
        ? {
            "./alphabet-backend": fileURLToPath(
              new URL("./__test__/alphabet-rust-backend.ts", import.meta.url),
            ),
          }
        : {},
  },
  ssr: { resolve: { conditions: [runtime] } },
  test: {
    fsModuleCache: true,
    setupFiles: ["./__test__/runtime-host.ts"],
    // Bun-specific files run under `bun test`; Node cannot resolve their `bun:test` imports.
    exclude: ["__test__/**/*.bun.test.ts"],
    include: backend === "rust" ? ["__test__/alphabet.test.ts"] : ["__test__/**/*.test.ts"],
  },
});
