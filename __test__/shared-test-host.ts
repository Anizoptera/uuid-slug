// Rust has no JavaScript realms, proxies or host capability probes; keep their tests on that host.
import { it, test } from "vitest";
import type { TestAPI } from "vitest";
export const usingRust = process.env.UUID_SLUG_TEST_BACKEND === "rust";
export const javascriptOnly: ReturnType<TestAPI["skipIf"]> = it.skipIf(usingRust);

export function sharedTest(entry: {
  name: string;
  run: () => unknown;
  javascriptOnly?: string | undefined;
}) {
  test.skipIf(usingRust && entry.javascriptOnly !== undefined)(
    entry.name +
      (usingRust && entry.javascriptOnly ? ` [JavaScript: ${entry.javascriptOnly}]` : ""),
    entry.run,
  );
}
