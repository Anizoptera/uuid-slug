import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["test/**/*.bun.test.ts"],
    include: ["test/**/*.test.ts"],
  },
});
