import { defineConfig } from "vitest/config";

const runtime = process.env.UUID_SLUG_TEST_RUNTIME ?? "node";

export default defineConfig({
  resolve: { conditions: [runtime] },
  ssr: { resolve: { conditions: [runtime] } },
  test: {
    setupFiles: ["./test/runtime-host.ts"],
    // Both run elsewhere: `*.bun.test.ts` under `bun test`, `*.browser.test.ts` under
    // `vitest.browser.config.ts`. Vitest would otherwise try them on Node, where the Bun files
    // cannot resolve `bun:test` and the browser file would silently assert nothing.
    exclude: ["test/**/*.bun.test.ts", "test/**/*.browser.test.ts"],
    include: ["test/**/*.test.ts"],
  },
});
