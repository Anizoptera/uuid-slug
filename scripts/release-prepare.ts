// Prepares a tagged release without publishing: reviewed archives, retained history and the
// release report with its consumer notes. The tag workflow and `bun run release` run this one
// sequence, so every release-only check judges the candidate before any tag leaves the machine;
// otherwise each defect costs a pushed tag and a full CI round.
// Expects a built tree (`bun run build`) and the annotated tag at HEAD. pnpm runs it as the
// `postversion` script right after `bun run release` creates that tag, so it takes no argument there.
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Glob } from "bun";
import type { ReleaseInputs } from "./release-inputs";
import { preflightRelease } from "./release-notes";
import { retainedReleaseSelection } from "./release-selection";

const manifest = (await Bun.file("package.json").json()) as { version: string };
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? `v${manifest.version}`;
const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_REF_NAME: tag, GITHUB_REF_TYPE: "tag" };
// Validate before removing anything; a bad tag cannot invalidate retained release evidence.
const checked = await preflightRelease(process.cwd(), tag);
const retained = Bun.file("release-artifacts/history/release-inputs.json");
if (await retained.exists()) {
  const inputs = (await retained.json()) as ReleaseInputs;
  if (inputs.version === checked.version && inputs.tag === tag) {
    env.UUID_SLUG_RELEASE_PACKAGES = retainedReleaseSelection(
      inputs.packages,
      env.UUID_SLUG_RELEASE_PACKAGES,
    );
    // Same-source retries reuse verified bytes; an authorized unpublished retag needs new ones.
    if (inputs.commit === checked.commit) {
      await step(
        "scripts/release-inputs.ts",
        tag,
        "release-artifacts/history",
        resolve(inputs.candidate.npm.file),
        resolve(inputs.candidate.crate.file),
      );
      await step("scripts/release-report.ts");
      process.exit(0);
    }
  }
}
// Stale archives from an earlier attempt would fail the single-archive checks below.
await Promise.all(
  ["release-artifacts", "rust/target/reviewed-crate"].map((path) =>
    rm(path, { recursive: true, force: true }),
  ),
);

async function step(...args: string[]): Promise<void> {
  const child = Bun.spawn(["bun", ...args], { env, stdout: "inherit", stderr: "inherit" });
  const status = await child.exited;
  if (status !== 0)
    throw new Error(
      `Release preparation stopped at: bun ${args.join(" ")}. Keep retained evidence and correct the reported failure before retrying. Tag repairs require explicit authorization: dev/release.md §Repair an unpushed or unpublished tag.`,
    );
}

async function single(pattern: string): Promise<string> {
  const found = await Array.fromAsync(new Glob(pattern).scan("."));
  if (found.length !== 1 || !found[0])
    throw new Error(`Expected exactly one ${pattern}, found ${found.length}.`);
  return found[0];
}

await step("scripts/release-package.ts", "prepare");
await step("scripts/release-crate.ts", "prepare");
const [npm, crate] = await Promise.all([
  single("release-artifacts/reviewed-npm/*.tgz"),
  single("rust/target/reviewed-crate/*.crate"),
]);
await step("scripts/release-inputs.ts", tag, "release-artifacts/history", npm, crate);
await step("scripts/release-report.ts");
