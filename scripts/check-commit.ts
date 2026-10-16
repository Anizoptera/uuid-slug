// Pre-commit gate. It stops a commit that would fail a static check, and nothing more: tests,
// packing, Rust tests, benchmarks and the rest of `bun run check` run in CI and in the release
// lane (`preversion`). Every commit pays for this hook, so each check runs only when a staged
// path can change its result, and the whole hook must stay within BUDGET_MS. Over budget, move
// the slow step to `bun run check`; do not raise the budget.

import { $ } from "bun";

const BUDGET_MS = 10_000;
const started = performance.now();

const markdown = (path: string) => /\.(md|markdown|mdx)$/i.test(path);
const typescript = (path: string) => /\.[cm]?tsx?$/.test(path);
const typeInputs = (path: string) =>
  typescript(path) || path === "package.json" || path.startsWith("tsconfig");

// Each predicate answers "can this staged path change the check's result?". When unsure, return
// true: running costs seconds, while skipping a check that mattered lets the breakage reach CI.
const checks: { script: string; affects: (path: string) => boolean; build?: true }[] = [
  // oxfmt ignores Markdown by configuration (`.oxfmtrc.json`).
  { script: "format:check", affects: (path) => !markdown(path) },
  { script: "lint", affects: (path) => /\.[cm]?[jt]sx?$/.test(path) || path === "package.json" },
  // The project includes tests that read built declarations, so type checks follow the build.
  { script: "typecheck:built", affects: typeInputs, build: true },
  { script: "typecheck:bun", affects: typeInputs },
  {
    script: "strings:check",
    affects: (path) => path.startsWith("src/") || path === "scripts/check-string-owners.ts",
  },
  { script: "claude-link:check", affects: (path) => /(^|\/)(AGENTS|CLAUDE)\.md$/.test(path) },
  // README examples compile against the built package.
  {
    script: "readme:check",
    affects: (path) => path === "README.md" || path.startsWith("src/") || path.startsWith("docs/"),
    build: true,
  },
  // The API check also enforces the `-dev` version rule and reads CHANGELOG.md for release
  // history, so only docs, tests and benchmarks are known not to affect it.
  {
    script: "api:check:built",
    affects: (path) =>
      path === "CHANGELOG.md" ||
      !(markdown(path) || path.startsWith("__test__/") || path.startsWith("bench/")),
    build: true,
  },
];

const staged = (await $`git diff --cached --name-only -z`.text()).split("\0").filter(Boolean);
const selected = checks.filter((check) => staged.some(check.affects));

async function run(script: string): Promise<string | undefined> {
  const child = Bun.spawn(["bun", "run", script], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return code === 0 ? undefined : `--- bun run ${script} failed (exit ${code})\n${out}${err}`;
}

// Checks without a build start at once; the build runs beside them and gates only its dependants.
const build = selected.some((check) => check.build) ? run("build") : undefined;
const results = await Promise.all(
  selected.map(async (check) => {
    if (!check.build) return run(check.script);
    const failed = await build;
    return failed ? undefined : run(check.script);
  }),
);
const failures = [await build, ...results].filter((message) => message !== undefined);

const elapsed = Math.round(performance.now() - started);
const skipped = checks.filter((check) => !selected.includes(check)).map((check) => check.script);
console.error(
  `check-commit: ${selected.map((check) => check.script).join(", ") || "nothing to check"} in ${elapsed} ms` +
    (skipped.length ? ` (no staged path affects ${skipped.join(", ")})` : ""),
);
if (elapsed > BUDGET_MS)
  console.error(
    `check-commit exceeded its ${BUDGET_MS} ms budget; every commit pays this. Move the slow ` +
      "step to `bun run check` (CI and release run it); do not raise the budget.",
  );
if (failures.length) {
  console.error(failures.join("\n"));
  console.error("Commit blocked. Fix the failures above; `bun run check` runs the full suite.");
  process.exit(1);
}
