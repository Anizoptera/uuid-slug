import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The headless-Chromium lane. Separate from `vitest.config.ts` rather than a project inside it,
 * because the two have opposite requirements: the default lane must run with nothing installed
 * beyond `bun install`, and this one needs a browser binary. One config that needed Chromium to
 * start would make `bun run check` — and therefore every commit — depend on a ~150 MB download.
 *
 * Playwright was already a devDependency with no consumer; it is the provider here. Vitest 4 takes
 * the provider as a FACTORY from `@vitest/browser-playwright`, not as the string name earlier
 * versions accepted — the string form fails at config resolution with a message naming the change.
 */
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
