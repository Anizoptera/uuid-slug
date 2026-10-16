// Pre-commit gate. It exists to stop a commit that would fail static checks, and nothing more:
// tests, packing, Rust, benchmarks and the rest of `bun run check` run in CI and in the release
// lane (`preversion`). Every commit pays for this hook, so it runs only checks the staged files can
// affect and must stay within BUDGET_MS. Over budget, move the slow step out; do not raise the budget.

import { $ } from "bun";

const BUDGET_MS = 10_000;
const started = performance.now();

const staged = (await $`git diff --cached --name-only -z`.text()).split("\0").filter(Boolean);
// Markdown cannot change code, types or the API report, except that README examples are compiled
// against the build and CHANGELOG.md feeds the release-history API check.
const needsBuild = staged.some(
  (path) => !path.endsWith(".md") || path === "README.md" || path === "CHANGELOG.md",
);

// Whole-tree checks, not index-only: they read the working tree, which matches the index unless
// the commit is partially staged. They take well under a second each, so scoping them buys nothing.
const always = ["format:check", "claude-link:check", "strings:check"];
const afterBuild = needsBuild
  ? ["lint", "typecheck:built", "typecheck:bun", "api:check:built", "readme:check"]
  : [];

async function run(script: string): Promise<string | undefined> {
  const child = Bun.spawn(["bun", "run", script], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return code === 0 ? undefined : `--- bun run ${script} failed (exit ${code})\n${out}${err}`;
}

const build = needsBuild ? run("build") : Promise.resolve(undefined);
const failures = await Promise.all([
  ...always.map(run),
  build.then(async (failed) => (failed ? [failed] : Promise.all(afterBuild.map(run)))),
]);
const messages = failures.flat().filter((message) => message !== undefined);

const elapsed = Math.round(performance.now() - started);
if (elapsed > BUDGET_MS)
  console.error(
    `check-commit took ${elapsed} ms, over its ${BUDGET_MS} ms budget. Every commit pays this. ` +
      "Find the slow step (time each `bun run <script>` above) and move it to `bun run check`, " +
      "which CI and the release lane run; do not raise the budget.",
  );
if (messages.length) {
  console.error(messages.join("\n"));
  console.error("Commit blocked. Fix the failures above; `bun run check` runs the full suite.");
  process.exit(1);
}
