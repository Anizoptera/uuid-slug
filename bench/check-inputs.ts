// SPDX-License-Identifier: Apache-2.0

import { command } from "../scripts/command";

// Return the ref the working tree is timed against, or undefined when no watched input differs.
// The baseline is everything not yet published: UUID_SLUG_PERF_BASELINE when CI names the pushed
// range, otherwise the merge-base with the upstream branch. A parent-only baseline judged just the
// newest commit, so a slowdown in an earlier local commit was never measured once another commit
// followed it. A missing baseline fails instead of falling back to the parent for the same reason.
export async function performanceBaseline(
  root: string,
  scope: "production" | "regression" = "production",
): Promise<string | undefined> {
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
  // GitHub sends an all-zero `before` for a newly created ref (first tag or branch push); nothing
  // was published before it, so its parent is the only baseline that exists.
  let base = process.env.UUID_SLUG_PERF_BASELINE?.replace(/^0+$/, "HEAD^");
  let changed: string;
  try {
    base ||= (await command("git", ["merge-base", "HEAD", "@{upstream}"], root)).trim();
    // Working tree against base: uncommitted edits and every unpublished commit in one diff.
    changed = await command("git", ["diff", "--name-only", base, "--", ...inputs], root);
  } catch (cause) {
    throw new Error(
      `Cannot find the performance baseline${base ? ` ${base}` : ""}. Locally, set an upstream branch (git branch --set-upstream-to=origin/main). In CI, set UUID_SLUG_PERF_BASELINE to the last published commit and fetch it (actions/checkout fetch-depth: 0). Timing only the newest commit would let earlier unpublished commits skip the regression gate.`,
      { cause },
    );
  }
  return changed.trim() ? base : undefined;
}
