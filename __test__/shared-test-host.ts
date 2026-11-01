// Rust has no JavaScript realms, proxies or host capability probes; keep their tests on that host.
import { test } from "vitest";
declare module "vitest" {
  interface TaskMeta {
    javascriptOnly?: boolean;
    rustTransport?: string;
  }
}
export const usingRust = process.env.UUID_SLUG_TEST_BACKEND === "rust";
const hostOptions = { skip: usingRust, meta: { javascriptOnly: true } };
export const javascriptOnly = Object.assign(
  (name: string, run: () => unknown) => test(name, hostOptions, run),
  {
    each:
      <Case>(cases: readonly Case[]) =>
      (name: string, run: (entry: Case) => void | Promise<void>) =>
        test.for(cases)(name, hostOptions, run),
  },
);

export function sharedTest(entry: {
  name: string;
  run: () => unknown;
  javascriptOnly?: string | undefined;
}) {
  test(
    entry.name +
      (usingRust && entry.javascriptOnly ? ` [JavaScript: ${entry.javascriptOnly}]` : ""),
    entry.javascriptOnly === undefined ? {} : hostOptions,
    entry.run,
  );
}
