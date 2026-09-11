import { defineConfig } from "vitest/config";

const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";

export default defineConfig({
  resolve: { conditions: [runtime] },
  ssr: { resolve: { conditions: [runtime] } },
  test: {
    setupFiles: ["./test/runtime-host.ts"],
    // Bun-specific files run under `bun test`; Node cannot resolve their `bun:test` imports.
    exclude: ["test/**/*.bun.test.ts"],
    include: ["test/**/*.test.ts"],
  },
});
