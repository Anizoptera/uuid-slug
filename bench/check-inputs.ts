// SPDX-License-Identifier: Apache-2.0

import { command } from "../scripts/command";

// Compare pending production work with HEAD and committed work with its parent. A missing parent
// cannot mean unchanged production: CI must fetch the baseline instead of silently skipping it.
export async function performanceBaseline(
  root: string,
  scope: "production" | "regression" = "production",
): Promise<"HEAD" | "HEAD^" | undefined> {
  const inputs = ["src", "package.json", "bun.lock", "tsconfig.json", "tsdown.config.ts"];
  // Guard changes need a browser proof too, but must not trigger identical-package timing.
  // Include benchmark source dependencies without making evidence or prose select the job.
  if (scope === "regression")
    inputs.push(
      ":(glob)bench/**/*.ts",
      "__test__/benchmark.bun.test.ts",
      "__test__/resource-regression-probe.ts",
      "__test__/resource-regression-cases.ts",
      "scripts/check-browser-consumer.ts",
      "scripts/browser-engines.ts",
      "scripts/command.ts",
      ".github/workflows/check.yml",
    );
  const pending = await command("git", ["diff", "--name-only", "HEAD", "--", ...inputs], root);
  if (pending.trim()) return "HEAD";
  let committed: string;
  try {
    committed = await command(
      "git",
      ["diff", "--name-only", "HEAD^", "HEAD", "--", ...inputs],
      root,
    );
  } catch (cause) {
    throw new Error(
      "Cannot compare performance inputs with HEAD^. Fetch parent history (actions/checkout fetch-depth: 2) and rerun perf:check; missing history must not skip the regression gate.",
      { cause },
    );
  }
  return committed.trim() ? "HEAD^" : undefined;
}
