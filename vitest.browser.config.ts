import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Exercise Vite's browser resolution independently of the Bun-built artifact consumer.
// Keep Chromium optional so ordinary local checks require no browser download.
export default defineConfig({
  test: {
    include: ["test/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
