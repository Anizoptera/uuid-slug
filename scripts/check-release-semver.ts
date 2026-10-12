import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ApiDifference } from "./release-comparison";

async function runSemver(args: string[], cwd: string, target: string) {
  const child = Bun.spawn(["cargo", "semver-checks", ...args], {
    cwd,
    env: { ...process.env, CARGO_TARGET_DIR: target },
    signal: AbortSignal.timeout(30_000),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { output: `${stdout}${stderr}`.trim(), status };
}

async function rustSemverDifference(
  cwd: string,
  current: string,
  baseline: string,
  work: string,
): Promise<ApiDifference> {
  const failures: string[] = [];
  for (const feature of ["--all-features", "--only-explicit-features"] as const) {
    const result = await runSemver(
      [
        "--manifest-path",
        join(current, "Cargo.toml"),
        "--baseline-root",
        baseline,
        "--release-type",
        "minor",
        feature,
        "--color",
        "never",
      ],
      cwd,
      join(work, feature.slice(2)),
    );
    if (result.status === 100) failures.push(result.output);
    else if (result.status !== 0)
      throw new Error(`cargo-semver-checks failed (${result.status}): ${result.output}`);
  }
  return failures.length
    ? { report: failures.join("\n\n"), level: "major" }
    : { report: "No Rust semantic compatibility violations.", level: "patch" };
}

const root = resolve(import.meta.dir, "..");
const fixture = join(import.meta.dir, "fixtures/semver");
const work = await mkdtemp(join(tmpdir(), "uuid-slug-semver-check-"));

try {
  const changed = await rustSemverDifference(
    root,
    join(fixture, "current"),
    join(fixture, "baseline"),
    join(work, "changed"),
  );
  if (changed.level !== "major")
    throw new Error(
      "Required Rust fields, trait methods, and enum variants must require a major release.",
    );

  const unchanged = await rustSemverDifference(
    root,
    join(fixture, "baseline"),
    join(fixture, "baseline"),
    join(work, "unchanged"),
  );
  if (unchanged.level !== "patch")
    throw new Error("An unchanged Rust API must not require a breaking release.");
} finally {
  await rm(work, { recursive: true, force: true });
}
