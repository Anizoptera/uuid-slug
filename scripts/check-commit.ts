// Pre-commit gate. It stops a commit that would fail a static check, and nothing more: tests,
// packing, Rust tests, benchmarks and the rest of `bun run check` run in CI and in the release
// lane (`preversion`). Every commit pays for this hook, so each check runs only when a staged
// path can change its result. Past WARN_MS it warns and past FAIL_MS it blocks the commit: move
// the slow step to `bun run check`; never raise the limits to fit it.

import { $ } from "bun";

const WARN_MS = 10_000;
const FAIL_MS = 20_000;
const started = performance.now();

// --no-renames reports a rename as delete plus add, so a moved file counts as deleted.
const status = (await $`git diff --cached --name-status --no-renames -z`.text()).split("\0");
const staged: string[] = [];
const deleted: string[] = [];
for (let index = 0; index + 1 < status.length; index += 2) {
  const path = status[index + 1] as string;
  staged.push(path);
  if (status[index] === "D") deleted.push(path);
}

const markdown = (path: string) => /\.(md|markdown|mdx)$/i.test(path);
const typescript = (path: string) => /\.[cm]?tsx?$/.test(path);
const typeInputs = (path: string) =>
  typescript(path) || path === "package.json" || path.startsWith("tsconfig");

// Each predicate answers "can this staged path change the check's result?". When unsure, return
// true: running costs seconds, while skipping a check that mattered lets the breakage reach CI.
const checks: {
  script: string;
  affects: (path: string) => boolean;
  build?: true;
  args?: string[];
}[] = [
  { script: "archives:check", affects: () => true },
  // oxfmt ignores Markdown by configuration (`.oxfmtrc.json`).
  { script: "format:check", affects: (path) => !markdown(path) },
  // Type-aware lint resolves the package's own name to dist/, so it must not race the build.
  {
    script: "lint",
    affects: (path) => /\.[cm]?[jt]sx?$/.test(path) || path === "package.json",
    build: true,
  },
  { script: "typecheck:built", affects: typeInputs },
  { script: "typecheck:bun", affects: typeInputs },
  {
    script: "strings:check",
    affects: (path) => path.startsWith("src/") || path === "scripts/check-string-owners.ts",
  },
  { script: "claude-link:check", affects: (path) => /(^|\/)(AGENTS|CLAUDE)\.md$/.test(path) },
  // README examples compile against the built package, and its links break when a target moves.
  {
    script: "readme:check",
    affects: (path) => path === "README.md" || path.startsWith("src/") || deleted.includes(path),
    build: true,
  },
  // The API check also enforces the `-dev` version rule from package.json and the Cargo
  // manifests, so only docs, tests and benchmarks are known not to affect it.
  {
    script: "api:check:built",
    affects: (path) =>
      !(markdown(path) || path.startsWith("__test__/") || path.startsWith("bench/")),
    build: true,
    // Rust sources, the toolchain file, the committed reports and the report scripts.
    args: staged.some((path) => /^(rust|api\/|scripts\/(.*\/)?(api|rust)[^/]*\.ts$)/.test(path))
      ? []
      : ["--committed-rust"],
  },
];

const selected = checks.filter((check) => staged.some(check.affects));

// A changed API report is the one consumer-visible change a script can see for certain; behaviour
// changes without one rely on the AGENTS.md rule. Documentation in api/ is not a report.
// Writing the entry now keeps its reason.
const missingChangelog =
  staged.some((path) => path === "api/typescript.api.d.ts" || path === "api/rust.api.md") &&
  !staged.includes("CHANGELOG.md")
    ? "The staged api/ report changes the public API, but CHANGELOG.md is not staged. Add a line under\n" +
      "## [Unreleased] saying what callers gain or must change and why, then stage it with this commit."
    : undefined;

async function run(script: string, args: string[] = []): Promise<string | undefined> {
  const child = Bun.spawn(["bun", "run", script, ...args], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return code === 0 ? undefined : `--- bun run ${script} failed (exit ${code})\n${out}${err}`;
}

// Checks without a build start at once; the build runs beside them and gates only its dependants.
// publint and attw judge the package's shape, not the staged change, and take a third of the
// build; `bun run check` keeps them. Output bytes are the same either way.
const build = selected.some((check) => check.build)
  ? run("build", ["--no-publint", "--no-attw"])
  : undefined;
const results = await Promise.all(
  selected.map(async (check) => {
    if (!check.build) return run(check.script, check.args);
    const failed = await build;
    return failed ? undefined : run(check.script, check.args);
  }),
);
const failures = [missingChangelog, await build, ...results].filter(
  (message) => message !== undefined,
);

const elapsed = Math.round(performance.now() - started);
const skipped = checks.filter((check) => !selected.includes(check)).map((check) => check.script);
console.error(
  `check-commit: ${selected.map((check) => check.script).join(", ") || "nothing to check"} in ${elapsed} ms` +
    (skipped.length ? ` (no staged path affects ${skipped.join(", ")})` : ""),
);
const slow =
  `check-commit took ${elapsed} ms (warn ${WARN_MS}, block ${FAIL_MS}); every commit pays this. ` +
  "Move the slow step to `bun run check` (CI and release run it); never raise the limits.";
if (elapsed > FAIL_MS) failures.push(slow);
else if (elapsed > WARN_MS) console.error(slow);
if (failures.length) {
  console.error(failures.join("\n"));
  console.error("Commit blocked. Fix the failures above; `bun run check` runs the full suite.");
  process.exit(1);
}
